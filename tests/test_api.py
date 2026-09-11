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
