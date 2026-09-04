from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.printer import Printer
from app.schemas.printer import PrinterCreate, PrinterUpdate


async def list_printers(
    db: AsyncSession,
) -> list[Printer]:

    result = await db.execute(
        select(Printer)
        .where(Printer.is_active.is_(True))
        .order_by(Printer.id)
    )

    return list(result.scalars().all())


async def list_all_printers(
    db: AsyncSession,
) -> list[Printer]:

    result = await db.execute(
        select(Printer)
        .order_by(Printer.id)
    )

    return list(result.scalars().all())


async def create_printer(
    db: AsyncSession,
    data: PrinterCreate,
) -> Printer:

    if data.serial_number:

        existing = await db.execute(
            select(Printer).where(
                Printer.serial_number
                == data.serial_number
            )
        )

        if existing.scalar_one_or_none():
            raise ValueError(
                "A printer with this serial number already exists."
            )

    printer = Printer(
        model=data.model,
        serial_number=data.serial_number,
        location_id=data.location_id,
        is_active=data.is_active,
    )

    db.add(printer)

    await db.flush()
    await db.refresh(printer)

    return printer


async def update_printer(
    db: AsyncSession,
    printer_id: int,
    data: PrinterUpdate,
) -> Printer | None:

    result = await db.execute(
        select(Printer).where(
            Printer.id == printer_id
        )
    )

    printer = result.scalar_one_or_none()

    if printer is None:
        return None

    if data.is_active is not None:
        printer.is_active = data.is_active

    await db.flush()
    await db.refresh(printer)

    return printer