"""PDF extraction utility for Paper2Sim."""

import tempfile
from pathlib import Path


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from a PDF file using PyMuPDF."""
    import fitz
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text


def extract_equations_from_pdf(pdf_path: str) -> list[dict]:
    """Extract equations from a PDF by looking for patterns."""
    text = extract_text_from_pdf(pdf_path)
    equations = []
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if "=" in line or "^" in line or "\\" in line:
            equations.append({"latex": line, "type": "display"})
    return equations
