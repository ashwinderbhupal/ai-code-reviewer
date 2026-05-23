"""
SQLAlchemy ORM models for users and reviews.

Reviews store the structured output produced by the LLM so the frontend
can render bug lists, security findings, and a score without re-running
the model.
"""

from datetime import datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    """A GitHub-authenticated user of the dashboard."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    # access_token is used by the backend to call the GitHub API on the
    # user's behalf (e.g. posting review comments back on PRs).
    access_token = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    reviews = relationship(
        "Review",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Review(Base):
    """A single AI-generated code review for one pull request."""

    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    repo_name = Column(String, nullable=False, index=True)
    pr_number = Column(Integer, nullable=False)
    pr_title = Column(String, nullable=False)
    pr_url = Column(String, nullable=False)

    diff_summary = Column(Text, nullable=True)
    # JSON-encoded list fields keep things flexible if the LLM returns
    # extra metadata in future revisions of the prompt. Each item is a
    # dict of {description, severity, confidence}; legacy rows may
    # contain plain strings and the frontend handles both shapes.
    bugs_found = Column(JSON, default=list)
    security_issues = Column(JSON, default=list)
    performance_issues = Column(JSON, default=list)
    code_quality_issues = Column(JSON, default=list)
    suggestions = Column(JSON, default=list)
    overall_score = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reviews")
