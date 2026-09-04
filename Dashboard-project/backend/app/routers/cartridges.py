from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.cartridge import (
    CartridgeCreate,
    CartridgeResponse,
)
from app.schemas.common import ApiResponse
from app.services.cartridge_service import (
    create_or_receive_cartridge,
    list_cartridges,
)


router = APIRouter()


@router.get(
    "",
    response_model=ApiResponse[list[CartridgeResponse]],
)
async def get_cartridges(
    printer_id: int | None = Query(
        default=None
    ),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.fms_it,
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    cartridges = await list_cartridges(
        db,
        printer_id,
    )

    return ApiResponse(
        data=[
            CartridgeResponse.model_validate(
                cartridge
            )
            for cartridge in cartridges
        ]
    )


@router.post(
    "",
    response_model=ApiResponse[CartridgeResponse],
    status_code=status.HTTP_201_CREATED,
)
async def add_cartridge(
    payload: CartridgeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    try:
        cartridge = await create_or_receive_cartridge(
            db,
            payload,
            current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return ApiResponse(
        data=CartridgeResponse.model_validate(
            cartridge
        )
    )