"""
LLM-powered code review using the Groq API.

The model is asked to act as a senior reviewer and emit a strict JSON
object. We parse that JSON, normalize it, and return a Python dict.
The dict has a deterministic shape so the rest of the pipeline (and
the frontend) can trust the keys are always present.

Key features:

* Detailed system prompt covering bugs, security, performance, and the
  broader code-quality dimensions (complexity, duplication, error
  handling, naming, documentation, memory).
* Every issue carries a ``severity`` (CRITICAL/HIGH/MEDIUM/LOW) and a
  ``confidence`` percentage (0-100).
* Bounded retry loop around the Groq call with a fixed 2 second delay.
* Graceful fallback object that is always returned even if every retry
  fails, so the webhook handler can persist *something*.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from typing import Any, Iterable

from dotenv import load_dotenv
from groq import AsyncGroq

load_dotenv()

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = "llama-3.3-70b-versatile"

# Hard cap on diff size to keep us comfortably under the model's
# context window and avoid huge token bills on giant PRs.
MAX_DIFF_CHARS = 4000

# Retry policy for transient Groq failures (timeouts, 5xx, rate limits).
MAX_ATTEMPTS = 3
RETRY_DELAY_SECONDS = 2.0

# Issue category keys persisted on the Review row.
ISSUE_CATEGORIES: tuple[str, ...] = (
    "bugs",
    "security_issues",
    "performance_issues",
    "code_quality_issues",
    "suggestions",
)

VALID_SEVERITIES: frozenset[str] = frozenset({"CRITICAL", "HIGH", "MEDIUM", "LOW"})

SYSTEM_PROMPT = """You are a principal software engineer doing a deep code review.

You receive a unified diff (a `git diff` patch) and must respond with a
single JSON object. NO prose. NO markdown fences. Output JSON only.

Analyze the diff across these dimensions:

1. **Bugs**            -- logic errors, off-by-one, null/undefined access,
                          unhandled edge cases, race conditions.
2. **Security**        -- injection, secrets in code, missing auth/validation,
                          unsafe deserialization, OWASP-style risks.
3. **Performance**     -- N+1 queries, hot-loop allocations, missing async,
                          quadratic algorithms, blocking I/O.
4. **Code quality**    -- this single bucket covers:
   - cyclomatic complexity (functions doing too much)
   - code duplication (copy-pasted blocks)
   - error handling (bare except, swallowed errors, missing rollback)
   - variable naming (single letters, ambiguous, inconsistent)
   - missing docstrings / comments where intent is non-obvious
   - potential memory leaks (unclosed handles, growing caches, listeners)
5. **Suggestions**     -- stylistic or architectural improvements that
                          are nice-to-have but not strictly issues.

For every finding emit an object of the form:

    {
      "description": "Short one or two sentence explanation of the issue.",
      "severity":    "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
      "confidence":  0..100
    }

Severity rubric:
  * CRITICAL -- ship-blocker; would break prod, leak data, or corrupt state.
  * HIGH     -- almost certainly a real bug or a serious risk.
  * MEDIUM   -- likely problem worth a follow-up.
  * LOW      -- minor smell or polish suggestion.

Confidence is your subjective certainty that the finding is real (0 =
wild guess, 100 = mathematically certain). Be honest -- if you only
see part of the function in the diff, lower your confidence.

The full required JSON shape is:

{
  "bugs":                 [ {description, severity, confidence}, ... ],
  "security_issues":      [ {description, severity, confidence}, ... ],
  "performance_issues":   [ {description, severity, confidence}, ... ],
  "code_quality_issues":  [ {description, severity, confidence}, ... ],
  "suggestions":          [ {description, severity, confidence}, ... ],
  "overall_score":        <integer 1..10>,
  "summary":              "<two to four sentence summary of the diff>"
}

