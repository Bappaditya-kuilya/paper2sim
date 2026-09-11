"""Health check utilities for Paper2Sim."""

import importlib


def check_dependencies() -> dict[str, str]:
    """Check status of all dependencies."""
    deps = {
        "fastapi": "fastapi",
        "uvicorn": "uvicorn",
        "pydantic": "pydantic",
        "httpx": "httpx",
        "pymupdf": "fitz",
        "slowapi": "slowapi",
    }
    result = {}
    for name, module in deps.items():
        try:
            importlib.import_module(module)
            result[name] = "ok"
        except ImportError:
            result[name] = "missing"
    return result


def get_system_info() -> dict:
    """Get basic system information."""
    import platform
    return {
        "python": platform.python_version(),
        "platform": platform.platform(),
        "processor": platform.processor(),
    }
