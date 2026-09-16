"""Equation extraction for papers: LaTeX/text regexes, arXiv fetch, PDF blocks."""

from .arxiv import download_source, get_paper_info, parse_arxiv_url
from .equations import classify_equation, extract_equations_from_tex, extract_equations_from_text
from .pdf_blocks import extract_equations_from_pdf_bytes

__all__ = [
    "classify_equation",
    "download_source",
    "extract_equations_from_pdf_bytes",
    "extract_equations_from_tex",
    "extract_equations_from_text",
    "get_paper_info",
    "parse_arxiv_url",
]
