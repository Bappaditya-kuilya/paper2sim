"""Tests for model registry."""

from paper2sim.model_registry import MODELS, get_model, list_models


def test_model_registry_has_trigonometric():
    assert "trigonometric" in MODELS
    assert MODELS["trigonometric"]["renderer"] == "TrigSurface"


def test_model_registry_has_physics():
    assert "physics" in MODELS
    assert MODELS["physics"]["renderer"] == "ForceField"


def test_model_registry_has_all_types():
    expected = {"trigonometric", "polynomial", "exponential", "logarithmic",
                "physics", "ode", "matrix", "probability", "statistical", "function"}
    assert set(MODELS.keys()) == expected


def test_get_model_returns_config():
    model = get_model("trigonometric")
    assert model is not None
    assert model["renderer"] == "TrigSurface"
    assert len(model["params"]) == 3


def test_get_model_returns_none_for_unknown():
    assert get_model("nonexistent") is None


def test_list_models_returns_all():
    models = list_models()
    assert len(models) == 10
    types = [m["type"] for m in models]
    assert "trigonometric" in types
    assert "physics" in types


def test_param_schema_has_required_fields():
    from paper2sim.model_registry import ParamSchema
    param = ParamSchema("freq", "Frequency", 0.1, 10, 1, 0.1)
    assert param.name == "freq"
    assert param.min_val == 0.1
    assert param.max_val == 10
    assert param.default == 1
