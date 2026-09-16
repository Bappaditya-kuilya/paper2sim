"""plan.md §12: tiny real PDF (2 found); non-PDF → 400; 25MB → 413; filename → 400."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import fitz  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import api  # noqa: E402

client = TestClient(api.app, raise_server_exceptions=False)


@pytest.fixture(autouse=True)
def _isolated_cache(tmp_path, monkeypatch):
    """File-backed 24h cache must never leak between tests/runs."""
    monkeypatch.setenv("CACHE_DB", str(tmp_path / "cache.db"))


MAX_PDF = 20 * 1024 * 1024


def _two_page_math_pdf() -> bytes:
    doc = fitz.open()
    for _ in range(2):
        page = doc.new_page()
        page.insert_text((72, 72), "E = mc^2 + x_1")
    return doc.tobytes()


def test_real_pdf_finds_two_equations():
    r = client.post("/api/extract/upload", files={"file": ("math.pdf", _two_page_math_pdf(), "application/pdf")})
    assert r.status_code == 200, r.text
    eqs = r.json()["equations"]
    assert len(eqs) == 2
    assert all(set(e) >= {"latex", "type"} for e in eqs)


def test_non_pdf_extension_rejected():
    r = client.post("/api/extract/upload", files={"file": ("notes.txt", b"just text", "text/plain")})
    assert r.status_code == 400
    assert r.headers["content-type"].startswith("application/json")


def test_pdf_name_with_non_pdf_bytes_rejected():
    r = client.post("/api/extract/upload", files={"file": ("fake.pdf", b"not a pdf at all", "application/pdf")})
    assert r.status_code == 400
    assert r.json() == {"detail": "not a PDF file"}


def test_oversize_pdf_rejected_413():
    big = b"%PDF" + b"\x00" * (MAX_PDF + 1 - 4)
    r = client.post("/api/extract/upload", files={"file": ("big.pdf", big, "application/pdf")})
    assert r.status_code == 413
    assert r.headers["content-type"].startswith("application/json")


def test_missing_filename_rejected_400():
    boundary = "----BOUND"
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename=""\r\nContent-Type: application/pdf\r\n\r\n%PDF-1.4 fake\r\n--{boundary}--\r\n').encode()
    r = client.post("/api/extract/upload", content=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    assert r.status_code == 400
    assert r.headers["content-type"].startswith("application/json")
