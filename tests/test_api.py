"""Tests for FastAPI API endpoints."""

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


def test_extract_returns_not_implemented():
    response = client.post("/api/extract", json={"source": "text", "text": "sin(x)"})
    assert response.status_code == 200
    assert response.json() == {"message": "not implemented"}


def test_extract_requires_source():
    response = client.post("/api/extract", json={})
    assert response.status_code == 422
