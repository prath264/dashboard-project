from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse
from app.schemas.printer_assignment import (
    PrinterAssignmentCreate,
    PrinterAssignmentResponse,
)
from app.schemas.printer_assignment_auto_fill import PrinterAssignmentAutoFill
from app.services.printer_assignment_service import (
    create_assignment,
    get_auto_fill_for_user,
    list_active_assignments,
    unassign,
)


router = APIRouter()
admin = require_roles(UserRole.it_admin, UserRole.master_admin)


@router.get("", response_model=ApiResponse[list[PrinterAssignmentResponse]])
async def get_assignments(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(admin),
):
    assignments = await list_active_assignments(db)
    return ApiResponse(data=[PrinterAssignmentResponse(**item) for item in assignments])


@router.post(
    "",
    response_model=ApiResponse[PrinterAssignmentResponse],
    status_code=status.HTTP_201_CREATED,
)
async def add_assignment(
    payload: PrinterAssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin),
):
    assignment = await create_assignment(db, payload, current_user.id)
    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active user or printer not found.",
        )
    await db.commit()
    return ApiResponse(data=PrinterAssignmentResponse(**assignment))


@router.post("/{assignment_id}/unassign", response_model=ApiResponse[dict])
async def remove_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(admin),
):
    if not await unassign(db, assignment_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Printer assignment not found.",
        )
    await db.commit()
    return ApiResponse(data={"message": "Printer unassigned successfully."})


@router.get(
    "/for-user/{user_id}",
    response_model=ApiResponse[PrinterAssignmentAutoFill | None],
)
async def get_user_auto_fill(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return ApiResponse(data=await get_auto_fill_for_user(db, user_id))
