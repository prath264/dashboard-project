
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse
from app.schemas.location import (
    LocationCreate,
    LocationResponse,
    LocationUpdate,
)
from app.services.location_service import (
    create_location,
    list_locations,
    list_locations_with_counts,
    update_location,
)


router = APIRouter()


@router.get(
    "",
    response_model=ApiResponse[list[LocationResponse]],
)
async def get_locations(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    """
    Admin management endpoint.

    Returns all locations, including inactive locations,
    with printer counts.
    """
    locations = await list_locations_with_counts(db)

    return ApiResponse(
        data=[
            LocationResponse(**location)
            for location in locations
        ]
    )


@router.get(
    "/active",
    response_model=ApiResponse[list[LocationResponse]],
)
async def get_active_locations(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    """
    Returns active locations only.

    Used by forms and dropdowns.
    """
    locations = await list_locations(db)

    return ApiResponse(
        data=[
            LocationResponse(
                id=location.id,
                name=location.name,
                is_active=location.is_active,
                created_at=location.created_at,
                printer_count=0,
            )
            for location in locations
        ]
    )


@router.post(
    "",
    response_model=ApiResponse[LocationResponse],
    status_code=status.HTTP_201_CREATED,
)
async def add_location(
    payload: LocationCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    location = await create_location(
        db,
        payload,
    )

    await db.commit()

    return ApiResponse(
        data=LocationResponse(
            id=location.id,
            name=location.name,
            is_active=location.is_active,
            created_at=location.created_at,
            printer_count=0,
        )
    )


@router.patch(
    "/{location_id}",
    response_model=ApiResponse[LocationResponse],
)
async def edit_location(
    location_id: int,
    payload: LocationUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    location = await update_location(
        db,
        location_id,
        payload,
    )

    if location is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found.",
        )

    await db.commit()

    return ApiResponse(
        data=LocationResponse(
            id=location.id,
            name=location.name,
            is_active=location.is_active,
            created_at=location.created_at,
            printer_count=0,
        )
    )

