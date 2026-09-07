from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cartridge import Cartridge
from app.models.cartridge_issue import CartridgeIssue
from app.models.cartridge_request import CartridgeRequest, CartridgeRequestStatus
from app.models.location import Location
from app.models.stock_movement import StockMovement, StockMovementType


async def get_reports_data(
    db: AsyncSession,
    *,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
) -> dict:
    if start_date is None:
        start_date = date.today() - timedelta(days=180)

    if end_date is None:
        end_date = date.today()

    start_datetime = datetime.combine(
        start_date,
        datetime.min.time(),
    ).replace(tzinfo=timezone.utc)

    end_datetime = datetime.combine(
        end_date,
        datetime.max.time(),
    ).replace(tzinfo=timezone.utc)

    issue_query = select(CartridgeIssue).where(
        CartridgeIssue.issue_date >= start_date,
        CartridgeIssue.issue_date <= end_date,
    )

    receipt_query = select(StockMovement).where(
        StockMovement.movement_type == StockMovementType.RECEIPT,
        func.date(StockMovement.created_at) >= start_date,
        func.date(StockMovement.created_at) <= end_date,
    )

    pending_query = select(CartridgeRequest).where(
        CartridgeRequest.status == CartridgeRequestStatus.PENDING,
        CartridgeRequest.requested_date >= start_datetime,
        CartridgeRequest.requested_date <= end_datetime,
    )

    issued_result = await db.execute(
        select(
            func.coalesce(
                func.sum(CartridgeIssue.quantity),
                0,
            )
        ).where(
            CartridgeIssue.issue_date >= start_date,
            CartridgeIssue.issue_date <= end_date,
        )
    )

    total_issued = issued_result.scalar() or 0

    received_result = await db.execute(
        select(
            func.coalesce(
                func.sum(StockMovement.quantity),
                0,
            )
        ).where(
            StockMovement.movement_type == StockMovementType.RECEIPT,
            func.date(StockMovement.created_at) >= start_date,
            func.date(StockMovement.created_at) <= end_date,
        )
    )

    total_received = received_result.scalar() or 0

    pending_result = await db.execute(
        select(
            func.coalesce(
                func.sum(CartridgeRequest.quantity),
                0,
            )
        ).where(
            CartridgeRequest.status == CartridgeRequestStatus.PENDING,
            CartridgeRequest.requested_date >= start_datetime,
            CartridgeRequest.requested_date <= end_datetime,
        )
    )

    total_pending = pending_result.scalar() or 0

    top_cartridges_result = await db.execute(
        select(
            Cartridge.id.label("cartridge_id"),
            Cartridge.model.label("cartridge_model"),
            func.coalesce(
                func.sum(CartridgeIssue.quantity),
                0,
            ).label("total_issued"),
        )
        .join(
            CartridgeIssue,
            CartridgeIssue.cartridge_id == Cartridge.id,
        )
        .where(
            CartridgeIssue.issue_date >= start_date,
            CartridgeIssue.issue_date <= end_date,
        )
        .group_by(
            Cartridge.id,
            Cartridge.model,
        )
        .order_by(
            func.sum(CartridgeIssue.quantity).desc()
        )
        .limit(10)
    )

    top_cartridges_rows = top_cartridges_result.all()

    top_cartridges = [
        {
            "cartridge_id": row.cartridge_id,
            "cartridge_model": row.cartridge_model,
            "total_issued": row.total_issued,
        }
        for row in top_cartridges_rows
    ]

    location_consumption_result = await db.execute(
        select(
            Location.id.label("location_id"),
            Location.name.label("location_name"),
            func.coalesce(
                func.sum(CartridgeIssue.quantity),
                0,
            ).label("total_issued"),
        )
        .join(
            CartridgeIssue,
            CartridgeIssue.location_id == Location.id,
        )
        .where(
            CartridgeIssue.issue_date >= start_date,
            CartridgeIssue.issue_date <= end_date,
        )
        .group_by(
            Location.id,
            Location.name,
        )
        .order_by(
            func.sum(CartridgeIssue.quantity).desc()
        )
    )

    location_consumption_rows = location_consumption_result.all()

    location_consumption = [
        {
            "location_id": row.location_id,
            "location_name": row.location_name,
            "total_issued": row.total_issued,
        }
        for row in location_consumption_rows
    ]

    six_months_ago = (
        date.today().replace(day=1) - timedelta(days=180)
    )
    six_months_ago = six_months_ago.replace(day=1)

    month_expr = func.date_trunc(
        "month",
        CartridgeIssue.issue_date,
    )

    monthly_issued_result = await db.execute(
        select(
            month_expr.label("month"),
            func.coalesce(
                func.sum(CartridgeIssue.quantity),
                0,
            ).label("issued"),
        )
        .where(
            CartridgeIssue.issue_date >= six_months_ago,
            CartridgeIssue.issue_date <= end_date,
        )
        .group_by(month_expr)
        .order_by(month_expr)
    )

    monthly_issued_rows = monthly_issued_result.all()

    received_month_expr = func.date_trunc(
        "month",
        func.date(StockMovement.created_at),
    )

    monthly_received_result = await db.execute(
        select(
            received_month_expr.label("month"),
            func.coalesce(
                func.sum(StockMovement.quantity),
                0,
            ).label("received"),
        )
        .where(
            StockMovement.movement_type == StockMovementType.RECEIPT,
            func.date(StockMovement.created_at) >= six_months_ago,
            func.date(StockMovement.created_at) <= end_date,
        )
        .group_by(received_month_expr)
        .order_by(received_month_expr)
    )

    monthly_received_rows = monthly_received_result.all()

    received_map = {
        row.month.date()
        if hasattr(row.month, "date")
        else row.month: row.received
        for row in monthly_received_rows
    }

    monthly_trend = [
        {
            "month": (
                row.month.date()
                if hasattr(row.month, "date")
                else row.month
            ),
            "issued": row.issued,
            "received": received_map.get(
                (
                    row.month.date()
                    if hasattr(row.month, "date")
                    else row.month
                ),
                0,
            ),
        }
        for row in monthly_issued_rows
    ]

    return {
        "summary": {
            "issued": total_issued,
            "received": total_received,
            "net": total_issued - total_received,
            "pending": total_pending,
        },
        "top_cartridges": top_cartridges,
        "location_consumption": location_consumption,
        "monthly_trend": monthly_trend,
    }