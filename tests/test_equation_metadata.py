"""Tests for equation metadata."""

from paper2sim.equation_metadata import extract_metadata


def test_metadata_basic():
    result = extract_metadata("x^2 + y^2 = 1")
    assert result["has_equals"] is True
    assert result["has_exponent"] is True


def test_metadata_trig():
    result = extract_metadata("sin(x) + cos(y)")
    assert result["has_trig"] is True
    assert result["has_equals"] is False


def test_metadata_length():
    result = extract_metadata("E = mc^2")
    assert result["length"] == 8
