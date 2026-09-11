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


def test_render_returns_job_id():
    response = client.post("/api/render", json={"template": "sin", "equation": "sin(x)"})
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "queued"


def test_render_requires_template():
    response = client.post("/api/render", json={"equation": "sin(x)"})
    assert response.status_code == 422


def test_render_status_returns_job():
    create = client.post("/api/render", json={"template": "sin", "equation": "sin(x)"})
    job_id = create.json()["job_id"]
    response = client.get(f"/api/render/{job_id}/status")
    assert response.status_code == 200
    data = response.json()
    assert data["job_id"] == job_id
    assert data["status"] == "queued"


def test_render_status_not_found():
    response = client.get("/api/render/nonexistent/status")
    assert response.status_code == 200
    assert "error" in response.json()


def test_render_video_not_ready():
    create = client.post("/api/render", json={"template": "sin", "equation": "sin(x)"})
    job_id = create.json()["job_id"]
    response = client.get(f"/api/render/{job_id}/video")
    assert response.status_code == 200
    assert "error" in response.json()


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


def test_render_stream_returns_event_stream():
    create = client.post("/api/render", json={"template": "sin", "equation": "sin(x)"})
    job_id = create.json()["job_id"]
    response = client.get(f"/api/render/{job_id}/stream")
    assert response.status_code == 200
