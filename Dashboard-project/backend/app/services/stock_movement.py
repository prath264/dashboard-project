from datetime import date, datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cartridge import Cartridge
from app.models.stock_movement import StockMovement, StockMovementType
from app.models.user import User


async def create_stock_movement(
    session: AsyncSession,
    *,
    cartridge_id: int,
    movement_type: StockMovementType,
    quantity: int,
    performed_by: int,
    reference_id: int | None = None,
    remarks: str | None = None,
) -> StockMovement:
    if movement_type != StockMovementType.ADJUSTMENT and quantity <= 0:
        raise ValueError(
            "Stock movement quantity must be greater than zero."
        )

    if movement_type == StockMovementType.ADJUSTMENT and quantity == 0:
        raise ValueError(
            "Adjustment quantity cannot be zero."
        )

    movement = StockMovement(
        cartridge_id=cartridge_id,
        movement_type=movement_type,
        quantity=quantity,
        performed_by=performed_by,
        reference_id=reference_id,
        remarks=remarks,
    )

    session.add(movement)
    await session.flush()

    return movement


async def list_stock_movements(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    movement_type: str | None = None,
    cartridge_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> tuple[list[dict], int]:

    query = (
        select(
            StockMovement.id,
            StockMovement.movement_type,
            StockMovement.quantity,
            StockMovement.remarks,
            StockMovement.created_at,
            Cartridge.model.label("cartridge_model"),
            User.username.label("performed_by_name"),
        )
        .join(Cartridge, Cartridge.id == StockMovement.cartridge_id)
        .join(User, User.id == StockMovement.performed_by)
    )

    count_query = (
        select(func.count())
        .select_from(StockMovement)
        .join(Cartridge, Cartridge.id == StockMovement.cartridge_id)
    )

    if movement_type:
        try:
            type_enum = StockMovementType(movement_type.upper())
            query = query.where(StockMovement.movement_type == type_enum)
            count_query = count_query.where(
                StockMovement.movement_type == type_enum
            )
        except ValueError:
            pass

    if cartridge_id:
        query = query.where(StockMovement.cartridge_id == cartridge_id)
        count_query = count_query.where(
            StockMovement.cartridge_id == cartridge_id
        )

    if start_date:
        query = query.where(
            func.date(StockMovement.created_at) >= start_date
        )
        count_query = count_query.where(
            func.date(StockMovement.created_at) >= start_date
        )

    if end_date:
        query = query.where(
            func.date(StockMovement.created_at) <= end_date
        )
        count_query = count_query.where(
            func.date(StockMovement.created_at) <= end_date
        )

    total = (await db.execute(count_query)).scalar_one()

    result = await db.execute(
        query
        .order_by(StockMovement.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    rows = result.all()

    movements = [
        {
            "id": row.id,
            "movement_type": row.movement_type.value,
            "quantity": row.quantity,
            "remarks": row.remarks,
            "created_at": row.created_at,
            "cartridge_model": row.cartridge_model,
            "performed_by_name": row.performed_by_name,
        }
        for row in rows
    ]

    return movements, total


async def get_stock_movement_summary(
    db: AsyncSession,
) -> dict:

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    month_start = datetime.now(timezone.utc).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )

    issued_week_result = await db.execute(
        select(func.coalesce(func.sum(StockMovement.quantity), 0))
        .where(
            StockMovement.movement_type == StockMovementType.ISSUE,
            StockMovement.created_at >= week_ago,
        )
    )
    issued_week = issued_week_result.scalar() or 0

    received_month_result = await db.execute(
        select(func.coalesce(func.sum(StockMovement.quantity), 0))
        .where(
            StockMovement.movement_type == StockMovementType.RECEIPT,
            StockMovement.created_at >= month_start,
        )
    )
    received_month = received_month_result.scalar() or 0

    return {
        "issued_this_week": issued_week,
        "received_this_month": received_month,
    }