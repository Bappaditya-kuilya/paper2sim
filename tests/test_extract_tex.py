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


def test_bare_function_call_extracted_as_function():
    """y=sin(x) carries no operator — must still reach the plot path."""
    eqs = eqextract.extract_equations_from_text("y=sin(x)\n")
    assert len(eqs) == 1
    assert eqs[0]["type"] == "function_def"


def test_implication_arrow_is_unknown():
    assert eqextract.classify_equation("a=>b") == "unknown"


def test_manim_map_gone():
    assert not hasattr(eqextract, "select_templates")
    assert not hasattr(eqextract, "_template_for_type")
    src = open(os.path.join(os.path.dirname(__file__), "..", "src", "eqextract", "equations.py")).read()
    assert "def select_templates" not in src
    assert "def _template_for_type" not in src
    assert "import manim" not in src and "from manim" not in src
    assert "import openai" not in src and "from openai" not in src


def test_classify_plain_text_forms():
    """Paste/type path carries no TeX commands — must still route (phase 6 fix)."""
    cases = {
        "y = sin(k*x) + c": "function_def",
        "f(x) = x^2 + 2*x + 1": "function_def",
        "y = e^x": "function_def",
        "z = x^2 + y^2": "function_def",
        "y = 2x + 1": "function_def",
        "y = mx + c": "function_def",
        "x^2 = 4": "function_def",
        "E = mc^2": "equation",
        "a^2 + b^2 = c^2": "equation",
        "y = mx + b": "function_def",
        "x -> 0": "unknown",  # arrow, not inequality
        "x < y + 1": "inequality",
        "hello world": "unknown",
    }
    for latex, want in cases.items():
        assert eqextract.classify_equation(latex) == want, latex


def test_gate_bare_func_name_glued():
    """y = sinx: paren-less func call must pass the gate (frontend plots it)."""
    eqs = eqextract.extract_equations_from_text("y = sinx\n")
    assert any("y = sinx" in e["latex"] for e in eqs)


def test_gate_glued_implicit_mult_with_operator():
    eqs = eqextract.extract_equations_from_text("y = 2x+1\n")
    assert any("y = 2x+1" in e["latex"] for e in eqs)


def test_gate_pipe_pair_is_math():
    eqs = eqextract.extract_equations_from_text("|x|\n")
    assert any("|x|" in e["latex"] for e in eqs)


def test_gate_subscript_is_math():
    eqs = eqextract.extract_equations_from_text("x_i + 1\n")
    assert any("x_i + 1" in e["latex"] for e in eqs)


def test_gate_bare_greek_names_are_math():
    eqs = eqextract.extract_equations_from_text("alpha + beta\n")
    assert any("alpha + beta" in e["latex"] for e in eqs)


def test_gate_percent_comment_only_rejected():
    eqs = eqextract.extract_equations_from_text("% just a comment\n")
    assert eqs == []


def test_gate_classify_boundary_spot_checks():
    """Gate accepts plottable bare forms; classify keeps its own contract."""
    assert eqextract.classify_equation("y = sinx") == "function_def"
    assert eqextract.classify_equation("y = 2x+1") == "function_def"


def test_is_plottable_candidate_accepts():
    assert eqextract.equations.is_plottable_candidate("E = mc^2 + x")
    assert eqextract.equations.is_plottable_candidate("\u03b1 + \u03b2 = \u03b3")
    assert eqextract.equations.is_plottable_candidate("y=sin(x)")


def test_is_plottable_candidate_rejects_prose():
    assert not eqextract.equations.is_plottable_candidate("plain prose line here")
    assert not eqextract.equations.is_plottable_candidate("We show x improves over baselines")
    assert not eqextract.equations.is_plottable_candidate("alpha and beta are parameters")
    assert not eqextract.equations.is_plottable_candidate("The role of the wandering null geodesic is studied in a black hole")
