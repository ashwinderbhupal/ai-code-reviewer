"""
Thin async wrapper around the GitHub REST API.

We only need two things from GitHub:
  1. The raw unified diff of a pull request, which we feed to the LLM.
  2. The ability to post a comment back on the PR with the AI's review.
"""

import httpx

GITHUB_API = "https://api.github.com"


def _headers(token: str | None, accept: str = "application/vnd.github+json") -> dict:
    """Build standard headers; the diff endpoint needs a different Accept value."""
    headers = {
        "Accept": accept,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "ai-code-reviewer",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


async def get_pr_diff(repo: str, pr_number: int, token: str | None = None) -> str:
    """
    Fetch the unified diff for a pull request.

    `repo` must be in "owner/name" form. Returns the raw diff text or an
    empty string if the call fails so the caller can continue gracefully.
    """
    url = f"{GITHUB_API}/repos/{repo}/pulls/{pr_number}"
    headers = _headers(token, accept="application/vnd.github.v3.diff")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            return response.text
    except httpx.HTTPError as exc:
        print(f"[github_service] Failed to fetch diff for {repo}#{pr_number}: {exc}")
        return ""


async def post_pr_comment(
    repo: str,
    pr_number: int,
    token: str,
    comment: str,
) -> bool:
    """
    Post an issue comment back on a pull request.

    Returns True on success, False on failure. GitHub treats PRs as
    issues for the comment endpoint, hence the /issues/ path.
    """
    url = f"{GITHUB_API}/repos/{repo}/issues/{pr_number}/comments"
    headers = _headers(token)
    payload = {"body": comment}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return True
    except httpx.HTTPError as exc:
        print(f"[github_service] Failed to post comment on {repo}#{pr_number}: {exc}")
        return False


async def exchange_code_for_token(
    client_id: str,
    client_secret: str,
    code: str,
) -> str | None:
    """Exchange a GitHub OAuth `code` for an access token."""
    url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, data=payload)
            response.raise_for_status()
            return response.json().get("access_token")
    except httpx.HTTPError as exc:
        print(f"[github_service] OAuth token exchange failed: {exc}")
        return None


async def fetch_github_user(access_token: str) -> dict | None:
    """Fetch the authenticated GitHub user's profile."""
    url = f"{GITHUB_API}/user"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=_headers(access_token))
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        print(f"[github_service] Failed to fetch user profile: {exc}")
        return None
