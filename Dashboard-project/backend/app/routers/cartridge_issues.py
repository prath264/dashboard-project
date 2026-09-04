
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.cartridge_issue import (
    CartridgeIssueCreate,
    CartridgeIssueResponse,
)
from app.schemas.common import ApiResponse
from app.services.cartridge_issue import (
    create_cartridge_issue,
)


router = APIRouter()


@router.post(
    "/",
    response_model=ApiResponse[CartridgeIssueResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_issue(
    data: CartridgeIssueCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        issue = await create_cartridge_issue(
            session=session,
            data=data,
            performed_by=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return ApiResponse(
        data=CartridgeIssueResponse.model_validate(issue)
    )

