"""
JWT helpers shared between the auth and reviews routes.

We issue a short-lived JWT after a successful GitHub OAuth flow and
verify it on every protected request. The current_user dependency
resolves the JWT to a `User` row.
"""

import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models import User

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "dev-insecure-jwt-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_HOURS = 24 * 7  # one week


def create_access_token(user: User) -> str:
    """Issue a signed JWT carrying the user id and GitHub username."""
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRES_HOURS)
    payload = {
        "sub": str(user.id),
        "username": user.username,
        "github_id": user.github_id,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode a JWT or raise 401."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
        ) from exc


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency that returns the User behind the Bearer token."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header.",
        )

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token does not identify a user.",
        )

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )
    return user
