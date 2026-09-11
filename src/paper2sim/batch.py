"""Batch processing for Paper2Sim equations."""


def batch_extract(text: str, batch_size: int = 10) -> list[list[str]]:
    """Split text into batches of lines."""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    return [lines[i:i + batch_size] for i in range(0, len(lines), batch_size)]


def batch_classify(equations: list[str]) -> list[dict]:
    """Classify a batch of equations."""
    from paper2sim.equations import classify_equation
    return [{"latex": eq, "type": classify_equation(eq)} for eq in equations]
