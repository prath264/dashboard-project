from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cartridge import Cartridge
from app.models.cartridge_issue import CartridgeIssue
from app.models.cartridge_request import CartridgeRequest, CartridgeRequestStatus
from app.models.engineer import Engineer
from app.models.inventory import Inventory
from app.models.location import Location
from app.models.printer import Printer
from app.models.stock_movement import StockMovement, StockMovementType
from app.core.constants import LOW_STOCK_THRESHOLD_RATIO


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

    # Period-based metrics (filtered by date range)
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

    adjustment_result = await db.execute(
        select(
            func.coalesce(
                func.sum(StockMovement.quantity),
                0,
            )
        ).where(
            StockMovement.movement_type == StockMovementType.ADJUSTMENT,
            func.date(StockMovement.created_at) >= start_date,
            func.date(StockMovement.created_at) <= end_date,
        )
    )
    total_adjusted = adjustment_result.scalar() or 0

    pending_requests_result = await db.execute(
        select(func.count())
        .select_from(CartridgeRequest)
        .where(
            CartridgeRequest.status == CartridgeRequestStatus.PENDING,
            CartridgeRequest.requested_date >= start_datetime,
            CartridgeRequest.requested_date <= end_datetime,
        )
    )
    total_pending = pending_requests_result.scalar() or 0

    # Request status counts (for the selected period)
    status_counts = {}
    for status in CartridgeRequestStatus:
        count_result = await db.execute(
            select(func.count())
            .select_from(CartridgeRequest)
            .where(
                CartridgeRequest.status == status,
                CartridgeRequest.requested_date >= start_datetime,
                CartridgeRequest.requested_date <= end_datetime,
            )
        )
        status_counts[status.value.lower()] = count_result.scalar() or 0

    # Current inventory summary (NOT filtered by date range)
    inventory_query = (
        select(
            func.count().label("total_cartridges"),
            func.coalesce(func.sum(Inventory.quantity), 0).label("total_available"),
        )
        .select_from(Cartridge)
        .join(Inventory, Inventory.cartridge_id == Cartridge.id)
        .where(Cartridge.is_active.is_(True))
    )
    inventory_result = await db.execute(inventory_query)
    inventory_row = inventory_result.one()

    total_cartridges = inventory_row.total_cartridges or 0
    total_available = int(inventory_row.total_available or 0)

    # Calculate total issued (from all time stock movements)
    total_issued_all_time_result = await db.execute(
        select(func.coalesce(func.sum(StockMovement.quantity), 0))
        .where(
            StockMovement.movement_type == StockMovementType.ISSUE,
        )
    )
    total_issued_all_time = total_issued_all_time_result.scalar() or 0

    # Low stock and out of stock counts (current inventory)
    low_stock_query = (
        select(func.count())
        .select_from(Cartridge)
        .join(Inventory, Inventory.cartridge_id == Cartridge.id)
        .where(
            Cartridge.is_active.is_(True),
            Inventory.quantity > 0,
            Inventory.quantity <= Cartridge.reorder_level * LOW_STOCK_THRESHOLD_RATIO,
        )
    )
    low_stock_count = (await db.execute(low_stock_query)).scalar() or 0

    out_of_stock_query = (
        select(func.count())
        .select_from(Cartridge)
        .join(Inventory, Inventory.cartridge_id == Cartridge.id)
        .where(
            Cartridge.is_active.is_(True),
            Inventory.quantity <= 0,
        )
    )
    out_of_stock_count = (await db.execute(out_of_stock_query)).scalar() or 0

    # Top Consumed Cartridges (period-based)
    top_cartridges_result = await db.execute(
        select(
            Cartridge.id.label("cartridge_id"),
            Cartridge.model.label("cartridge_model"),
            Cartridge.color.label("cartridge_color"),
            Cartridge.reorder_level.label("reorder_level"),
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
            Cartridge.color,
            Cartridge.reorder_level,
        )
        .order_by(
            func.sum(CartridgeIssue.quantity).desc()
        )
        .limit(10)
    )

    top_cartridges_rows = top_cartridges_result.all()

    # Get current available for each top cartridge
    top_cartridges = []
    for row in top_cartridges_rows:
        avail_result = await db.execute(
            select(Inventory.quantity)
            .where(Inventory.cartridge_id == row.cartridge_id)
        )
        available = avail_result.scalar() or 0
        total = available + row.total_issued
        issued_pct = (row.total_issued / total * 100) if total > 0 else 0

        if available <= 0:
            status = "Out of Stock"
        elif total > 0 and available <= total * LOW_STOCK_THRESHOLD_RATIO:
            status = "Low Stock"
        else:
            status = "Normal"

        top_cartridges.append({
            "cartridge_id": row.cartridge_id,
            "cartridge_model": row.cartridge_model,
            "cartridge_color": row.cartridge_color,
            "total_issued": row.total_issued,
            "issued_percentage": round(issued_pct, 1),
            "available": available,
            "status": status,
        })

    # Location Consumption with Request Count (period-based)
    location_consumption_result = await db.execute(
        select(
            Location.id.label("location_id"),
            Location.name.label("location_name"),
            func.coalesce(
                func.sum(CartridgeIssue.quantity),
                0,
            ).label("total_issued"),
            func.count(CartridgeIssue.id).label("request_count"),
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
            "request_count": row.request_count,
            "issued_percentage": round(
                (row.total_issued / total_issued * 100) if total_issued > 0 else 0, 1
            ),
        }
        for row in location_consumption_rows
    ]

    # Monthly Trend: Issued, Received, Adjusted (last 6 months)
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

    adjustment_month_expr = func.date_trunc(
        "month",
        func.date(StockMovement.created_at),
    )

    monthly_adjusted_result = await db.execute(
        select(
            adjustment_month_expr.label("month"),
            func.coalesce(
                func.sum(StockMovement.quantity),
                0,
            ).label("adjusted"),
        )
        .where(
            StockMovement.movement_type == StockMovementType.ADJUSTMENT,
            func.date(StockMovement.created_at) >= six_months_ago,
            func.date(StockMovement.created_at) <= end_date,
        )
        .group_by(adjustment_month_expr)
        .order_by(adjustment_month_expr)
    )

    monthly_adjusted_rows = monthly_adjusted_result.all()

    received_map = {
        row.month.date()
        if hasattr(row.month, "date")
        else row.month: row.received
        for row in monthly_received_rows
    }

    adjusted_map = {
        row.month.date()
        if hasattr(row.month, "date")
        else row.month: row.adjusted
        for row in monthly_adjusted_rows
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
            "adjusted": adjusted_map.get(
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

    # Engineer Activity (period-based)
    engineer_activity_result = await db.execute(
        select(
            Engineer.id.label("engineer_id"),
            Engineer.name.label("engineer_name"),
            Engineer.employee_id.label("engineer_employee_id"),
            func.coalesce(
                func.sum(CartridgeIssue.quantity),
                0,
            ).label("total_issued"),
            func.count(CartridgeIssue.id).label("request_count"),
        )
        .join(
            CartridgeIssue,
            CartridgeIssue.engineer_id == Engineer.id,
        )
        .where(
            CartridgeIssue.issue_date >= start_date,
            CartridgeIssue.issue_date <= end_date,
        )
        .group_by(
            Engineer.id,
            Engineer.name,
            Engineer.employee_id,
        )
        .order_by(
            func.sum(CartridgeIssue.quantity).desc()
        )
    )

    engineer_activity_rows = engineer_activity_result.all()

    engineer_activity = [
        {
            "engineer_id": row.engineer_id,
            "engineer_name": row.engineer_name,
            "engineer_employee_id": row.engineer_employee_id,
            "total_issued": row.total_issued,
            "request_count": row.request_count,
        }
        for row in engineer_activity_rows
    ]

    # Low Stock / Out of Stock table (current inventory)
    low_stock_items_result = await db.execute(
        select(
            Cartridge.id.label("cartridge_id"),
            Cartridge.model.label("cartridge_model"),
            Cartridge.color.label("cartridge_color"),
            Cartridge.reorder_level.label("reorder_level"),
            Inventory.quantity.label("available"),
            Printer.model.label("printer_model"),
            Location.name.label("location_name"),
        )
        .join(Inventory, Inventory.cartridge_id == Cartridge.id)
        .join(Printer, Printer.id == Cartridge.printer_id)
        .join(Location, Location.id == Printer.location_id)
        .where(
            Cartridge.is_active.is_(True),
            Inventory.quantity <= Cartridge.reorder_level,
        )
        .order_by(Inventory.quantity.asc())
    )

    low_stock_rows = low_stock_items_result.all()

    low_stock_items = []
    for row in low_stock_rows:
        if row.available <= 0:
            status = "Out of Stock"
        else:
            status = "Low Stock"

        low_stock_items.append({
            "cartridge_id": row.cartridge_id,
            "cartridge_model": row.cartridge_model,
            "cartridge_color": row.cartridge_color,
            "reorder_level": row.reorder_level,
            "available": row.available,
            "printer_model": row.printer_model,
            "location_name": row.location_name,
            "status": status,
        })

    return {
        "summary": {
            "issued": total_issued,
            "received": total_received,
            "adjusted": total_adjusted,
            "net": total_received - total_issued + total_adjusted,
            "pending": total_pending,
        },
        "request_status": status_counts,
        "inventory_summary": {
            "total_cartridges": total_cartridges,
            "total_available": total_available,
            "total_issued_all_time": total_issued_all_time,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
        },
        "top_cartridges": top_cartridges,
        "location_consumption": location_consumption,
        "monthly_trend": monthly_trend,
        "engineer_activity": engineer_activity,
        "low_stock_items": low_stock_items,
    }
