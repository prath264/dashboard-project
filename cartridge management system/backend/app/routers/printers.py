from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse
from app.schemas.printer import (
    PrinterCreate,
    PrinterResponse,
    PrinterUpdate,
)
from app.services.printer_service import (
    create_printer,
    list_all_printers,
    list_printers,
    update_printer,
)


router = APIRouter()


@router.get(
    "",
    response_model=ApiResponse[list[PrinterResponse]],
)
async def get_printers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.fms_it,
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    printers = await list_printers(db)

    return ApiResponse(
        data=[
            PrinterResponse.model_validate(
                printer
            )
            for printer in printers
        ]
    )


@router.get(
    "/all",
    response_model=ApiResponse[list[PrinterResponse]],
)
async def get_all_printers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    printers = await list_all_printers(db)

    return ApiResponse(
        data=[
            PrinterResponse.model_validate(
                printer
            )
            for printer in printers
        ]
    )


@router.post(
    "",
    response_model=ApiResponse[PrinterResponse],
    status_code=status.HTTP_201_CREATED,
)
async def add_printer(
    payload: PrinterCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    try:
        printer = await create_printer(
            db,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return ApiResponse(
        data=PrinterResponse.model_validate(
            printer
        )
    )


@router.patch(
    "/{printer_id}",
    response_model=ApiResponse[PrinterResponse],
)
async def update_printer_status(
    printer_id: int,
    payload: PrinterUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    printer = await update_printer(
        db,
        printer_id,
        payload,
    )

    if printer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Printer not found.",
        )

    await db.commit()

    return ApiResponse(
        data=PrinterResponse.model_validate(
            printer
        )
    )