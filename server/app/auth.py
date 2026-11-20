"""Authentication: JWT (HS256) + bcrypt password hashing.

The signing secret lives in the same ``server/data/auth-secret`` file the
Express backend used, so tokens issued before the migration stay valid.
"""

from __future__ import annotations

import os
import pathlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .db import DATA_DIR

JWT_ALGORITHM = "HS256"
JWT_EXPIRES = timedelta(days=7)

bearer_scheme = HTTPBearer(auto_error=False)


def _load_secret() -> str:
    env = os.environ.get("JWT_SECRET")
    if env:
        return env
    path = pathlib.Path(DATA_DIR) / "auth-secret"
    if not path.exists():
        try:
            path.write_text(secrets.token_hex(48))
            path.chmod(0o600)
        except FileExistsError:
            pass
    return path.read_text(encoding="utf-8").strip()


JWT_SECRET = _load_secret()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_token(user_id: int, username: str) -> str:
    payload = {
        "userId": int(user_id),
        "username": username,
        "exp": datetime.now(timezone.utc) + JWT_EXPIRES,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


class CurrentUser:
    __slots__ = ("id", "username")

    def __init__(self, id: int, username: str) -> None:
        self.id = id
        self.username = username


def current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> CurrentUser:
    if credentials is None:
        raise HTTPException(status_code=401, detail="未登录或登录已过期")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录") from None
    return CurrentUser(id=int(payload["userId"]), username=payload.get("username", ""))
