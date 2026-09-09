"""Tests for equation extraction, classification, and template selection."""

import pytest

from paper2sim.equations import (
    _extract_label,
    _is_garbage,
    _line_has_math,
    _looks_like_math,
    _template_for_type,
    classify_equation,
    extract_equations_from_text,
    extract_equations_from_tex,
    select_templates,
)


class TestExtractEquationsFromTex:
    """Tests for LaTeX source equation extraction."""

    def test_display_equation_begin(self):
        tex = r"\begin{equation}E = mc^2\end{equation}"
        eqs = extract_equations_from_tex(tex)
        assert len(eqs) == 1
        assert eqs[0]["type"] == "display"
        assert "mc^2" in eqs[0]["latex"]

    def test_display_equation_bracket(self):
        tex = r"\[E = mc^2\]"
        eqs = extract_equations_from_tex(tex)
        assert len(eqs) == 1
        assert eqs[0]["type"] == "display"

    def test_display_equation_dollar(self):
        tex = "$$E = mc^2$$"
        eqs = extract_equations_from_tex(tex)
        assert len(eqs) == 1
        assert eqs[0]["type"] == "display"

    def test_inline_equation(self):
        tex = r"The energy $E = mc^2$ is famous."
        eqs = extract_equations_from_tex(tex)
        assert len(eqs) == 1
        assert eqs[0]["type"] == "inline"

    def test_skips_non_math_inline(self):
        tex = r"This is $not math$ at all."
        eqs = extract_equations_from_tex(tex)
        assert len(eqs) == 0

    def test_extracts_label(self):
        tex = r"\label{eq:energy}\begin{equation}E = mc^2\end{equation}"
        eqs = extract_equations_from_tex(tex)
        assert eqs[0]["label"] == "eq:energy"

    def test_multiple_equations(self):
        tex = r"""
        \begin{equation}E = mc^2\end{equation}
        \[F = ma\]
        $$\int_0^1 x dx$$
        """
        eqs = extract_equations_from_tex(tex)
        assert len(eqs) == 3

    def test_empty_tex(self):
        eqs = extract_equations_from_tex("")
        assert eqs == []


class TestIsGarbage:
    """Tests for garbage text filtering."""

    def test_too_short(self):
        assert _is_garbage("ab") is True

    def test_corrupted_unicode(self):
        text = "abc" + "\xff" * 10
        assert _is_garbage(text) is True

    def test_clean_text(self):
        assert _is_garbage("E = mc^2") is False

    def test_no_math_chars(self):
        assert _is_garbage("hello world") is True


class TestLineHasMath:
    """Tests for math line detection."""

    def test_greek_letters(self):
        assert _line_has_math("α = β + γ") is True

    def test_math_symbols(self):
        assert _line_has_math("∑ ∫ ∂ ∇") is True

    def test_equation_with_operators(self):
        assert _line_has_math("x = y + z") is True

    def test_plain_text(self):
        assert _line_has_math("hello world") is False


class TestLooksLikeMath:
    """Tests for inline math heuristic."""

    def test_fraction(self):
        assert _looks_like_math(r"\frac{a}{b}") is True

    def test_sum(self):
        assert _looks_like_math(r"\sum_{i=1}^n") is True

    def test_operators(self):
        assert _looks_like_math("a = b + c") is True

    def test_plain_text(self):
        assert _looks_like_math("hello") is False


class TestExtractLabel:
    """Tests for label extraction."""

    def test_finds_label(self):
        text = r"\label{eq:attention}\begin{equation}A\end{equation}"
        label = _extract_label(text, 30)
        assert label == "eq:attention"

    def test_no_label(self):
        text = r"\begin{equation}A\end{equation}"
        label = _extract_label(text, 0)
        assert label is None


class TestClassifyEquation:
    """Tests for equation classification."""

    def test_attention(self):
        assert classify_equation(r"\softmax(QK^T / \sqrt{d_k})") == "function_def"

    def test_multihead(self):
        assert classify_equation(r"\text{MultiHead}(Q,K,V)") == "function_def"

    def test_layernorm(self):
        assert classify_equation(r"\text{LayerNorm}(x + \text{sublayer}(x))") == "function_def"

    def test_embedding(self):
        assert classify_equation(r"\text{Embedding}(token)") == "function_def"

    def test_matrix(self):
        assert classify_equation(r"\begin{bmatrix} 1 & 0 \\ 0 & 1 \end{bmatrix}") == "matrix"

    def test_sum(self):
        assert classify_equation(r"\sum_{i=1}^n x_i") == "sum"

    def test_integral(self):
        assert classify_equation(r"\int_0^1 f(x) dx") == "integral"

    def test_equation_with_frac(self):
        assert classify_equation(r"\frac{a}{b} = c") == "equation"

    def test_inequality(self):
        assert classify_equation(r"x \leq y") == "inequality"

    def test_unknown(self):
        assert classify_equation(r"\alpha") == "unknown"


class TestTemplateForType:
    """Tests for template selection."""

    def test_matrix_multiply(self):
        assert _template_for_type("matrix", r"\begin{bmatrix} 1 \end{bmatrix}") == "matrix_multiply"

    def test_attention_heatmap(self):
        assert _template_for_type("sum", r"\sum Q K^T") == "attention_heatmap"

    def test_softmax(self):
        assert _template_for_type("function_def", r"\softmax(x)") == "softmax_distribution"

    def test_transformer_block(self):
        assert _template_for_type("function_def", r"\text{MultiHead}(Q,K,V)") == "transformer_block"

    def test_embedding_lookup(self):
        assert _template_for_type("function_def", r"\text{Embedding}(token)") == "embedding_lookup"

    def test_gradient_descent(self):
        assert _template_for_type("function_def", r"\nabla L") == "gradient_descent"

    def test_linear_combination(self):
        assert _template_for_type("function_def", r"f(x) = ax + b") == "linear_combination"

    def test_probability_distribution(self):
        assert _template_for_type("integral", r"\int_0^1 f(x) dx") == "probability_distribution"

    def test_none_for_no_match(self):
        assert _template_for_type("unknown", r"\alpha") is None


class TestSelectTemplates:
    """Tests for full template selection pipeline."""

    def test_maps_equations(self):
        equations = [
            {"latex": r"\softmax(QK^T / \sqrt{d_k})", "type": "display"},
            {"latex": r"\begin{bmatrix} 1 \end{bmatrix}", "type": "display"},
        ]
        results = select_templates(equations)
        assert len(results) == 2
        assert results[0]["template"] is not None
        assert results[1]["template"] == "matrix_multiply"

    def test_empty_input(self):
        assert select_templates([]) == []
