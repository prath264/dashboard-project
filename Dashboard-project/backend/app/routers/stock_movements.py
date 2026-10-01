from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse, Meta
from app.services.stock_movement import (
    get_stock_movement_summary,
    get_stock_movements_for_export,
    list_stock_movements,
)
from app.services.file_exports import make_excel, make_pdf


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
    search: str | None = Query(default=None),
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
        search=search,
    )

    return ApiResponse(
        data=movements,
        meta=Meta(page=page, page_size=page_size, total=total),
    )


@router.get(
    "/export",
)
async def export_stock_movements(
    export_format: str = Query(alias="format", pattern="^(excel|pdf)$"),
    movement_type: str | None = Query(default=None),
    cartridge_id: int | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
):
    movements = await get_stock_movements_for_export(
        db,
        movement_type=movement_type,
        cartridge_id=cartridge_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
    )
    summary = await get_stock_movement_summary(db)

    columns = [
        ("ID", "id"), ("Date/Time", "created_at"), ("Movement", "movement_type"),
        ("Cartridge", "cartridge_model"), ("Color", "cartridge_color"),
        ("Printer", "printer_model"), ("Employee", "employee_name"),
        ("Employee ID", "employee_id"), ("Location", "location_name"),
        ("Quantity", "quantity"), ("Performed By", "performed_by_name"),
        ("Reference", "reference_id"), ("Remarks", "remarks"),
    ]
    sections = [
        ("Movement Summary", [
            ("Total Issued", "issued"), ("Total Received", "received"),
            ("Total Adjusted", "adjusted"), ("Net Movement", "net_movement"),
            ("Issued This Week", "issued_this_week"),
            ("Received This Month", "received_this_month"),
        ], [summary]),
        ("Stock Movements", columns, movements),
    ]
    if export_format == "excel":
        content = make_excel(sections)
        media_type, extension = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"
    else:
        content = make_pdf(sections, "Stock Movements")
        media_type, extension = "application/pdf", "pdf"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="stock-movements.{extension}"'},
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
