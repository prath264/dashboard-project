from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse
from app.schemas.engineer import EngineerCreate, EngineerResponse
from app.services.engineer_service import (
    create_engineer,
    get_engineer,
    list_engineers,
    update_engineer,
)

router = APIRouter()


@router.get(
    "",
    response_model=ApiResponse[list[EngineerResponse]],
)
async def get_engineers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.fms_it,
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    engineers = await list_engineers(db)

    return ApiResponse(
        data=[
            EngineerResponse.model_validate(engineer)
            for engineer in engineers
        ]
    )


@router.get(
    "/{engineer_id}",
    response_model=ApiResponse[EngineerResponse],
)
async def get_engineer_by_id(
    engineer_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.fms_it,
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    engineer = await get_engineer(db, engineer_id)

    if engineer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Engineer not found.",
        )

    return ApiResponse(
        data=EngineerResponse.model_validate(engineer)
    )


@router.post(
    "",
    response_model=ApiResponse[EngineerResponse],
    status_code=status.HTTP_201_CREATED,
)
async def add_engineer(
    payload: EngineerCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    try:
        engineer = await create_engineer(db, payload)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return ApiResponse(
        data=EngineerResponse.model_validate(engineer)
    )


@router.patch(
    "/{engineer_id}",
    response_model=ApiResponse[EngineerResponse],
)
async def edit_engineer(
    engineer_id: int,
    payload: EngineerCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    try:
        engineer = await update_engineer(
            db,
            engineer_id,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return ApiResponse(
        data=EngineerResponse.model_validate(engineer)
    )