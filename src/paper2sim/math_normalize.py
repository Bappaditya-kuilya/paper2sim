"""Math normalization utilities for Paper2Sim."""

import re


def normalize_latex(latex: str) -> str:
    """Normalize LaTeX equation string."""
    latex = latex.strip()
    latex = latex.replace("\\begin{equation}", "").replace("\\end{equation}", "")
    latex = latex.replace("\\begin{align}", "").replace("\\end{align}", "")
    latex = latex.replace("\\[", "").replace("\\]", "")
    latex = latex.replace("\\(", "").replace("\\)", "")
    latex = re.sub(r"\\label\{[^}]*\}", "", latex)
    latex = re.sub(r"\\tag\{[^}]*\}", "", latex)
    return latex.strip()


def normalize_plain(text: str) -> str:
    """Normalize plain text math expression."""
    text = text.strip()
    text = text.replace("y=", "y = ")
    text = text.replace("f(x)=", "f(x) = ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def normalize_equation(equation: str) -> str:
    """Auto-detect format and normalize."""
    if "\\" in equation or "{" in equation:
        return normalize_latex(equation)
    return normalize_plain(equation)
