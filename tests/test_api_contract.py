"""plan.md §12: health 200; bad-tex → 200 {equations: []}; bad arXiv → 400; JSON errors only."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import api  # noqa: E402

client = TestClient(api.app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _isolated_cache(tmp_path, monkeypatch):
    """File-backed 24h cache must never leak between tests/runs."""
    monkeypatch.setenv("CACHE_DB", str(tmp_path / "cache.db"))


def test_health_get_and_head():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}
    assert client.head("/health").status_code == 200


def test_bad_tex_returns_empty_200():
    r = client.post("/api/extract", json={"source": "text", "value": "hello world plain prose nothing symbolic"})
    assert r.status_code == 200
    assert r.json() == {"equations": []}


def test_good_tex_returns_shaped_equations():
    r = client.post("/api/extract", json={"source": "text", "value": "Einstein: E = mc^2 + x"})
    assert r.status_code == 200
    eqs = r.json()["equations"]
    assert eqs and all(set(e) >= {"latex", "type"} for e in eqs)


def test_bad_arxiv_id_extract_400_json():
    r = client.post("/api/extract", json={"source": "arxiv_url", "value": "not-a-valid-id"})
    assert r.status_code == 400
    assert r.headers["content-type"].startswith("application/json")
    assert "detail" in r.json()


def test_bad_arxiv_id_lookup_400_json():
    r = client.get("/api/arxiv", params={"url": "bogus"})
    assert r.status_code == 400
    assert r.headers["content-type"].startswith("application/json")
    assert "detail" in r.json()


def test_cache_roundtrip(tmp_path, monkeypatch):
    monkeypatch.setenv("CACHE_DB", str(tmp_path / "cache.db"))
    from eqextract import cache as cache_mod

    assert cache_mod.cache_get("k1", 60) is None
    cache_mod.cache_set("k1", '{"equations": []}')
    assert cache_mod.cache_get("k1", 60) == '{"equations": []}'


def test_cache_expiry(tmp_path, monkeypatch):
    monkeypatch.setenv("CACHE_DB", str(tmp_path / "cache.db"))
    from eqextract import cache as cache_mod

    cache_mod.cache_set("k2", "v")
    assert cache_mod.cache_get("k2", 0) is None


def test_arxiv_second_call_served_from_cache(monkeypatch, tmp_path):
    monkeypatch.setenv("CACHE_DB", str(tmp_path / "cache.db"))
    import eqextract

    arxiv_id = "2301.12345"

    def good(arxiv_id_, dest):
        p = os.path.join(dest, "source.tex")
        with open(p, "w") as f:
            f.write("\\begin{equation} E = mc^2 \\end{equation}")
        return p

    monkeypatch.setattr(eqextract, "download_source", good)
    monkeypatch.setattr(eqextract, "get_paper_info", lambda i: {"title": "T", "authors": [], "abstract": ""})
    r1 = client.post("/api/extract", json={"source": "arxiv_url", "value": f"https://arxiv.org/abs/{arxiv_id}"})
    assert r1.status_code == 200

    def boom(arxiv_id_, dest):
        raise AssertionError("fetch must not run on cache hit")

    monkeypatch.setattr(eqextract, "download_source", boom)
    monkeypatch.setattr(eqextract, "get_paper_info", boom)
    r2 = client.post("/api/extract", json={"source": "arxiv_url", "value": f"https://arxiv.org/abs/{arxiv_id}"})
    assert r2.status_code == 200
    assert r2.json() == r1.json()
    from eqextract import cache as cache_mod

    assert cache_mod.cache_get(f"arxiv:{arxiv_id}", 86400) is not None


def test_lone_surrogate_returns_200_json():
    # ponytail: \ud800 broke sha256/response encode → 500 text/plain; must be 200 JSON
    raw = b'{"source":"text","value":"E = mc^2 \\ud800 test x+1=2"}'
    r = client.post("/api/extract", content=raw, headers={"Content-Type": "application/json"})
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/json")
    assert "equations" in r.json()


def test_tex_concat_multi_file_largest_first(monkeypatch):
    """F1: tex sources concatenate multi-file, largest-first (no network)."""
    import eqextract

    captured = {}
    big = "\\begin{equation} BIGEQ = 1 \\end{equation}\n" + "% pad\n" * 200
    small = "\\begin{equation} smalleq = 2 \\end{equation}"

    def fake_download(arxiv_id_, dest):
        with open(os.path.join(dest, "a_small.tex"), "w") as f:
            f.write(small)
        with open(os.path.join(dest, "b_big.tex"), "w") as f:
            f.write(big)

    def fake_extract(content):
        captured["content"] = content
        return [{"latex": "BIGEQ = 1", "type": "equation"}, {"latex": "smalleq = 2", "type": "equation"}]

    monkeypatch.setattr(eqextract, "download_source", fake_download)
    monkeypatch.setattr(eqextract, "extract_equations_from_tex", fake_extract)
    monkeypatch.setattr(eqextract, "get_paper_info", lambda i: {"title": "T", "authors": [], "abstract": ""})
    r = client.post("/api/extract", json={"source": "arxiv_url", "value": "https://arxiv.org/abs/2309.00011"})
    assert r.status_code == 200
    assert len(r.json()["equations"]) == 2
    content = captured["content"]
    assert "BIGEQ = 1" in content and "smalleq = 2" in content
    assert content.index("BIGEQ = 1") < content.index("smalleq = 2")


def test_tex_path_returns_title():
    """F1: _fetch_arxiv returns paper info (not {}) on tex path; info failure never gates equations."""
    from types import SimpleNamespace

    def fake_download(arxiv_id_, dest):
        with open(os.path.join(dest, "source.tex"), "w") as f:
            f.write("\\begin{equation} E = mc^2 \\end{equation}")

    def make_mod(info_fn):
        return SimpleNamespace(
            download_source=fake_download,
            extract_equations_from_tex=lambda content: [{"latex": "E = mc^2", "type": "equation"}],
            extract_equations_from_text=lambda text: [],
            classify_equation=lambda s: "equation",
            get_paper_info=info_fn,
        )

    eqs, info, warning = api._fetch_arxiv("2309.00012", make_mod(lambda i: {"title": "Tex Title", "authors": [], "abstract": ""}))
    assert len(eqs) == 1
    assert info.get("title") == "Tex Title"
    assert warning is None

    def boom(i):
        raise RuntimeError("info down")

    eqs, info, _ = api._fetch_arxiv("2309.00012", make_mod(boom))
    assert len(eqs) == 1
    assert info == {}


def test_over_200_sliced_with_counts_warning(monkeypatch):
    """F3: >200 equations sliced to 200 with counts warning."""
    import eqextract

    def fake_download(arxiv_id_, dest):
        with open(os.path.join(dest, "source.tex"), "w") as f:
            f.write("\\begin{equation} x = 1 \\end{equation}")

    monkeypatch.setattr(eqextract, "download_source", fake_download)
    monkeypatch.setattr(eqextract, "extract_equations_from_tex", lambda content: [{"latex": f"x_{i} = 1", "type": "equation"} for i in range(250)])
    monkeypatch.setattr(eqextract, "get_paper_info", lambda i: {"title": "T", "authors": [], "abstract": ""})
    r = client.post("/api/extract", json={"source": "arxiv_url", "value": "https://arxiv.org/abs/2309.00013"})
    assert r.status_code == 200
    body = r.json()
    assert len(body["equations"]) == 200
    assert body["warning"] == "Showing first 200 of 250 — refine input to narrow."


def test_null_elements_sanitized(monkeypatch):
    """F2: null / non-dict extractor items never reach the response."""
    import eqextract

    def fake_download(arxiv_id_, dest):
        with open(os.path.join(dest, "source.tex"), "w") as f:
            f.write("\\begin{equation} x = 1 \\end{equation}")

    monkeypatch.setattr(eqextract, "download_source", fake_download)
    monkeypatch.setattr(
        eqextract,
        "extract_equations_from_tex",
        lambda content: [None, {"latex": "E = mc^2", "type": "equation"}, 123, {"latex": "a + b", "type": "equation"}, ["x"]],
    )
    monkeypatch.setattr(eqextract, "get_paper_info", lambda i: {"title": "T", "authors": [], "abstract": ""})
    r = client.post("/api/extract", json={"source": "arxiv_url", "value": "https://arxiv.org/abs/2309.00014"})
    assert r.status_code == 200
    eqs = r.json()["equations"]
    assert len(eqs) == 2
    assert all(isinstance(e, dict) and isinstance(e.get("latex"), str) and e["latex"].strip() for e in eqs)


def test_abstract_fallback_filters_prose_and_warns(monkeypatch):
    """Abstract-only path drops prose; warning matches contract regex."""
    import re

    import eqextract

    monkeypatch.setattr(eqextract, "download_source", lambda arxiv_id_, dest: None)
    summary = "We show x improves over baselines\nThe role of the wandering null geodesic is studied in a black hole\nplain prose line here\nalpha and beta are parameters\nE = mc^2 + x\n"
    monkeypatch.setattr(eqextract, "get_paper_info", lambda i: {"title": "T", "authors": [], "summary": summary})
    r = client.post("/api/extract", json={"source": "arxiv_url", "value": "https://arxiv.org/abs/2309.99990"})
    assert r.status_code == 200
    body = r.json()
    eqs = body["equations"]
    assert any("E = mc^2 + x" in e["latex"] for e in eqs)
    assert not any("plain prose" in e["latex"] for e in eqs)
    assert not any("improves over baselines" in e["latex"] for e in eqs)
    assert not any("wandering null geodesic" in e["latex"] for e in eqs)
    assert not any("alpha and beta are parameters" in e["latex"] for e in eqs)
    assert re.match(r"^\d+ equations from abstract only", body.get("warning", ""))


def test_ladder_tex_beats_pdf_beats_abstract():
    """B1 ladder order: tex > pdf-text > abstract (no network)."""
    from types import SimpleNamespace

    def fake_download_tex(arxiv_id_, dest):
        with open(os.path.join(dest, "source.tex"), "w") as f:
            f.write("\\begin{equation} TEXEQ = 1 \\end{equation}")

    def make_mod(download_fn, pdf_text):
        return SimpleNamespace(
            download_source=download_fn,
            extract_equations_from_tex=lambda content: [{"latex": "TEXEQ = 1", "type": "equation"}],
            extract_equations_from_text=lambda text: [{"latex": "PDFEQ = 2", "type": "equation"}],
            classify_equation=lambda s: "equation",
            get_paper_info=lambda i: {"title": "T", "authors": [], "abstract": "ABS = 3"},
            fetch_pdf_text=lambda i: pdf_text,
        )

    # tex present → pdf-text never used
    eqs, _, warning = api._fetch_arxiv("2309.01001", make_mod(fake_download_tex, "PDFEQ = 2"))
    assert any("TEXEQ" in e["latex"] for e in eqs)
    assert not any("PDFEQ" in e["latex"] for e in eqs)
    assert warning is None

    # no tex + pdf-text present → abstract never used
    eqs, _, warning = api._fetch_arxiv("2309.01001", make_mod(lambda a, d: None, "PDFEQ = 2"))
    assert any("PDFEQ" in e["latex"] for e in eqs)
    assert not any("ABS" in e["latex"] for e in eqs)
    assert warning is None


def test_ladder_pdf_text_truncated_200_warning():
    """pdf-text >200 sliced with Showing-first warning family."""
    from types import SimpleNamespace

    def nodl(a, d):
        return None

    mod = SimpleNamespace(
        download_source=nodl,
        extract_equations_from_tex=lambda c: [],
        extract_equations_from_text=lambda t: [{"latex": f"p_{i} = 1", "type": "equation"} for i in range(250)],
        classify_equation=lambda s: "equation",
        get_paper_info=lambda i: {"title": "T", "authors": [], "abstract": ""},
        fetch_pdf_text=lambda i: "p_0 = 1\n",
    )
    eqs, _, warning = api._fetch_arxiv("2309.01002", mod)
    assert len(eqs) == 200
    assert warning == "Showing first 200 of 250 — refine input to narrow."


def test_ladder_scanned_pdf_warning_exact():
    """Zero-text PDF → exact scanned string."""
    from types import SimpleNamespace

    mod = SimpleNamespace(
        download_source=lambda a, d: None,
        extract_equations_from_tex=lambda c: [],
        extract_equations_from_text=lambda t: (_ for _ in ()).throw(AssertionError("must not run on scanned")),
        classify_equation=lambda s: "equation",
        get_paper_info=lambda i: {"title": "T", "authors": [], "abstract": ""},
        fetch_pdf_text=lambda i: "   \n  ",
    )
    eqs, _, warning = api._fetch_arxiv("2309.01003", mod)
    assert eqs == []
    assert warning == "Scanned PDF — no text layer. Try the TeX source."


def test_ladder_pdf_failure_falls_back_to_abstract_verbatim():
    """PDF fetch fail → existing abstract path verbatim (filter + warning)."""
    import re

    import api as api_mod
    import eqextract

    orig = getattr(eqextract, "fetch_pdf_text", None)
    eqextract.fetch_pdf_text = lambda i: None  # type: ignore[attr-defined]
    try:
        # direct _fetch_arxiv with real extract + gate
        class Mod:
            def download_source(self, a, d):
                return None

            def get_paper_info(self, i):
                return {"title": "T", "authors": [], "summary": "plain prose line here\nE = mc^2 + x\n"}

            def extract_equations_from_tex(self, c):
                return []

            def extract_equations_from_text(self, t):
                return eqextract.extract_equations_from_text(t)

            def classify_equation(self, s):
                return eqextract.classify_equation(s)

            @property
            def equations(self):
                return eqextract.equations

            def fetch_pdf_text(self, i):
                return None

        eqs, _, warning = api_mod._fetch_arxiv("2309.01004", Mod())
        assert any("E = mc^2 + x" in e["latex"] for e in eqs)
        assert re.match(r"^\d+ equations from abstract only", warning or "")
    finally:
        if orig is None:
            try:
                delattr(eqextract, "fetch_pdf_text")
            except AttributeError:
                pass
        else:
            eqextract.fetch_pdf_text = orig  # type: ignore[attr-defined]


def test_prefilter_unicode_blocks_accepted():
    """B1: floor/ceil/minus/capitals pass the text gate."""
    import eqextract

    for line in ["⌊x⌋ + 1 = 2\n", "⌈y⌉ = 3\n", "a − b = c\n", "Α + Β = Γ\n"]:
        eqs = eqextract.extract_equations_from_text(line)
        assert any(line.strip() in e["latex"] for e in eqs), line
