from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse
from app.services.reports_service import get_reports_data
from app.services.file_exports import make_excel, make_pdf


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


@router.get(
    "/export",
)
async def export_reports(
    export_format: str = Query(alias="format", pattern="^(excel|pdf)$"),
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

    summary = data["summary"]
    inventory = data["inventory_summary"]
    top_rows = [
        {"rank": index + 1, **row}
        for index, row in enumerate(data["top_cartridges"])
    ]
    location_rows = [
        {"rank": index + 1, **row}
        for index, row in enumerate(data["location_consumption"])
    ]
    sections = [
        ("Period Summary", [
            ("Total Issued", "issued"), ("Total Received", "received"),
            ("Total Adjusted", "adjusted"), ("Net Movement", "net"),
            ("Pending Requests", "pending"),
        ], [summary]),
        ("Current Inventory", [
            ("Total Cartridges", "total_cartridges"), ("Total Available", "total_available"),
            ("Total Issued All Time", "total_issued_all_time"),
            ("Low Stock Count", "low_stock_count"), ("Out of Stock Count", "out_of_stock_count"),
        ], [inventory]),
        ("Top Consumed Cartridges", [
            ("Rank", "rank"), ("Cartridge Model", "cartridge_model"),
            ("Color", "cartridge_color"), ("Total Issued", "total_issued"),
            ("Available", "available"), ("Issued Percentage", "issued_percentage"),
            ("Status", "status"),
        ], top_rows),
        ("Consumption by Location", [
            ("Rank", "rank"), ("Location", "location_name"),
            ("Total Issued", "total_issued"), ("Request Count", "request_count"),
            ("Issued Percentage", "issued_percentage"),
        ], location_rows),
    ]
    if export_format == "excel":
        content = make_excel(sections)
        media_type, extension = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"
    else:
        content = make_pdf(sections, "Reports")
        media_type, extension = "application/pdf", "pdf"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="reports.{extension}"'},
    )
