"""Logging utility for Paper2Sim."""

import logging
import sys


def setup_logging(level: str = "INFO") -> logging.Logger:
    """Configure and return application logger."""
    logger = logging.getLogger("paper2sim")
    logger.setLevel(getattr(logging, level.upper()))

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        ))
        logger.addHandler(handler)

    return logger
