"""Tests for PDF extraction."""

import tempfile
from pathlib import Path

import pytest

from paper2sim.pdf_extract import extract_text_from_pdf, extract_equations_from_pdf


def test_extract_text_from_pdf_missing_file():
    with pytest.raises(Exception):
        extract_text_from_pdf("/nonexistent/file.pdf")


def test_extract_equations_from_pdf_missing_file():
    with pytest.raises(Exception):
        extract_equations_from_pdf("/nonexistent/file.pdf")
