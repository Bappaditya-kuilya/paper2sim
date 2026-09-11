"""Tests for storyboard client."""

import os
from unittest.mock import patch

from paper2sim.storyboard_client import generate_storyboard


def test_storyboard_returns_error_without_api_key():
    with patch.dict(os.environ, {"GROQ_API_KEY": ""}, clear=False):
        result = generate_storyboard({"name": "test", "equations": []})
        assert "error" in result
        assert "GROQ_API_KEY" in result["error"]


def test_storyboard_returns_empty_scenes():
    with patch.dict(os.environ, {"GROQ_API_KEY": ""}, clear=False):
        result = generate_storyboard({"name": "test"})
        assert "error" in result
        assert "scenes" in result


def test_storyboard_accepts_source_text():
    with patch.dict(os.environ, {"GROQ_API_KEY": ""}, clear=False):
        result = generate_storyboard({"name": "test"}, source_text="some paper text")
        assert "error" in result  # Still fails without API key, but validates input
