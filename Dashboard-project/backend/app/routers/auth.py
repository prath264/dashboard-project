from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.auth import AuthResponse, LoginRequest, MessageResponse, RefreshRequest
from app.schemas.common import ApiResponse
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/login", response_model=ApiResponse[AuthResponse])
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> ApiResponse[AuthResponse]:
    result = await AuthService.login(db, payload.email, payload.password)
    return ApiResponse(data=result)


@router.post("/refresh", response_model=ApiResponse[dict])
async def refresh_tokens(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[dict]:
    tokens = await AuthService.refresh(db, payload.refresh_token)
    return ApiResponse(data=tokens.model_dump())


@router.post("/logout", response_model=ApiResponse[MessageResponse])
async def logout(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> ApiResponse[MessageResponse]:
    await AuthService.logout(db, payload.refresh_token)
    return ApiResponse(data=MessageResponse(message="Logged out successfully"))
