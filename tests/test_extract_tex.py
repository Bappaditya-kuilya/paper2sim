"""plan.md §12: display/inline/$$ extraction + classify sanity + Manim map gone."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import eqextract  # noqa: E402 — same top-level identity api.py loads

TEX_DOC = r"""
Einstein wrote \begin{equation} \label{eq:emc} E = mc^2 \end{equation} in 1905.
A display bracket: \[ \int_{0}^{1} x^2 dx \] and a display dollar: $$ \sum_{i=1}^{n} i $$.
Inline math $E = mc^2$ appears here, but $hello$ is just prose.
"""


def test_display_equation_with_label():
    eqs = eqextract.extract_equations_from_tex(TEX_DOC)
    match = [e for e in eqs if "E = mc^2" in e["latex"] and "begin{equation}" in e["latex"]]
    assert len(match) == 1
    assert match[0]["label"] == "eq:emc"
    assert set(match[0]) >= {"latex", "type"}


def test_bracket_and_dollar_display_found():
    eqs = eqextract.extract_equations_from_tex(TEX_DOC)
    assert any(e["latex"].startswith(r"\[") for e in eqs)
    assert any(e["latex"].startswith("$$") for e in eqs)


def test_inline_math_found_prose_skipped():
    eqs = eqextract.extract_equations_from_tex(TEX_DOC)
    assert any(e["latex"] == "$E = mc^2$" for e in eqs)
    assert not any(e["latex"] == "$hello$" for e in eqs)


def test_no_duplicate_spans():
    eqs = eqextract.extract_equations_from_tex(TEX_DOC)
    assert len([e["latex"] for e in eqs]) == len({e["latex"] for e in eqs})


def test_classify_all_seven_types():
    cases = {
        "Attention(Q,K,V) = softmax(QK^T)": "function_def",
        r"\begin{bmatrix} a & b \\ c & d \end{bmatrix}": "matrix",
        r"\sum_{i=1}^{n} i^2": "sum",
        r"\int_{0}^{1} x^2 dx": "integral",
        r"\frac{a+b}{c}": "equation",
        r"x \leq y + 1": "inequality",
        "hello world": "unknown",
    }
    for latex, want in cases.items():
        assert eqextract.classify_equation(latex) == want, latex


def test_text_extraction_skips_prose_keeps_greek():
    text = "plain prose line here\nE = mc^2 + x\n\u03b1 + \u03b2 = \u03b3\n"
    eqs = eqextract.extract_equations_from_text(text)
    assert not any("plain prose" in e["latex"] for e in eqs)
    assert any("E = mc^2" in e["latex"] for e in eqs)
    assert any("\u03b1 + \u03b2" in e["latex"] for e in eqs)  # §9.3: Greek must not be garbage


def test_manim_map_gone():
    assert not hasattr(eqextract, "select_templates")
    assert not hasattr(eqextract, "_template_for_type")
    src = open(os.path.join(os.path.dirname(__file__), "..", "src", "eqextract", "equations.py")).read()
    assert "def select_templates" not in src
    assert "def _template_for_type" not in src
    assert "import manim" not in src and "from manim" not in src
    assert "import openai" not in src and "from openai" not in src


