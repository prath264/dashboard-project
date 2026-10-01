from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse
from app.schemas.inventory import (
    InventoryCartridgeResponse,
    InventoryPrinterResponse,
)
from app.services.inventory_service import (
    adjust_inventory,
    get_inventory,
    get_printer_inventory,
)


router = APIRouter()


class InventoryAdjustRequest(BaseModel):
    new_quantity: int
    reason: str


@router.get(
    "",
    response_model=ApiResponse[
        list[InventoryCartridgeResponse]
    ],
)
async def inventory(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):

    data = await get_inventory(db)

    return ApiResponse(data=data)


@router.get(
    "/printers",
    response_model=ApiResponse[
        list[InventoryPrinterResponse]
    ],
)
async def printer_inventory(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):

    data = await get_printer_inventory(db)

    return ApiResponse(data=data)


@router.post(
    "/{cartridge_id}/adjust",
    response_model=ApiResponse[dict],
)
async def adjust_cartridge_inventory(
    cartridge_id: int,
    payload: InventoryAdjustRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    try:
        result = await adjust_inventory(
            db,
            cartridge_id,
            payload.new_quantity,
            current_user.id,
            payload.reason,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return ApiResponse(data=result)