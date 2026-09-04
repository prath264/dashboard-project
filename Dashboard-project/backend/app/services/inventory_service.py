from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cartridge import Cartridge
from app.models.inventory import Inventory
from app.models.location import Location
from app.models.printer import Printer
from app.models.stock_movement import (
    StockMovement,
    StockMovementType,
)
from app.services.stock_movement import create_stock_movement


async def get_inventory(
    db: AsyncSession,
):

    issue_subquery = (
        select(
            StockMovement.cartridge_id,
            func.coalesce(
                func.sum(StockMovement.quantity),
                0,
            ).label("issued"),
        )
        .where(
            StockMovement.movement_type == StockMovementType.ISSUE
        )
        .group_by(StockMovement.cartridge_id)
        .subquery()
    )

    query = (
        select(
            Cartridge.id.label("cartridge_id"),
            Cartridge.model.label("cartridge"),
            Cartridge.color,
            Cartridge.printer_id,
            Printer.model.label("printer"),
            Inventory.quantity.label("available"),
            Cartridge.reorder_level.label("reorder"),
            func.coalesce(
                issue_subquery.c.issued,
                0,
            ).label("issued"),
        )
        .join(Printer, Printer.id == Cartridge.printer_id)
        .join(Inventory, Inventory.cartridge_id == Cartridge.id)
        .outerjoin(
            issue_subquery,
            issue_subquery.c.cartridge_id == Cartridge.id,
        )
        .where(Cartridge.is_active.is_(True))
        .order_by(Cartridge.id)
    )

    result = await db.execute(query)
    rows = result.all()

    response = []

    for row in rows:
        available = int(row.available or 0)
        issued = int(row.issued or 0)
        total = available + issued

        if available <= 0:
            stock_status = "Out of Stock"
        elif available <= row.reorder:
            stock_status = "Low Stock"
        else:
            stock_status = "Normal"

        response.append(
            {
                "cartridge_id": row.cartridge_id,
                "cartridge": row.cartridge,
                "color": row.color,
                "printer_id": row.printer_id,
                "printer": row.printer,
                "total": total,
                "available": available,
                "issued": issued,
                "reorder": row.reorder,
                "status": stock_status,
            }
        )

    return response


async def get_printer_inventory(
    db: AsyncSession,
):

    query = (
        select(
            Printer.id,
            Printer.model,
            Printer.serial_number,
            Location.name.label("location"),
            Printer.is_active,
            Cartridge.model.label("cartridge"),
        )
        .join(Location, Location.id == Printer.location_id)
        .outerjoin(Cartridge, Cartridge.printer_id == Printer.id)
        .order_by(Printer.id)
    )

    result = await db.execute(query)
    rows = result.all()

    grouped = {}

    for row in rows:
        if row.id not in grouped:
            grouped[row.id] = {
                "id": row.id,
                "model": row.model,
                "serial": row.serial_number,
                "location": row.location,
                "cartridges": [],
                "status": "Active" if row.is_active else "Inactive",
            }

        if row.cartridge:
            grouped[row.id]["cartridges"].append(row.cartridge)

    response = []

    for printer in grouped.values():
        response.append(
            {
                "id": printer["id"],
                "model": printer["model"],
                "serial": printer["serial"],
                "location": printer["location"],
                "cartridge": ", ".join(printer["cartridges"]),
                "status": printer["status"],
            }
        )

    return response


async def adjust_inventory(
    db: AsyncSession,
    cartridge_id: int,
    new_quantity: int,
    performed_by: int,
    reason: str,
) -> dict:
    if new_quantity < 0:
        raise ValueError("Quantity cannot be negative.")

    result = await db.execute(
        select(Inventory).where(
            Inventory.cartridge_id == cartridge_id
        )
    )
    inventory_row = result.scalar_one_or_none()

    if inventory_row is None:
        raise ValueError("Inventory record not found for this cartridge.")

    old_quantity = inventory_row.quantity
    delta = new_quantity - old_quantity

    if delta == 0:
        raise ValueError("New quantity is the same as current quantity.")

    inventory_row.quantity = new_quantity