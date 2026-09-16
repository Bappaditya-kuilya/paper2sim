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
