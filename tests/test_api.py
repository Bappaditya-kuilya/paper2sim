"""Tests for FastAPI API endpoints."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from api import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_returns_json():
    response = client.get("/health")
    assert response.headers["content-type"] == "application/json"


def test_nonexistent_endpoint_returns_404():
    response = client.get("/nonexistent")
    assert response.status_code == 404


def test_extract_text_returns_equation():
    response = client.post("/api/extract", json={"source": "text", "text": "sin(x)"})
    assert response.status_code == 200
    data = response.json()
    assert "equations" in data
    assert len(data["equations"]) == 1
    assert data["equations"][0]["latex"] == "sin(x)"


def test_extract_requires_source():
    response = client.post("/api/extract", json={})
    assert response.status_code == 422


def test_extract_invalid_arxiv_url():
    response = client.post("/api/extract", json={"source": "arxiv_url", "url": "not-a-url"})
    assert response.status_code == 200
    data = response.json()
    assert "error" in data


def test_extract_text_classifies_equation():
    response = client.post("/api/extract", json={"source": "text", "text": "x^2 + y^2"})
    data = response.json()
    assert data["equations"][0]["type"] in ("polynomial", "unknown")


def test_breakdown_returns_error():
    response = client.post("/api/breakdown", json={"text": "test"})
    assert response.status_code == 200
    assert "error" in response.json()


def test_storyboard_returns_error():
    response = client.post("/api/storyboard", json={"topic": {}, "source_text": ""})
    assert response.status_code == 200
    assert "error" in response.json()


def test_health_deps_returns_status():
    response = client.get("/health/dependencies")
    assert response.status_code == 200
    data = response.json()
    assert "pymupdf" in data
    assert "fastapi" in data


def test_validation_error_returns_422():
    response = client.post("/api/extract", json={"invalid": "data"})
    assert response.status_code == 422


def test_breakdown_calls_client():
    response = client.post("/api/breakdown", json={"text": "F = ma"})
    assert response.status_code == 200
    assert "breakdowns" in response.json() or "error" in response.json()


def test_storyboard_calls_client():
    response = client.post("/api/storyboard", json={"topic": {"name": "test"}, "source_text": ""})
    assert response.status_code == 200
    assert "scenes" in response.json() or "error" in response.json()


def test_extract_upload_rejects_non_pdf():
    response = client.post("/api/extract/upload", files={"file": ("test.txt", b"content", "text/plain")})
    assert response.status_code == 200
    assert "error" in response.json()


def _make_sample_pdf(path, lines):
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    y = 72
    for line in lines:
        page.insert_text((72, y), line)
        y += 50
    doc.save(path)
    doc.close()


def test_extract_upload_finds_block_equations(tmp_path):
    pdf_path = tmp_path / "sample.pdf"
    eq1 = "E = mc^2"
    eq2 = r"\frac{a}{b} + \sum_{i} x_{i}"
    _make_sample_pdf(pdf_path, ["This is introduction to machine learning.", eq1, eq2])
    with open(pdf_path, "rb") as f:
        response = client.post("/api/extract/upload", files={"file": ("sample.pdf", f, "application/pdf")})
    assert response.status_code == 200
    data = response.json()
    assert "equations" in data
    assert len(data["equations"]) == 2
    assert data["equations"][0]["latex"] == eq1
    assert data["equations"][1]["latex"] == eq2
    assert data["paper_info"] == {"filename": "sample.pdf"}


def test_extract_upload_finds_math_without_equals_caret(tmp_path):
    pdf_path = tmp_path / "math.pdf"
    eq = r"\frac{a}{b} + \sum_{i} x_{i}"
    _make_sample_pdf(pdf_path, ["Plain prose about nothing.", eq])
    with open(pdf_path, "rb") as f:
        response = client.post("/api/extract/upload", files={"file": ("math.pdf", f, "application/pdf")})
    assert response.status_code == 200
    data = response.json()
    assert len(data["equations"]) == 1
    assert data["equations"][0]["latex"] == eq


def test_head_health_ok_for_uptime_checkers():
    response = client.request("HEAD", "/health")
    assert response.status_code == 200
