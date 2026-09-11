"""Tests for logging utility."""

from paper2sim.logging_util import setup_logging


def test_setup_logging_returns_logger():
    logger = setup_logging()
    assert logger is not None
    assert logger.name == "paper2sim"


def test_setup_logging_with_debug():
    logger = setup_logging("DEBUG")
    assert logger.level == 10  # DEBUG
