"""
FastAPI entrypoint for the AI Code Reviewer backend.

Responsibilities of this module:

* Configure logging before anything else imports.
* Create the FastAPI app and register CORS.
* Mount routers for auth, reviews, and the GitHub webhook.
* Run a tiny startup hook that ensures the database schema is up to
  date (creates tables + ALTERs in any newly added JSON columns so we
  don't need Alembic for a simple dev project).
* Expose a ``/health`` endpoint that other services / dashboards can
  poll without touching authenticated routes.
"""

from __future__ import annotations

import logging
import os
import time

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from logging_config import setup_logging

# Configure logging FIRST so every other import gets it for free.
setup_logging(os.getenv("LOG_LEVEL", "INFO"))

from database import Base, SessionLocal, engine  # noqa: E402

# Importing the models module before create_all ensures the tables are
# registered on Base.metadata before we try to create them.
import models  # noqa: E402,F401  (side-effect import)
from llm_service import ping_groq  # noqa: E402
from routes import auth, reviews, webhook  # noqa: E402

load_dotenv()

logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Process start time used by /health to compute uptime.
APP_START_TIME = time.time()

app = FastAPI(
    title="AI Code Reviewer",
    description="LLM-powered code review for GitHub pull requests.",
    version="1.1.0",
)

# CORS: allow the React dev server (and any FRONTEND_URL we ship to).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _ensure_review_columns() -> None:
    """
    Idempotently add JSON columns that were introduced after the table
    was first created. ``create_all`` only creates *missing tables*, so
    on existing deployments newer columns won't appear without an
    explicit migration. We use ``ADD COLUMN IF NOT EXISTS`` which is
    supported by Postgres 9.6+ and is a no-op when the column exists.
    """
    new_columns = {
        "code_quality_issues": "JSONB",
    }

    try:
        inspector = inspect(engine)
        existing = {col["name"] for col in inspector.get_columns("reviews")}
    except SQLAlchemyError as exc:
        logger.warning("Could not introspect 'reviews' table: %s", exc)
        return

    missing = {name: ddl for name, ddl in new_columns.items() if name not in existing}
    if not missing:
        return

    with engine.begin() as conn:
        for name, ddl in missing.items():
            try:
                conn.execute(
                    text(f"ALTER TABLE reviews ADD COLUMN IF NOT EXISTS {name} {ddl}")
                )
                logger.info("Added missing column reviews.%s", name)
            except SQLAlchemyError as exc:
                logger.warning("Could not add column reviews.%s: %s", name, exc)


@app.on_event("startup")
def on_startup() -> None:
    """Create database tables on boot if they don't already exist."""
    logger.info("Backend starting up...")
    try:
        Base.metadata.create_all(bind=engine)
        _ensure_review_columns()
        logger.info("Database schema ready.")
    except SQLAlchemyError as exc:
        logger.exception("Database initialization failed: %s", exc)


@app.get("/")
async def root() -> dict[str, str]:
    """Health-check / version endpoint kept for backwards compatibility."""
    return {
        "service": "ai-code-reviewer",
        "status": "ok",
        "docs": "/docs",
        "version": app.version,
    }


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, object]:
    """
    Deep health check.

    Reports server status, the database round-trip latency, Groq API
    reachability, current uptime in seconds, and the total number of
    review rows in the database.
    """
    uptime_seconds = int(time.time() - APP_START_TIME)

    # --- Database probe ---
    db_status: dict[str, object] = {"status": "unknown"}
    total_reviews = -1
    try:
        started = time.perf_counter()
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
            total_reviews = session.execute(
                text("SELECT COUNT(*) FROM reviews")
            ).scalar_one()
        db_status = {
            "status": "ok",
            "latency_ms": int((time.perf_counter() - started) * 1000),
        }
    except SQLAlchemyError as exc:
        logger.exception("Database health probe failed: %s", exc)
        db_status = {"status": "error", "detail": str(exc)}

    # --- Groq probe ---
    groq_status = await ping_groq(timeout_seconds=3.0)

    overall = "ok"
    if db_status.get("status") != "ok" or groq_status.get("status") not in {"ok"}:
        overall = "degraded"

    return {
        "status": overall,
        "service": "ai-code-reviewer",
        "version": app.version,
        "uptime_seconds": uptime_seconds,
        "total_reviews": total_reviews,
        "database": db_status,
        "groq": groq_status,
    }


app.include_router(auth.router)
app.include_router(reviews.router)
app.include_router(webhook.router)
