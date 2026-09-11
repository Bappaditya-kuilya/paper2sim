"""Equation metadata for Paper2Sim."""


def extract_metadata(equation: str) -> dict:
    """Extract metadata from equation string."""
    return {
        "length": len(equation),
        "has_equals": "=" in equation,
        "has_exponent": "^" in equation,
        "has_trig": any(t in equation for t in ["sin", "cos", "tan"]),
        "has_log": any(t in equation for t in ["log", "ln", "exp"]),
        "has_matrix": "\\" in equation and "begin" in equation,
    }
