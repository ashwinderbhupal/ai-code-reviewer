"""
Database configuration module.

Sets up the SQLAlchemy engine, session factory, and declarative Base
for the AI Code Reviewer backend. The DATABASE_URL is read from the
environment so the same code works for local Postgres and hosted
PostgreSQL providers such as Neon.tech.
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

# Default to a local Postgres for development. In production, point this
# at a managed Postgres URL (e.g. from https://neon.tech) of the form:
#   postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/dbname?sslmode=require
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/codereview",
)


def _build_connect_args(url: str) -> dict:
    """
    Build the connect_args passed to create_engine.

    Hosted PostgreSQL providers like Neon.tech only accept TLS
    connections, so for any postgresql URL we ask psycopg2 to require
    SSL. Local Postgres ignores this when SSL isn't available unless the
    server explicitly rejects it; users running a plain local DB can set
    `?sslmode=disable` in DATABASE_URL to opt out.
    """
    if url.startswith("postgresql"):
        return {"sslmode": "require"}
    return {}


# pool_pre_ping avoids "server closed connection unexpectedly" errors
# after the DB connection has been idle for a while (common with Neon's
# free tier, which suspends idle compute).
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    future=True,
    connect_args=_build_connect_args(DATABASE_URL),
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a SQLAlchemy session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
