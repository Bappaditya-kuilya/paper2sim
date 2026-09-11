"""Tests for math normalization."""

from paper2sim.math_normalize import normalize_latex, normalize_plain, normalize_equation


def test_normalize_latex_removes_envs():
    assert normalize_latex("\\begin{equation} x^2 \\end{equation}") == "x^2"


def test_normalize_latex_removes_brackets():
    assert normalize_latex("\\[ x^2 \\]") == "x^2"


def test_normalize_latex_removes_labels():
    assert normalize_latex("x^2 \\label{eq1}") == "x^2"


def test_normalize_plain_adds_spaces():
    assert normalize_plain("y=2x") == "y = 2x"


def test_normalize_plain_fx():
    assert normalize_plain("f(x)=x^2") == "f(x) = x^2"


def test_normalize_equation_auto_detects():
    assert normalize_equation("\\[ x^2 \\]") == "x^2"
    assert normalize_equation("y=2x") == "y = 2x"
