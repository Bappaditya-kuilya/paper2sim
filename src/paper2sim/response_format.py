"""Response formatting for Paper2Sim API."""


def format_equation_response(equation: dict, template: str | None = None) -> dict:
    """Format equation for API response."""
    return {
        "latex": equation.get("latex", ""),
        "type": equation.get("type", "unknown"),
        "template": template or equation.get("template"),
        "label": equation.get("label"),
    }


def format_extract_response(equations: list[dict], paper_info: dict | None = None) -> dict:
    """Format extraction results for API response."""
    return {
        "equations": [format_equation_response(e) for e in equations],
        "paper_info": paper_info,
        "count": len(equations),
    }


def format_error_response(error: str, details: dict | None = None) -> dict:
    """Format error for API response."""
    resp = {"error": error}
    if details:
        resp["details"] = details
    return resp
