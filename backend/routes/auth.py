"""
GitHub OAuth routes.

Flow:
  1. Frontend hits GET /auth/github, which 302s the user to GitHub's
     authorize endpoint.
  2. GitHub redirects back to GET /auth/callback with a `code`.
  3. We exchange that code for an access token, upsert a User row, and
     redirect back to the frontend with a JWT in the query string.
  4. The frontend reads the JWT, stores it, and calls GET /auth/me to
     hydrate user info.
"""

import os
from urllib.parse import urlencode

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from auth_utils import create_access_token, get_current_user
from database import get_db
from github_service import exchange_code_for_token, fetch_github_user
from models import User

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# `read:user` is enough to greet the user; `repo` is needed if we want
# to post comments back on private repositories.
GITHUB_SCOPES = "read:user repo"


@router.get("/github")
async def github_login(request: Request):
    """Redirect the browser to GitHub's OAuth consent screen."""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(500, "GITHUB_CLIENT_ID is not configured.")

    redirect_uri = str(request.url_for("github_callback"))
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": GITHUB_SCOPES,
        "allow_signup": "true",
    }
    return RedirectResponse(
        url=f"https://github.com/login/oauth/authorize?{urlencode(params)}"
    )


@router.get("/callback", name="github_callback")
async def github_callback(code: str | None = None, db: Session = Depends(get_db)):
    """Exchange ?code= for a token, upsert the user, redirect to frontend."""
    if not code:
        raise HTTPException(400, "Missing ?code parameter from GitHub.")
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(500, "GitHub OAuth credentials are not configured.")

    access_token = await exchange_code_for_token(
        GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, code
    )
    if not access_token:
        raise HTTPException(400, "Could not exchange code for access token.")

    profile = await fetch_github_user(access_token)
    if not profile:
        raise HTTPException(400, "Could not fetch GitHub user profile.")

    github_id = str(profile["id"])
    user = db.query(User).filter(User.github_id == github_id).first()
    if user is None:
        user = User(
            github_id=github_id,
            username=profile.get("login", "unknown"),
            avatar_url=profile.get("avatar_url"),
            access_token=access_token,
        )
        db.add(user)
    else:
        # Refresh details in case the user changed username/avatar/scopes.
        user.username = profile.get("login", user.username)
        user.avatar_url = profile.get("avatar_url", user.avatar_url)
        user.access_token = access_token

    db.commit()
    db.refresh(user)

    jwt_token = create_access_token(user)
    return RedirectResponse(url=f"{FRONTEND_URL}/login?token={jwt_token}")


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user (used to hydrate the navbar)."""
    return {
        "id": current_user.id,
        "github_id": current_user.github_id,
        "username": current_user.username,
        "avatar_url": current_user.avatar_url,
        "created_at": current_user.created_at,
    }
