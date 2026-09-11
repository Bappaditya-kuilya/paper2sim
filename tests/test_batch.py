"""Tests for batch processing."""

from paper2sim.batch import batch_extract, batch_classify


def test_batch_extract():
    text = "line1\nline2\nline3\nline4"
    result = batch_extract(text, batch_size=2)
    assert len(result) == 2
    assert result[0] == ["line1", "line2"]


def test_batch_classify():
    result = batch_classify(["sin(x)", "x^2"])
    assert len(result) == 2
    assert result[0]["latex"] == "sin(x)"
