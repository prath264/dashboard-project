from fastapi import APIRouter, Depends, HTTPException, Query, status

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse, Meta
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.services.user_service import UserService


router = APIRouter()


@router.get(
    "/me",
    response_model=ApiResponse[UserRead],
)
async def read_current_user(
    current_user: User = Depends(get_current_user),
) -> ApiResponse[UserRead]:

    return ApiResponse(
        data=UserRead.model_validate(current_user)
    )


@router.get(
    "",
    response_model=ApiResponse[list[UserRead]],
)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: UserRole | None = None,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(UserRole.master_admin)
    ),
) -> ApiResponse[list[UserRead]]:

    users, total = await UserService.list_users(
        db,
        page=page,
        page_size=page_size,
        role=role,
        is_active=is_active,
    )

    return ApiResponse(
        data=[
            UserRead.model_validate(user)
            for user in users
        ],
        meta=Meta(
            page=page,
            page_size=page_size,
            total=total,
        ),
    )


@router.post(
    "",
    response_model=ApiResponse[UserRead],
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(UserRole.master_admin)
    ),
) -> ApiResponse[UserRead]:

    try:
        user = await UserService.create_user(
            db,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return ApiResponse(
        data=UserRead.model_validate(user)
    )


@router.patch(
    "/{user_id}",
    response_model=ApiResponse[UserRead],
)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.master_admin)
    ),
) -> ApiResponse[UserRead]:

    user = await UserService.get_by_id(
        db,
        user_id,
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if (
        user.id == current_user.id
        and payload.is_active is False
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account",
        )

    user = await UserService.update_user(
        db,
        user,
        payload,
    )

    return ApiResponse(
        data=UserRead.model_validate(user)
    )