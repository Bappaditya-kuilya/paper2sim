"""Tests for response formatting."""

from paper2sim.response_format import format_equation_response, format_extract_response, format_error_response


def test_format_equation_response():
    result = format_equation_response({"latex": "x^2", "type": "polynomial"})
    assert result["latex"] == "x^2"
    assert result["type"] == "polynomial"
    assert result["template"] is None


def test_format_extract_response():
    eqs = [{"latex": "x^2", "type": "polynomial"}, {"latex": "sin(x)", "type": "trig"}]
    result = format_extract_response(eqs, {"arxiv_id": "1234"})
    assert result["count"] == 2
    assert result["paper_info"]["arxiv_id"] == "1234"


def test_format_error_response():
    result = format_error_response("not found", {"path": "/api/test"})
    assert result["error"] == "not found"
    assert result["details"]["path"] == "/api/test"
