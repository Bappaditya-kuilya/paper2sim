"""URL validation for Paper2Sim."""

import re


def is_arxiv_url(url: str) -> bool:
    """Check if URL is a valid arXiv URL."""
    pattern = r"https?://arxiv\.org/(abs|pdf)/\d{4}\.\d{4,5}"
    return bool(re.match(pattern, url))


def is_valid_url(url: str) -> bool:
    """Check if string is a valid URL."""
    pattern = r"https?://[^\s/$.?#].[^\s]*"
    return bool(re.match(pattern, url))
