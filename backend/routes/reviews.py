"""
Endpoints used by the dashboard:

  GET /reviews                 -> all reviews for the logged in user
  GET /reviews/{id}            -> a single review
  GET /reviews/{id}/export     -> the same review formatted as a
                                  downloadable Markdown report
  GET /stats                   -> aggregate stats for the user
  GET /usage/monthly           -> reviews processed in the current month

All endpoints require a valid JWT issued by the /auth/callback flow.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Iterable

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse, Response
from sqlalchemy import extract
from sqlalchemy.orm import Session

from auth_utils import get_current_user
from database import get_db
from llm_service import format_review_comment
from models import Review, User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["reviews"])


def _serialize(review: Review) -> dict[str, Any]:
    """Convert a Review ORM row to the JSON shape expected by the frontend."""
    return {
        "id": review.id,
        "repo_name": review.repo_name,
        "pr_number": review.pr_number,
        "pr_title": review.pr_title,
        "pr_url": review.pr_url,
        "diff_summary": review.diff_summary,
        "bugs_found": review.bugs_found or [],
        "security_issues": review.security_issues or [],
        "performance_issues": review.performance_issues or [],
        "code_quality_issues": review.code_quality_issues or [],
        "suggestions": review.suggestions or [],
        "overall_score": review.overall_score,
        "created_at": review.created_at.isoformat() if review.created_at else None,
    }


def _count_issues(items: Iterable[Any] | None) -> int:
    """Count issues robustly whether the list holds strings or dicts."""
    if not items:
        return 0
    return sum(1 for it in items if it)


@router.get("/reviews")
async def list_reviews(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return every review owned by the current user, newest first."""
    reviews = (
        db.query(Review)
        .filter(Review.user_id == current_user.id)
        .order_by(Review.created_at.desc())
        .all()
    )
    return [_serialize(r) for r in reviews]


@router.get("/reviews/{review_id}")
async def get_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch one review by id, scoped to the current user."""
    review = (
        db.query(Review)
        .filter(Review.id == review_id, Review.user_id == current_user.id)
        .first()
    )
    if review is None:
        raise HTTPException(404, "Review not found.")
    return _serialize(review)


@router.get("/reviews/{review_id}/export", response_class=PlainTextResponse)
async def export_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Return the review as a downloadable Markdown report."""
    review = (
        db.query(Review)
        .filter(Review.id == review_id, Review.user_id == current_user.id)
        .first()
    )
    if review is None:
        raise HTTPException(404, "Review not found.")

    serialized = _serialize(review)
    body = format_review_comment(
        {
            "overall_score": serialized["overall_score"],
            "summary": serialized["diff_summary"] or "",
            "bugs": serialized["bugs_found"],
            "security_issues": serialized["security_issues"],
            "performance_issues": serialized["performance_issues"],
            "code_quality_issues": serialized["code_quality_issues"],
            "suggestions": serialized["suggestions"],
        },
        repo=serialized["repo_name"],
        pr_number=serialized["pr_number"],
    )

    # Add a header and meta block so the standalone .md file makes
    # sense on its own (the comment helper assumes the GitHub context).
    created = serialized["created_at"] or ""
    pr_url = serialized["pr_url"]
    header = (
        f"# AI Code Review Report\n\n"
        f"- **Repository:** `{serialized['repo_name']}`\n"
        f"- **Pull Request:** [#{serialized['pr_number']}]({pr_url}) -- {serialized['pr_title']}\n"
        f"- **Reviewed at:** {created}\n"
        f"- **Review id:** {serialized['id']}\n\n"
        f"---\n\n"
    )

    filename = (
        f"review-{serialized['repo_name'].replace('/', '_')}"
        f"-pr{serialized['pr_number']}-id{serialized['id']}.md"
    )
    return PlainTextResponse(
        content=header + body + "\n",
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregate dashboard stats for the Stats component."""
    reviews = (
        db.query(Review)
        .filter(Review.user_id == current_user.id)
        .all()
    )

    total = len(reviews)
    if total == 0:
        return {
            "total_reviews": 0,
            "average_score": 0,
            "total_bugs": 0,
            "total_security_issues": 0,
        }

    total_bugs = sum(_count_issues(r.bugs_found) for r in reviews)
    total_security = sum(_count_issues(r.security_issues) for r in reviews)
    avg_score = round(
        sum(r.overall_score or 0 for r in reviews) / total,
        2,
    )

    return {
        "total_reviews": total,
        "average_score": avg_score,
        "total_bugs": total_bugs,
        "total_security_issues": total_security,
    }


@router.get("/usage/monthly")
async def monthly_usage(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return how many reviews the user has processed this calendar month."""
    now = datetime.now(timezone.utc)
    count = (
        db.query(Review)
        .filter(
            Review.user_id == current_user.id,
            extract("year", Review.created_at) == now.year,
            extract("month", Review.created_at) == now.month,
        )
        .count()
    )
    return {
        "year": now.year,
        "month": now.month,
        "reviews_this_month": count,
    }
