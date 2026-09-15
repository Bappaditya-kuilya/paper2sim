"""Tests for input validation."""

import pytest
from pydantic import ValidationError

from paper2sim.validation import ValidatedExtractRequest


def test_valid_extract_arxiv():
    req = ValidatedExtractRequest(source="arxiv_url", url="https://arxiv.org/abs/2301.00001")
    assert req.source == "arxiv_url"


def test_valid_extract_text():
    req = ValidatedExtractRequest(source="text", text="sin(x)")
    assert req.text == "sin(x)"


def test_invalid_source():
    with pytest.raises(ValidationError):
        ValidatedExtractRequest(source="invalid")


def test_arxiv_requires_url():
    with pytest.raises(ValidationError):
        ValidatedExtractRequest(source="arxiv_url")


def test_text_requires_text():
    with pytest.raises(ValidationError):
        ValidatedExtractRequest(source="text")
