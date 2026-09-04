from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.common import ApiResponse
from app.services.dashboard_service import (
    get_cartridge_quantities,
    get_dashboard_summary,
    get_inventory_details,
    get_monthly_issues,
    get_monthly_issues_list,
    get_recent_activity,
)


router = APIRouter()


@router.get(
    "/summary",
    response_model=ApiResponse[dict],
)
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = await get_dashboard_summary(db)

    return ApiResponse(data=data)


@router.get(
    "/cartridge-quantities",
    response_model=ApiResponse[list[dict]],
)
async def cartridge_quantities(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = await get_cartridge_quantities(db)

    return ApiResponse(data=data)


@router.get(
    "/monthly-issues",
    response_model=ApiResponse[list[dict]],
)
async def monthly_issues(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = await get_monthly_issues(db)

    return ApiResponse(data=data)


@router.get(
    "/recent-activity",
    response_model=ApiResponse[list[dict]],
)
async def recent_activity(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = await get_recent_activity(db)

    return ApiResponse(data=data)


@router.get(
    "/inventory-details",
    response_model=ApiResponse[list[dict]],
)
async def inventory_details(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = await get_inventory_details(db)

    return ApiResponse(data=data)


@router.get(
    "/monthly-issues-list",
    response_model=ApiResponse[list[dict]],
)
async def monthly_issues_list(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = await get_monthly_issues_list(db)

    return ApiResponse(data=data)