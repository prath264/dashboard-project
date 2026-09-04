from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cartridge import Cartridge
from app.models.inventory import Inventory
from app.models.stock_movement import (
    StockMovement,
    StockMovementType,
)
from app.schemas.cartridge import CartridgeCreate


async def list_cartridges(
    db: AsyncSession,
    printer_id: int | None = None,
) -> list[Cartridge]:

    query = (
        select(Cartridge)
        .where(Cartridge.is_active.is_(True))
        .order_by(Cartridge.id)
    )

    if printer_id is not None:
        query = query.where(
            Cartridge.printer_id == printer_id
        )

    result = await db.execute(query)

    return list(result.scalars().all())


async def create_or_receive_cartridge(
    db: AsyncSession,
    data: CartridgeCreate,
    performed_by: int,
) -> Cartridge:

    existing_result = await db.execute(
        select(Cartridge).where(
            Cartridge.printer_id == data.printer_id,
            Cartridge.model == data.model,
            Cartridge.color == data.color,
            Cartridge.is_active.is_(True),
        )
    )

    cartridge = (
        existing_result.scalar_one_or_none()
    )

    if cartridge is None:

        cartridge = Cartridge(
            model=data.model,
            color=data.color,
            printer_id=data.printer_id,
            reorder_level=data.reorder_level,
            is_active=True,
        )

        db.add(cartridge)

        await db.flush()

        inventory = Inventory(
            cartridge_id=cartridge.id,
            quantity=data.quantity,
        )

        db.add(inventory)

    else:

        cartridge.reorder_level = (
            data.reorder_level
        )

        inventory_result = await db.execute(
            select(Inventory).where(
                Inventory.cartridge_id
                == cartridge.id
            )
        )

        inventory = (
            inventory_result.scalar_one_or_none()
        )

        if inventory is None:

            inventory = Inventory(
                cartridge_id=cartridge.id,
                quantity=data.quantity,
            )

            db.add(inventory)

        else:

            inventory.quantity += data.quantity

    movement = StockMovement(
        cartridge_id=cartridge.id,
        movement_type=StockMovementType.RECEIPT,
        quantity=data.quantity,
        performed_by=performed_by,
        remarks=data.remarks,
    )

    db.add(movement)

    await db.flush()
    await db.refresh(cartridge)

    return cartridge