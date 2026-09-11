"""Tests for URL utilities."""

from paper2sim.url_utils import is_arxiv_url, is_valid_url


def test_is_arxiv_url_valid():
    assert is_arxiv_url("https://arxiv.org/abs/2301.00001") is True


def test_is_arxiv_url_invalid():
    assert is_arxiv_url("https://google.com") is False


def test_is_valid_url():
    assert is_valid_url("https://example.com") is True
    assert is_valid_url("not a url") is False
