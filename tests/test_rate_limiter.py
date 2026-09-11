"""Tests for rate limiter."""

from paper2sim.rate_limiter import RateLimiter


def test_allows_under_limit():
    limiter = RateLimiter(max_requests=5, window_seconds=60)
    assert limiter.is_allowed("user1") is True


def test_blocks_over_limit():
    limiter = RateLimiter(max_requests=2, window_seconds=60)
    assert limiter.is_allowed("user1") is True
    assert limiter.is_allowed("user1") is True
    assert limiter.is_allowed("user1") is False


def test_separate_keys():
    limiter = RateLimiter(max_requests=1, window_seconds=60)
    assert limiter.is_allowed("user1") is True
    assert limiter.is_allowed("user2") is True
    assert limiter.is_allowed("user1") is False


def test_remaining_count():
    limiter = RateLimiter(max_requests=5, window_seconds=60)
    limiter.is_allowed("user1")
    limiter.is_allowed("user1")
    assert limiter.remaining("user1") == 3
