import logging
import sys
from typing import Optional


def setup_logging(level: int = logging.INFO) -> logging.Logger:
    """
    Configure centralized application logging.

    Returns a logger configured with:
    - Timestamped output
    - Structured format for traceability
    - Console handler with UTF-8 encoding (Windows-safe)
    """
    logger = logging.getLogger("visitor_management")
    logger.setLevel(level)

    # Prevent duplicate handlers if called multiple times
    if logger.handlers:
        return logger

    # Use a formatter with timestamp, level, module, and message
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler with UTF-8 support for Windows
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(formatter)

    # Ensure UTF-8 encoding on Windows
    if hasattr(handler.stream, "reconfigure"):
        try:
            handler.stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

    logger.addHandler(handler)
    logger.propagate = False

    return logger


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """
    Get a logger instance for a module.

    Args:
        name: Module name (typically __name__). If None, returns the root app logger.

    Returns:
        Configured logger instance
    """
    if name is None:
        return logging.getLogger("visitor_management")
    return logging.getLogger(f"visitor_management.{name}")