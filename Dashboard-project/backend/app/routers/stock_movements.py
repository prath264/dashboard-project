from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse, Meta
from app.services.stock_movement import (
    get_stock_movement_summary,
    list_stock_movements,
)


router = APIRouter()


@router.get(
    "",
    response_model=ApiResponse[list[dict]],
)
async def get_stock_movements(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    movement_type: str | None = Query(default=None),
    cartridge_id: int | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    movements, total = await list_stock_movements(
        db,
        page=page,
        page_size=page_size,
        movement_type=movement_type,
        cartridge_id=cartridge_id,
        start_date=start_date,
        end_date=end_date,
    )

    return ApiResponse(
        data=movements,
        meta=Meta(page=page, page_size=page_size, total=total),
    )


@router.get(
    "/summary",
    response_model=ApiResponse[dict],
)
async def get_stock_movements_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    summary = await get_stock_movement_summary(db)
    return ApiResponse(data=summary)