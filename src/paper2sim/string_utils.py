"""String utilities for Paper2Sim."""


def truncate(text: str, max_len: int = 100) -> str:
    """Truncate string to max length with ellipsis."""
    if len(text) <= max_len:
        return text
    return text[:max_len - 3] + "..."


def sanitize(text: str) -> str:
    """Remove potentially dangerous characters."""
    return text.replace("<", "").replace(">", "").replace("&", "")


def slugify(text: str) -> str:
    """Convert text to URL-safe slug."""
    import re
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return text.strip("-")
