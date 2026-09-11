"""Tests for string utilities."""

from paper2sim.string_utils import truncate, sanitize, slugify


def test_truncate_short():
    assert truncate("hello", 10) == "hello"


def test_truncate_long():
    assert truncate("hello world", 5) == "he..."


def test_sanitize():
    assert sanitize("<script>alert(1)</script>") == "scriptalert(1)/script"


def test_slugify():
    assert slugify("Hello World!") == "hello-world"
