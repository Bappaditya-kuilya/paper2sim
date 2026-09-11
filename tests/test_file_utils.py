"""Tests for file utilities."""

import tempfile
from pathlib import Path

from paper2sim.file_utils import create_temp_dir, safe_write, safe_read


def test_create_temp_dir():
    d = create_temp_dir()
    assert Path(d).exists()
    Path(d).rmdir()


def test_safe_write_and_read():
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as f:
        path = f.name
    assert safe_write(path, "hello") is True
    assert safe_read(path) == "hello"
    Path(path).unlink()


def test_safe_read_missing():
    assert safe_read("/nonexistent/file.txt") is None
