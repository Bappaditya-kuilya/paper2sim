"""File handling utilities for Paper2Sim."""

import tempfile
from pathlib import Path


def create_temp_dir() -> str:
    """Create and return a temporary directory path."""
    return tempfile.mkdtemp(prefix="paper2sim_")


def safe_write(path: str, content: str) -> bool:
    """Safely write content to a file, creating parent dirs."""
    try:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content)
        return True
    except Exception:
        return False


def safe_read(path: str) -> str | None:
    """Safely read content from a file."""
    try:
        return Path(path).read_text()
    except Exception:
        return None
