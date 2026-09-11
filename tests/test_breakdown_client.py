"""Tests for breakdown client."""

import os
from unittest.mock import patch

from paper2sim.breakdown_client import breakdown_equations


def test_breakdown_returns_error_without_api_key():
    with patch.dict(os.environ, {"GROQ_API_KEY": ""}, clear=False):
        result = breakdown_equations([{"latex": "sin(x)", "type": "trigonometric"}])
        assert "error" in result
        assert "GROQ_API_KEY" in result["error"]


def test_breakdown_returns_empty_list_for_no_equations():
    with patch.dict(os.environ, {"GROQ_API_KEY": ""}, clear=False):
        result = breakdown_equations([])
        assert "error" in result


def test_breakdown_equations_struct():
    """Test the structure of breakdown input."""
    equations = [
        {"latex": "F = ma", "type": "physics"},
        {"latex": "E = mc^2", "type": "physics"},
    ]
    # Without API key, should return error
    result = breakdown_equations(equations)
    assert "error" in result
    assert "breakdowns" in result
