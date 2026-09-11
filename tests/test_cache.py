"""Tests for cache utility."""

from paper2sim.cache import TTLCache


def test_cache_set_and_get():
    cache = TTLCache(ttl=60)
    cache.set("key1", "value1")
    assert cache.get("key1") == "value1"


def test_cache_miss():
    cache = TTLCache(ttl=60)
    assert cache.get("missing") is None


def test_cache_clear():
    cache = TTLCache(ttl=60)
    cache.set("key1", "value1")
    cache.clear()
    assert cache.get("key1") is None


def test_cache_size():
    cache = TTLCache(ttl=60)
    cache.set("a", 1)
    cache.set("b", 2)
    assert cache.size() == 2
