"""Tests for error response models."""

from paper2sim.error_models import ErrorResponse, SuccessResponse


def test_error_response_has_fields():
    resp = ErrorResponse(error="not found", status_code=404)
    assert resp.error == "not found"
    assert resp.status_code == 404
    assert resp.details is None


def test_error_response_with_details():
    resp = ErrorResponse(error="bad", details={"field": "x"}, status_code=400)
    assert resp.details == {"field": "x"}


def test_success_response_has_data():
    resp = SuccessResponse(data={"key": "val"})
    assert resp.data == {"key": "val"}
    assert resp.status_code == 200
