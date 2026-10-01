from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import utcnow
from app.core.security import (
    create_access_token,
    create_refresh_token,
    safe_decode_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import AuthResponse, TokenPair
from app.schemas.user import UserRead
from app.services.user_service import UserService


class AuthService:

    @staticmethod
    async def _issue_tokens(
        db: AsyncSession,
        user: User,
    ) -> TokenPair:

        access_token = create_access_token(
            str(user.id),
            extra_claims={
                "role": user.role.value,
            },
        )

        refresh_token, jti, expires_at = create_refresh_token(
            str(user.id)
        )

        db.add(
            RefreshToken(
                user_id=user.id,
                jti=jti,
                expires_at=expires_at,
            )
        )

        await db.flush()

        return TokenPair(
            access_token=access_token,
            refresh_token=refresh_token,
        )

    @staticmethod
    async def login(
        db: AsyncSession,
        email: str,
        password: str,
    ) -> AuthResponse:

        user = await UserService.get_by_email(
            db,
            email,
        )

        if user is None or not verify_password(
            password,
            user.password_hash,
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive",
            )

        tokens = await AuthService._issue_tokens(
            db,
            user,
        )

        return AuthResponse(
            tokens=tokens,
            user=UserRead.model_validate(user),
        )

    @staticmethod
    async def refresh(
        db: AsyncSession,
        refresh_token: str,
    ) -> TokenPair:

        payload = safe_decode_token(
            refresh_token
        )

        if (
            payload is None
            or payload.get("type") != "refresh"
        ):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        jti = payload.get("jti")
        sub = payload.get("sub")

        if not jti or not sub:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

        result = await db.execute(
            select(RefreshToken).where(
                RefreshToken.jti == jti,
                RefreshToken.user_id == int(sub),
            )
        )

        stored = result.scalar_one_or_none()

        if stored is None or stored.expires_at < utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token expired or revoked",
            )

        user = await UserService.get_by_id(
            db,
            int(sub),
        )

        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )

        await db.execute(
            delete(RefreshToken).where(
                RefreshToken.id == stored.id
            )
        )

        return await AuthService._issue_tokens(
            db,
            user,
        )

    @staticmethod
    async def logout(
        db: AsyncSession,
        refresh_token: str,
    ) -> None:

        payload = safe_decode_token(
            refresh_token
        )

        if payload is None:
            return

        jti = payload.get("jti")

        if not jti:
            return

        await db.execute(
            delete(RefreshToken).where(
                RefreshToken.jti == jti
            )
        )