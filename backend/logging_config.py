"""
Centralized logging configuration for the AI Code Reviewer backend.

Calling :func:`setup_logging` once at process startup wires up:

* A rotating file handler at ``logs/app.log`` (5 MB per file, 5 backups).
* A console (stderr) handler that uses the same format.
* Full stack traces for unhandled exceptions caught by FastAPI's
  exception machinery (we set ``logging.exception`` everywhere we
  catch).

Use ``logger = logging.getLogger(__name__)`` in every module instead
of bare ``print``.
"""

from __future__ import annotations

import logging
import logging.handlers
import os
import sys
from pathlib import Path

_LOG_FORMAT = (
    "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
)
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Resolve once so re-importing during uvicorn --reload doesn't make a mess.
_LOG_DIR = Path(__file__).resolve().parent / "logs"
_LOG_FILE = _LOG_DIR / "app.log"

_configured = False


def setup_logging(level: int | str = logging.INFO) -> None:
    """
    Configure the root logger with a file + console handler.

    Safe to call multiple times: subsequent calls are no-ops so that
    ``uvicorn --reload`` doesn't keep stacking handlers on top of each
    other (which would print every log line N times).
    """
    global _configured
    if _configured:
        return

    _LOG_DIR.mkdir(parents=True, exist_ok=True)

    formatter = logging.Formatter(fmt=_LOG_FORMAT, datefmt=_DATE_FORMAT)

    # Rotating file handler -- keeps logs from growing forever.
    file_handler = logging.handlers.RotatingFileHandler(
        _LOG_FILE,
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(formatter)

    console_handler = logging.StreamHandler(stream=sys.stderr)
    console_handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)
    # Replace any handlers that uvicorn/anyone else installed before us.
    root.handlers = [file_handler, console_handler]

    # Tame the noisier libraries -- still visible at INFO+ but no DEBUG spam.
    for noisy in ("uvicorn.access", "httpx", "httpcore", "asyncio"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    _configured = True
    logging.getLogger(__name__).info(
        "Logging configured -> %s (level=%s)",
        _LOG_FILE,
        logging.getLevelName(level),
    )


def get_log_file() -> Path:
    """Return the absolute path of the active log file (for /health, etc.)."""
    return _LOG_FILE


# Honor an env var so ops can crank up verbosity without a code change.
_DEFAULT_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
