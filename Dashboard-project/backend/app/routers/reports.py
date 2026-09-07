from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse
from app.services.reports_service import get_reports_data


router = APIRouter()


@router.get(
    "",
    response_model=ApiResponse[dict],
)
async def get_reports(
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
    data = await get_reports_data(
        db,
        start_date=start_date,
        end_date=end_date,
    )

    return ApiResponse(data=data)