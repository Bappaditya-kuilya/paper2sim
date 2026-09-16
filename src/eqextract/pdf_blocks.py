"""Equation candidates from PDF bytes via PyMuPDF text-block scoring."""

from .equations import classify_equation

_MATH_TOKENS = ("=", "^", "_", "{", "}", "\\int", "\\sum", "\\frac", "\\sqrt")


def _block_score(text: str) -> int:
    """Count math tokens in a block; 0 means not an equation candidate."""
    return sum(text.count(tok) for tok in _MATH_TOKENS)


def extract_equations_from_pdf_bytes(data: bytes, max_pages=30, max_candidates=200) -> list[dict]:
    """Score PyMuPDF text blocks by math-token count, in reading order.

    Only text blocks (``block_type == 0``) are considered, sorted by
    ``(y, x)`` per page. Each hit is ``{"latex", "type", "label"}`` with
    ``type`` from :func:`eqextract.equations.classify_equation`.
    """
    import fitz  # lazy: PyMuPDF needed only on the PDF path

    if not data:
        return []
    equations: list[dict] = []
    with fitz.open(stream=data, filetype="pdf") as doc:
        for index, page in enumerate(doc):
            if index >= max_pages:
                break
            blocks = [b for b in page.get_text("blocks") if b[6] == 0 and b[4].strip()]
            blocks.sort(key=lambda b: (b[1], b[0]))
            for block in blocks:
                text = block[4].strip()
                if _block_score(text) == 0:
                    continue
                equations.append({"latex": text, "type": classify_equation(text), "label": None})
                if len(equations) >= max_candidates:
                    return equations
    return equations
