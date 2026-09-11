"""Tests for parameter validator."""

from paper2sim.param_validator import validate_params


def test_validate_params_uses_defaults():
    schema = [{"name": "freq", "min": 0, "max": 10, "default": 1}]
    result = validate_params({}, schema)
    assert result["freq"] == 1


def test_validate_params_clamps_high():
    schema = [{"name": "freq", "min": 0, "max": 10, "default": 1}]
    result = validate_params({"freq": 100}, schema)
    assert result["freq"] == 10


def test_validate_params_clamps_low():
    schema = [{"name": "freq", "min": 0, "max": 10, "default": 1}]
    result = validate_params({"freq": -5}, schema)
    assert result["freq"] == 0


def test_validate_params_passthrough():
    schema = [{"name": "freq", "min": 0, "max": 10, "default": 1}]
    result = validate_params({"freq": 5}, schema)
    assert result["freq"] == 5
