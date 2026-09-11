"""Tests for health check utilities."""

from paper2sim.health_check import check_dependencies, get_system_info


def test_check_dependencies_returns_dict():
    result = check_dependencies()
    assert isinstance(result, dict)
    assert "fastapi" in result
    assert result["fastapi"] == "ok"


def test_get_system_info():
    result = get_system_info()
    assert "python" in result
    assert "platform" in result
