"""Tests for configuration."""

from paper2sim.config import Config


def test_config_has_defaults():
    assert Config.API_HOST == "0.0.0.0"
    assert Config.API_PORT == 8000
    assert Config.CACHE_TTL == 3600


def test_config_llm_check():
    result = Config.is_llm_configured()
    assert isinstance(result, bool)


def test_config_temp_dir():
    assert Config.TEMP_DIR is not None
    assert len(Config.TEMP_DIR) > 0
