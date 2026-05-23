"""
GitHub webhook receiver.

Configure your GitHub App / repo webhook to POST PR events to
``/webhook``. When a PR is opened, reopened, or synchronized we:

  1. Verify the X-Hub-Signature-256 HMAC if a secret is set.
  2. Enforce a per-repo rate limit so a runaway webhook can't burn
     through Groq quota.
  3. Validate the payload, then pull the PR diff from the GitHub API.
  4. Skip drafts and oversized diffs early.
  5. Send the diff to the Groq LLM for a structured review.
  6. Persist the review row (associated with the PR author if we have
     seen them log in before).
  7. Optionally post the review back as a PR comment.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db
from github_service import get_pr_diff, post_pr_comment
from llm_service import analyze_code, format_review_comment
from models import Review, User
from rate_limit import webhook_limiter

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(tags=["webhook"])

GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")

# Only these PR actions are worth re-running the LLM on.
INTERESTING_ACTIONS = {"opened", "reopened", "synchronize", "ready_for_review"}

# PRs above this many characters are skipped to keep costs and latency sane.
MAX_DIFF_SIZE_CHARS = 10_000


def _verify_signature(secret: str, signature_header: str | None, body: bytes) -> bool:
    """Validate the HMAC-SHA256 signature GitHub sends in X-Hub-Signature-256."""
    if not secret:
        # No secret configured -> skip verification (dev-friendly).
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False

    expected = signature_header.split("=", 1)[1]
    mac = hmac.new(secret.encode(), msg=body, digestmod=hashlib.sha256)
    return hmac.compare_digest(mac.hexdigest(), expected)


def _validate_payload(payload: dict) -> tuple[str, int, dict, dict]:
    """
    Pull the fields we need out of the webhook payload and raise 400 if
    anything important is missing. Returns ``(repo_full_name, pr_number,
    pull_request_dict, repository_dict)``.
    """
    repo = payload.get("repository") or {}
    pr = payload.get("pull_request") or {}

    repo_full_name = repo.get("full_name")
    pr_number = pr.get("number")

    missing = [
        name
        for name, value in {
            "repository.full_name": repo_full_name,
            "pull_request.number": pr_number,
            "pull_request.html_url": pr.get("html_url"),
        }.items()
        if not value
    ]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Webhook payload missing required fields: {', '.join(missing)}",
        )

    return repo_full_name, int(pr_number), pr, repo


@router.post("/webhook")
async def github_webhook(
    request: Request,
    x_hub_signature_256: str | None = Header(default=None),
    x_github_event: str | None = Header(default=None),
    x_github_delivery: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    """Receive a GitHub webhook delivery and create a review row."""
    body_bytes = await request.body()

    if not _verify_signature(GITHUB_WEBHOOK_SECRET, x_hub_signature_256, body_bytes):
        logger.warning(
            "Webhook signature invalid (delivery=%s, event=%s).",
            x_github_delivery,
            x_github_event,
        )
        raise HTTPException(401, "Invalid webhook signature.")

    try:
        payload = await request.json()
    except ValueError as exc:
        logger.warning("Webhook body is not valid JSON: %s", exc)
        raise HTTPException(400, "Webhook body is not valid JSON.") from exc

    # GitHub sends a "ping" event when you first add the webhook --
    # acknowledge it so the GH UI shows a green check.
    if x_github_event == "ping":
        logger.info("Webhook ping received (delivery=%s).", x_github_delivery)
        return {"status": "pong"}

    if x_github_event != "pull_request":
        logger.info("Ignoring non-PR event '%s' (delivery=%s).", x_github_event, x_github_delivery)
        return {"status": "ignored", "reason": f"event={x_github_event}"}

    action = payload.get("action")
    if action not in INTERESTING_ACTIONS:
        logger.info(
            "Ignoring PR action '%s' (delivery=%s).", action, x_github_delivery
        )
        return {"status": "ignored", "reason": f"action={action}"}

    repo_full_name, pr_number, pr, repo = _validate_payload(payload)
    pr_title = pr.get("title", "Untitled PR")
    pr_url = pr.get("html_url", "")
    author_login = (pr.get("user") or {}).get("login")
    author_github_id = (pr.get("user") or {}).get("id")
    is_draft = bool(pr.get("draft", False))

    logger.info(
        "Webhook received | repo=%s pr=#%d action=%s author=%s draft=%s delivery=%s",
        repo_full_name,
        pr_number,
        action,
        author_login,
        is_draft,
        x_github_delivery,
    )

    # --- Rate limit per repo ------------------------------------------------
    allowed, retry_after = webhook_limiter.check(repo_full_name)
    if not allowed:
        logger.warning(
            "Rate limit hit for %s -- retry after %d seconds.",
            repo_full_name,
            retry_after,
        )
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "status": "rate_limited",
                "detail": (
                    f"Too many webhook deliveries for {repo_full_name}. "
                    f"Try again in {retry_after}s."
                ),
                "retry_after": retry_after,
            },
            headers={"Retry-After": str(retry_after)},
        )

    # --- Draft PRs are skipped --------------------------------------------
    if is_draft:
        logger.info(
            "Skipping draft PR %s#%d (delivery=%s).",
            repo_full_name,
            pr_number,
            x_github_delivery,
        )
        return {
            "status": "skipped",
            "reason": "draft",
            "repo": repo_full_name,
            "pr_number": pr_number,
        }

    # --- Try to attribute the review to a known user ----------------------
    user = None
    if author_github_id is not None:
        user = (
            db.query(User)
            .filter(User.github_id == str(author_github_id))
            .first()
        )
    token = user.access_token if user else None

    # --- Pull the diff ----------------------------------------------------
    diff = await get_pr_diff(repo_full_name, pr_number, token=token)
    diff = diff or ""

    if not diff.strip():
        logger.info(
            "Empty diff for %s#%d -- nothing to review.", repo_full_name, pr_number
        )
        return {
            "status": "skipped",
            "reason": "empty_diff",
            "repo": repo_full_name,
            "pr_number": pr_number,
        }

    if len(diff) > MAX_DIFF_SIZE_CHARS:
        logger.info(
            "Diff for %s#%d is %d chars -- exceeds %d, skipping.",
            repo_full_name,
            pr_number,
            len(diff),
            MAX_DIFF_SIZE_CHARS,
        )
        return {
            "status": "skipped",
            "reason": "diff_too_large",
            "repo": repo_full_name,
            "pr_number": pr_number,
            "diff_chars": len(diff),
            "limit_chars": MAX_DIFF_SIZE_CHARS,
            "message": "PR too large for automated review.",
        }

    # --- Run the LLM ------------------------------------------------------
    try:
        review_data = await analyze_code(diff)
    except Exception:  # noqa: BLE001 -- already retried inside analyze_code, but be safe
        logger.exception("Unexpected failure inside analyze_code().")
        raise HTTPException(500, "AI review failed unexpectedly.")

    review = Review(
        user_id=user.id if user else None,
        repo_name=repo_full_name,
        pr_number=pr_number,
        pr_title=pr_title,
        pr_url=pr_url,
        diff_summary=review_data.get("summary", ""),
        bugs_found=review_data.get("bugs", []),
        security_issues=review_data.get("security_issues", []),
        performance_issues=review_data.get("performance_issues", []),
        code_quality_issues=review_data.get("code_quality_issues", []),
        suggestions=review_data.get("suggestions", []),
        overall_score=review_data.get("overall_score", 5),
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    logger.info(
        "Review persisted | id=%d repo=%s pr=#%d score=%d",
        review.id,
        repo_full_name,
        pr_number,
        review.overall_score,
    )

    # --- Fire-and-forget the GitHub comment -------------------------------
    if token:
        comment = format_review_comment(review_data, repo_full_name, pr_number)
        try:
            await post_pr_comment(repo_full_name, pr_number, token, comment)
            logger.info("Posted review comment on %s#%d.", repo_full_name, pr_number)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "Could not post PR comment on %s#%d: %s",
                repo_full_name,
                pr_number,
                exc,
            )

    return {
        "status": "ok",
        "review_id": review.id,
        "repo": repo_full_name,
        "pr_number": pr_number,
        "author": author_login,
        "review": review_data,
    }
