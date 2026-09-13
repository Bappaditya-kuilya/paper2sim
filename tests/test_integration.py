import pytest
from unittest.mock import patch, MagicMock
from paper2sim.equations import classify_equation, select_templates
from paper2sim.model_registry import get_model, list_models
from paper2sim.response_format import format_equation_response, format_extract_response, format_error_response


class TestClassifyEquation:
    def test_returns_string(self):
        result = classify_equation("y = sin(x)")
        assert isinstance(result, str)
        assert len(result) > 0

    def test_classifies_equation(self):
        result = classify_equation("y = x^2 + 3x + 1")
        assert isinstance(result, str)

    def test_classifies_exponential(self):
        result = classify_equation("y = e^x")
        assert isinstance(result, str)

    def test_classifies_ode(self):
        result = classify_equation("dy/dx = y")
        assert isinstance(result, str)

    def test_classifies_physics(self):
        result = classify_equation("F = ma")
        assert isinstance(result, str)


class TestModelRegistry:
    def test_get_model(self):
        model = get_model("trigonometric")
        assert model is not None
        assert "renderer" in model

    def test_list_models(self):
        models = list_models()
        assert len(models) > 0
        assert any(m["type"] == "trigonometric" for m in models)


class TestResponseFormat:
    def test_format_equation_response(self):
        result = format_equation_response({"latex": "y = x", "type": "function"})
        assert "latex" in result

    def test_format_extract_response(self):
        result = format_extract_response([{"latex": "y = x", "type": "function"}])
        assert "equations" in result

    def test_format_error_response(self):
        result = format_error_response("Something failed")
        assert "error" in result
        assert result["error"] == "Something failed"


class TestSelectTemplates:
    def test_selects_templates(self):
        equations = [{"latex": "y = sin(x)", "type": "trigonometric"}]
        result = select_templates(equations)
        assert len(result) == 1
        assert "template" in result[0]