If a category has no findings, return an empty array. The overall_score
is your holistic 1-10 PR quality assessment (10 = excellent, 1 = burn it).
"""


def _empty_review(summary: str = "Could not analyze the diff.") -> dict[str, Any]:
    """Safe default object when anything goes wrong (no key, bad JSON, etc.)."""
    review: dict[str, Any] = {category: [] for category in ISSUE_CATEGORIES}
    review["overall_score"] = 5
    review["summary"] = summary
    return review


def _extract_json(text: str) -> dict[str, Any] | None:
    """
    Pull the first balanced JSON object out of ``text``.

    Llama models sometimes wrap JSON in ```json fences or add a leading
    sentence; this finds the outermost ``{ ... }`` block and parses it.
    """
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _coerce_issue(raw: Any) -> dict[str, Any] | None:
    """
    Normalize one finding into ``{description, severity, confidence}``.

    Accepts either a plain string (legacy / model regression) or a dict
    with any subset of the expected keys. Returns ``None`` if the value
    can't be interpreted as an issue at all.
    """
    if isinstance(raw, str):
        text = raw.strip()
        if not text:
            return None
        return {"description": text, "severity": "MEDIUM", "confidence": 60}

    if not isinstance(raw, dict):
        return None

    description = str(
        raw.get("description")
        or raw.get("issue")
        or raw.get("message")
        or ""
    ).strip()
    if not description:
        return None

    severity = str(raw.get("severity", "MEDIUM")).upper().strip()
    if severity not in VALID_SEVERITIES:
        severity = "MEDIUM"

    try:
        confidence = int(round(float(raw.get("confidence", 60))))
    except (TypeError, ValueError):
        confidence = 60
    confidence = max(0, min(100, confidence))

    return {
        "description": description,
        "severity": severity,
        "confidence": confidence,
    }


def _normalize(parsed: dict[str, Any]) -> dict[str, Any]:
    """Whitewash the LLM's response into our canonical shape."""
    normalized: dict[str, Any] = _empty_review(
        summary=str(parsed.get("summary") or "").strip()
        or "AI review completed."
    )

    for category in ISSUE_CATEGORIES:
        raw_list: Iterable[Any] = parsed.get(category) or []
        if not isinstance(raw_list, list):
            raw_list = []
        cleaned = []
        for raw in raw_list:
            issue = _coerce_issue(raw)
            if issue is not None:
                cleaned.append(issue)
        normalized[category] = cleaned

    try:
        score = int(parsed.get("overall_score", 5))
    except (TypeError, ValueError):
        score = 5
    normalized["overall_score"] = max(1, min(10, score))

    return normalized


async def _call_groq_once(diff: str) -> str:
    """Single (non-retrying) call to the Groq chat-completions endpoint."""
    user_prompt = (
        "Review the following unified diff and respond with the JSON "
        "structure described in the system prompt. Output JSON only.\n\n"
        f"```diff\n{diff}\n```"
    )

    client = AsyncGroq(api_key=GROQ_API_KEY)
    completion = await client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=1536,
        response_format={"type": "json_object"},
    )
    return completion.choices[0].message.content or ""


async def analyze_code(diff: str) -> dict[str, Any]:
    """
    Run the Groq LLM on a diff and return a structured review dict.

    Always returns a dict with the canonical shape -- the caller can
    persist it as-is. Retries transient failures up to ``MAX_ATTEMPTS``
    times with ``RETRY_DELAY_SECONDS`` between attempts and logs each
    attempt.
    """
    if not diff or not diff.strip():
        logger.info("LLM skipped: empty diff.")
        return _empty_review("Empty diff; nothing to review.")

    if not GROQ_API_KEY:
        logger.error("GROQ_API_KEY is not configured; returning empty review.")
        return _empty_review("GROQ_API_KEY is not configured on the server.")

    truncated_diff = diff[:MAX_DIFF_CHARS]
    if len(diff) > MAX_DIFF_CHARS:
        truncated_diff += "\n\n... [diff truncated for length] ..."

    last_error: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        started = time.perf_counter()
        try:
            raw = await _call_groq_once(truncated_diff)
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            logger.info(
                "Groq call ok (attempt %d/%d, %d ms, model=%s)",
                attempt,
                MAX_ATTEMPTS,
                elapsed_ms,
                GROQ_MODEL,
            )
            parsed = _extract_json(raw)
            if parsed is None:
                logger.warning(
                    "Groq attempt %d returned non-JSON output; retrying if attempts left.",
                    attempt,
                )
                last_error = ValueError("LLM returned non-JSON output.")
                if attempt < MAX_ATTEMPTS:
                    await asyncio.sleep(RETRY_DELAY_SECONDS)
                    continue
                return _empty_review("LLM returned non-JSON output.")
            return _normalize(parsed)

        except Exception as exc:  # noqa: BLE001 -- want to retry any SDK/network error
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            last_error = exc
            logger.warning(
                "Groq call FAILED (attempt %d/%d, %d ms): %s",
                attempt,
                MAX_ATTEMPTS,
                elapsed_ms,
                exc,
            )
            if attempt < MAX_ATTEMPTS:
                await asyncio.sleep(RETRY_DELAY_SECONDS)

    logger.error("Groq call failed after %d attempts: %s", MAX_ATTEMPTS, last_error)
    return _empty_review(
        f"AI review unavailable: {last_error}. Please retry the webhook later."
    )


# ---------------------------------------------------------------------------
# Helpers shared with the webhook + reviews routes
# ---------------------------------------------------------------------------


def _bullets(items: list[dict[str, Any]]) -> str:
    """Render a list of issue dicts as a markdown bullet list."""
    if not items:
        return "_None_"
    lines = []
    for issue in items:
        sev = issue.get("severity", "MEDIUM")
        conf = issue.get("confidence", 60)
        desc = issue.get("description", "")
        lines.append(f"- **[{sev} | {conf}%]** {desc}")
    return "\n".join(lines)


def format_review_comment(
    review: dict[str, Any],
    repo: str,
    pr_number: int,
) -> str:
    """Render a review dict as a Markdown comment to post back on GitHub."""
    score = review.get("overall_score", 5)
    summary = review.get("summary", "")

    return (
        f"## AI Code Review for `{repo}#{pr_number}`\n\n"
        f"**Overall score:** {score}/10\n\n"
        f"{summary}\n\n"
        f"### Bugs\n{_bullets(review.get('bugs', []))}\n\n"
        f"### Security Issues\n{_bullets(review.get('security_issues', []))}\n\n"
        f"### Performance\n{_bullets(review.get('performance_issues', []))}\n\n"
        f"### Code Quality\n{_bullets(review.get('code_quality_issues', []))}\n\n"
        f"### Suggestions\n{_bullets(review.get('suggestions', []))}\n\n"
        "_Generated automatically by the AI Code Reviewer._"
    )


async def ping_groq(timeout_seconds: float = 3.0) -> dict[str, Any]:
    """
    Lightweight health-check for the Groq dependency.

    Returns a dict so /health can include the status verbatim. We try
    to list models (cheap, doesn't consume LLM tokens) and report what
    we saw.
    """
    if not GROQ_API_KEY:
        return {"status": "unconfigured", "detail": "GROQ_API_KEY is not set."}
    try:
        client = AsyncGroq(api_key=GROQ_API_KEY)
        # Groq's models endpoint is a tiny GET; wrap it in a timeout
        # so a hung network doesn't tank our /health endpoint.
        await asyncio.wait_for(client.models.list(), timeout=timeout_seconds)
        return {"status": "ok", "model": GROQ_MODEL}
    except asyncio.TimeoutError:
        return {"status": "timeout", "detail": f"Groq did not respond in {timeout_seconds}s."}
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "detail": str(exc)}
