from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cartridge import Cartridge
from app.models.cartridge_issue import CartridgeIssue
from app.models.inventory import Inventory


async def get_dashboard_summary(
    db: AsyncSession,
) -> dict:

    total_cartridges_result = await db.execute(
        select(func.count(Cartridge.id))
        .where(
            Cartridge.is_active.is_(True)
        )
    )

    total_cartridges = (
        total_cartridges_result.scalar() or 0
    )

    stock_result = await db.execute(
        select(
            func.coalesce(
                func.sum(Inventory.quantity),
                0,
            )
        )
    )

    in_stock = stock_result.scalar() or 0

    today = datetime.now(timezone.utc)

    start_of_month = today.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    issued_result = await db.execute(
        select(
            func.coalesce(
                func.sum(CartridgeIssue.quantity),
                0,
            )
        )
        .where(
            CartridgeIssue.issue_date
            >= start_of_month.date()
        )
    )

    issued_this_month = issued_result.scalar() or 0

    low_stock_result = await db.execute(
        select(func.count(Inventory.id))
        .join(
            Cartridge,
            Cartridge.id == Inventory.cartridge_id,
        )
        .where(
            Cartridge.is_active.is_(True),
            Inventory.quantity <= Cartridge.reorder_level,
        )
    )

    low_stock = low_stock_result.scalar() or 0

    return {
        "cartridge_models": total_cartridges,
        "available_stock": in_stock,
        "issued_this_month": issued_this_month,
        "low_stock_alerts": low_stock,
    }


async def get_cartridge_quantities(
    db: AsyncSession,
) -> list[dict]:

    result = await db.execute(
        select(
            Cartridge.id,
            Cartridge.model,
            func.coalesce(
                func.sum(Inventory.quantity),
                0,
            ).label("quantity"),
        )
        .outerjoin(
            Inventory,
            Inventory.cartridge_id == Cartridge.id,
        )
        .where(
            Cartridge.is_active.is_(True)
        )
        .group_by(
            Cartridge.id,
            Cartridge.model,
        )
        .order_by(
            Cartridge.model
        )
    )

    rows = result.all()

    return [
        {
            "cartridge_id": row.id,
            "cartridge_model": row.model,
            "quantity": row.quantity,
        }
        for row in rows
    ]


async def get_monthly_issues(
    db: AsyncSession,
) -> list[dict]:

    today = datetime.now(timezone.utc)

    start_date = (
        today.replace(
            day=1,
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )
        - timedelta(days=365)
    )

    month_expr = func.date_trunc(
        "month",
        CartridgeIssue.issue_date,
    )

    result = await db.execute(
        select(
            month_expr.label("month"),
            func.coalesce(
                func.sum(CartridgeIssue.quantity),
                0,
            ).label("quantity"),
        )
        .where(
            CartridgeIssue.issue_date
            >= start_date.date()
        )
        .group_by(
            month_expr
        )
        .order_by(
            month_expr
        )
    )

    rows = result.all()

    return [
        {
            "month": row.month,
            "quantity": row.quantity,
        }
        for row in rows
    ]


async def get_recent_activity(
    db: AsyncSession,
    limit: int = 15,
) -> list[dict]:

    result = await db.execute(
        select(CartridgeIssue)
        .options(
            selectinload(CartridgeIssue.employee),
            selectinload(CartridgeIssue.location),
            selectinload(CartridgeIssue.engineer),
            selectinload(CartridgeIssue.printer),
            selectinload(CartridgeIssue.cartridge),
        )
        .order_by(
            CartridgeIssue.id.desc()
        )
        .limit(limit)
    )

    issues = result.scalars().all()

    return [
        {
            "id": issue.id,
            "request_id": issue.request_id,

            "employee_id": issue.employee_id,
            "employee_name": (
                issue.employee.username
                if issue.employee
                else None
            ),

            "location_id": issue.location_id,
            "location_name": (
                issue.location.name
                if issue.location
                else None
            ),

            "engineer_id": issue.engineer_id,
            "engineer_name": (
                issue.engineer.name
                if issue.engineer
                else None
            ),

            "printer_id": issue.printer_id,
            "printer_model": (
                issue.printer.model
                if issue.printer
                else None
            ),

            "cartridge_id": issue.cartridge_id,
            "cartridge_model": (
                issue.cartridge.model
                if issue.cartridge
                else None
            ),

            "quantity": issue.quantity,
            "issue_date": issue.issue_date,
            "remarks": issue.remarks,
        }
        for issue in issues
    ]

async def get_inventory_details(
    db: AsyncSession,
) -> list[dict]:

    from app.services.inventory_service import get_inventory

    return await get_inventory(db)


async def get_monthly_issues_list(
    db: AsyncSession,
) -> list[dict]:

    today = datetime.now(timezone.utc)

    start_of_month = today.replace(
        day=1,
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    ).date()

    result = await db.execute(
        select(CartridgeIssue)
        .options(
            selectinload(CartridgeIssue.employee),
            selectinload(CartridgeIssue.location),
            selectinload(CartridgeIssue.engineer),
            selectinload(CartridgeIssue.printer),
            selectinload(CartridgeIssue.cartridge),
        )
        .where(
            CartridgeIssue.issue_date >= start_of_month
        )
        .order_by(
            CartridgeIssue.id.desc()
        )
    )

    issues = result.scalars().all()

    return [
        {
            "id": issue.id,
            "employee_name": (
                issue.employee.username
                if issue.employee
                else None
            ),
            "location_name": (
                issue.location.name
                if issue.location
                else None
            ),
            "engineer_name": (
                issue.engineer.name
                if issue.engineer
                else None
            ),
            "printer_model": (
                issue.printer.model
                if issue.printer
                else None
            ),
            "cartridge_model": (
                issue.cartridge.model
                if issue.cartridge
                else None
            ),
            "quantity": issue.quantity,
            "issue_date": issue.issue_date,
            "remarks": issue.remarks,
        }
        for issue in issues
    ]