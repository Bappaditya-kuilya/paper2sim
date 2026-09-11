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
