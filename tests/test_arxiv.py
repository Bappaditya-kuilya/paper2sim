"""plan.md §12: URL forms; mocked 200/empty/timeout; no-failure-caching. No network."""

import io
import os
import sys
import tarfile
import urllib.error
import urllib.request

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import api  # noqa: E402
import eqextract  # noqa: E402 — same top-level identity api.py loads
import eqextract.arxiv as arxiv_mod  # noqa: E402


@pytest.fixture(autouse=True)
def _isolated_cache(tmp_path, monkeypatch):
    """File-backed 24h cache must never leak between tests/runs."""
    monkeypatch.setenv("CACHE_DB", str(tmp_path / "cache.db"))


ATOM_OK = b"""<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom"><entry>
<title>Some Title</title><summary>An abstract with E = mc^2 + x.</summary>
<author><name>Jane Doe</name></author>
</entry></feed>"""

ATOM_EMPTY = b'<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>'


def test_url_forms():
    assert arxiv_mod.parse_arxiv_url("https://arxiv.org/abs/2301.12345") == "2301.12345"
    assert arxiv_mod.parse_arxiv_url("https://arxiv.org/pdf/2301.12345") == "2301.12345"
    assert arxiv_mod.parse_arxiv_url("https://arxiv.org/pdf/2301.12345v2") == "2301.12345"  # version stripped
    assert arxiv_mod.parse_arxiv_url("2301.12345") == "2301.12345"
    assert arxiv_mod.parse_arxiv_url("https://example.com/foo") is None
    assert arxiv_mod.parse_arxiv_url("not-an-id") is None


def test_timeout_is_15s(monkeypatch):
    seen = {}

    class FakeResp:
        headers = {}

        def read(self, n=-1):
            return b""

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    def fake_urlopen(req, timeout=None):
        seen["timeout"] = timeout
        seen["url"] = req.full_url
        return FakeResp()

    monkeypatch.setattr(urllib.request, "urlopen", fake_urlopen)
    arxiv_mod._read_url("https://export.arxiv.org/api/query?id_list=2301.12345")
    assert seen["timeout"] == 15
    assert arxiv_mod.TIMEOUT == 15


def test_over_5mb_raises_too_large(monkeypatch):
    class BigResp:
        headers = {}

        def read(self, n=-1):
            return b"y" * 65536  # infinite stream forces the cap

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    monkeypatch.setattr(urllib.request, "urlopen", lambda req, timeout=None: BigResp())
    try:
        arxiv_mod._read_url("https://arxiv.org/e-print/2301.12345")
        assert False, "expected ValueError"
    except ValueError as e:
        assert str(e) == "too_large"


def test_get_paper_info_mocked_200(monkeypatch):
    monkeypatch.setattr(arxiv_mod, "_read_url", lambda url: (ATOM_OK, "application/atom+xml"))
    info = arxiv_mod.get_paper_info("2301.12345")
    assert info["title"] == "Some Title"
    assert info["authors"] == ["Jane Doe"]
    assert "abstract" in info


def test_get_paper_info_empty_and_timeout(monkeypatch):
    monkeypatch.setattr(arxiv_mod, "_read_url", lambda url: (ATOM_EMPTY, "application/atom+xml"))
    assert arxiv_mod.get_paper_info("2301.12345") is None

    def boom(url):
        raise urllib.error.URLError("timed out")

    monkeypatch.setattr(arxiv_mod, "_read_url", boom)
    assert arxiv_mod.get_paper_info("2301.12345") is None
    assert arxiv_mod.download_source("2301.12345", "/tmp/paper2sim-nope") is None


def test_download_source_plain_tex_and_tar(monkeypatch, tmp_path):
    tex = b"\\begin{equation} E = mc^2 \\end{equation}"
    monkeypatch.setattr(arxiv_mod, "_read_url", lambda url: (tex, "text/plain"))
    out = arxiv_mod.download_source("2301.12345", str(tmp_path / "a"))
    assert out is not None and out.exists()

    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        data = b"\\[ x + 1 \\]"
        ti = tarfile.TarInfo("main.tex")
        ti.size = len(data)
        tar.addfile(ti, io.BytesIO(data))
    monkeypatch.setattr(arxiv_mod, "_read_url", lambda url: (buf.getvalue(), "application/gzip"))
    out = arxiv_mod.download_source("2301.12345", str(tmp_path / "b"))
    assert out is not None and out.name == "main.tex"


def test_failures_never_cached(monkeypatch):
    client = TestClient(api.app, raise_server_exceptions=False)
    arxiv_id = "2301.99999"

    def boom(arxiv_id_, dest):
        raise urllib.error.URLError("down")

    monkeypatch.setattr(eqextract, "download_source", boom)
    r = client.get("/api/arxiv", params={"url": f"https://arxiv.org/abs/{arxiv_id}"})
    assert r.status_code == 502
    assert f"arxiv:{arxiv_id}" not in api._cache  # failure left no cache entry

    def good(arxiv_id_, dest):
        p = os.path.join(dest, "source.tex")
        with open(p, "w") as f:
            f.write("\\begin{equation} E = mc^2 \\end{equation}")
        return p

    monkeypatch.setattr(eqextract, "download_source", good)
    monkeypatch.setattr(eqextract, "get_paper_info", lambda i: {"title": "T", "authors": [], "abstract": ""})
    r = client.get("/api/arxiv", params={"url": f"https://arxiv.org/abs/{arxiv_id}"})
    assert r.status_code == 200, r.text
    assert r.json()["equations"], "retry after failure must succeed (nothing stale cached)"
