"""Tests for equation normalization and classification."""

from paper2sim.math_parser import classify_expression, normalize_input


class TestNormalizeInput:
    def test_plain_text(self):
        assert normalize_input("sin(x)") == "sin(x)"

    def test_strip_y_equals(self):
        assert normalize_input("y = sin(x)") == "sin(x)"

    def test_strip_fx_equals(self):
        assert normalize_input("f(x) = x^2") == "x^2"

    def test_strip_f_equals(self):
        assert normalize_input("F = ma") == "m*a"

    def test_lowercase_functions(self):
        assert normalize_input("Sin(x)") == "sin(x)"
        assert normalize_input("COS(x)") == "cos(x)"

    def test_latex_frac(self):
        assert normalize_input(r"\frac{a}{b}") == "(a) / (b)"

    def test_latex_sqrt(self):
        assert normalize_input(r"\sqrt{x}") == "sqrt(x)"

    def test_latex_sin(self):
        assert normalize_input(r"\sin(x)") == "sin(x)"

    def test_latex_strip_backslash(self):
        assert normalize_input(r"\alpha + \beta") == "alpha + beta"

    def test_implicit_multiply_digit_letter(self):
        assert normalize_input("2x") == "2*x"

    def test_implicit_multiply_letter_digit(self):
        assert normalize_input("x2") == "x*2"

    def test_greek_letters(self):
        assert normalize_input("α + β") == "alpha + beta"

    def test_word_equation(self):
        result = normalize_input("force = mass * acceleration")
        assert result == "mass * acceleration"

    def test_equals_keeps_right(self):
        assert normalize_input("a^2 + b^2 = c^2") == "c^2"

    def test_whitespace_trimmed(self):
        assert normalize_input("  sin(x)  ") == "sin(x)"


class TestClassifyExpression:
    def test_trigonometric(self):
        assert classify_expression("sin(x)") == "trigonometric"

    def test_polynomial(self):
        assert classify_expression("x^2 + y^2") == "polynomial"

    def test_exponential(self):
        assert classify_expression("e^x") == "exponential"

    def test_logarithmic(self):
        assert classify_expression("log(x)") == "logarithmic"

    def test_physics(self):
        assert classify_expression("m*a") == "physics"

    def test_ode(self):
        assert classify_expression("dy/dx = x + y") == "ode"

    def test_matrix(self):
        assert classify_expression("A*B") == "matrix"

    def test_probability(self):
        assert classify_expression("P(A|B)") == "probability"

    def test_statistical(self):
        assert classify_expression("μ + σ") == "statistical"

    def test_function_default(self):
        assert classify_expression("sqrt(x)") == "function"
