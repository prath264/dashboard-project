
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.cartridge_request import (
    CartridgeRequestCreate,
    CartridgeRequestResponse,
)
from app.schemas.common import ApiResponse
from app.services.cartridge_request import (
    approve_cartridge_request,
    create_cartridge_request,
    get_cartridge_request,
    list_cartridge_requests,
    reject_cartridge_request,
)


router = APIRouter()


class RejectRequestBody(BaseModel):
    rejection_reason: str


@router.get(
    "",
    response_model=ApiResponse[
        list[CartridgeRequestResponse]
    ],
)
async def get_requests(
    status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.fms_it,
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    requests = await list_cartridge_requests(
        db,
        status=status,
    )

    return ApiResponse(
        data=requests
    )


@router.get(
    "/{request_id}",
    response_model=ApiResponse[
        CartridgeRequestResponse
    ],
)
async def get_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.fms_it,
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    request = await get_cartridge_request(
        db,
        request_id,
    )

    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cartridge request not found.",
        )

    return ApiResponse(
        data=request
    )


@router.post(
    "",
    response_model=ApiResponse[
        CartridgeRequestResponse
    ],
    status_code=status.HTTP_201_CREATED,
)
async def create_request(
    payload: CartridgeRequestCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.fms_it,
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    request = await create_cartridge_request(
        db,
        payload,
    )

    await db.commit()

    return ApiResponse(
        data=request
    )


@router.post(
    "/{request_id}/approve",
    response_model=ApiResponse[
        CartridgeRequestResponse
    ],
)
async def approve_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    try:
        request = await approve_cartridge_request(
            db,
            request_id,
            current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cartridge request not found.",
        )

    await db.commit()

    return ApiResponse(
        data=request
    )


@router.post(
    "/{request_id}/reject",
    response_model=ApiResponse[
        CartridgeRequestResponse
    ],
)
async def reject_request(
    request_id: int,
    payload: RejectRequestBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    if not payload.rejection_reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rejection reason is required.",
        )

    try:
        request = await reject_cartridge_request(
            db,
            request_id,
            payload.rejection_reason.strip(),
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cartridge request not found.",
        )

    await db.commit()

    return ApiResponse(
        data=request
    )

