from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from jose import JWTError, jwt
from pwdlib import PasswordHash

from app.core.config import get_settings


password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return password_hash.verify(
        plain_password,
        hashed_password,
    )


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    settings = get_settings()

    expire = _utcnow() + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload: dict[str, Any] = {
        "sub": subject,
        "exp": int(expire.timestamp()),
        "type": "access",
    }

    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def create_refresh_token(
    subject: str,
) -> tuple[str, str, datetime]:
    settings = get_settings()

    jti = str(uuid4())

    expire = _utcnow() + timedelta(
        days=settings.refresh_token_expire_days
    )

    payload = {
        "sub": subject,
        "exp": int(expire.timestamp()),
        "type": "refresh",
        "jti": jti,
    }

    token = jwt.encode(
        payload,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )

    return token, jti, expire


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()

    print("JWT ALGORITHM:", settings.jwt_algorithm)
    print("JWT SECRET LENGTH:", len(settings.jwt_secret_key))

    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
    )


def safe_decode_token(
    token: str,
) -> dict[str, Any] | None:
    try:
        return decode_token(token)
    except JWTError:
        return None