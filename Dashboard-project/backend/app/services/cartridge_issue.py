from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cartridge import Cartridge
from app.models.cartridge_issue import CartridgeIssue
from app.models.cartridge_request import (
    CartridgeRequest,
    CartridgeRequestStatus,
)
from app.models.inventory import Inventory
from app.models.stock_movement import StockMovementType
from app.schemas.cartridge_issue import CartridgeIssueCreate
from app.services.stock_movement import create_stock_movement


async def create_cartridge_issue(
    session: AsyncSession,
    data: CartridgeIssueCreate,
    performed_by: int,
) -> CartridgeIssue:

    request_result = await session.execute(
        select(CartridgeRequest)
        .where(
            CartridgeRequest.id == data.request_id,
        )
        .with_for_update()
    )

    request = request_result.scalar_one_or_none()

    if request is None:
        raise ValueError(
            "Cartridge request not found."
        )

    if request.status != CartridgeRequestStatus.APPROVED:
        raise ValueError(
            "Only approved cartridge requests can be installed."
        )

    cartridge_result = await session.execute(
        select(Cartridge)
        .where(
            Cartridge.id == request.cartridge_id,
            Cartridge.is_active.is_(True),
        )
    )

    cartridge = cartridge_result.scalar_one_or_none()

    if cartridge is None:
        raise ValueError(
            "Cartridge not found or inactive."
        )

    if cartridge.printer_id != request.printer_id:
        raise ValueError(
            "Requested cartridge does not belong to the requested printer."
        )

    inventory_result = await session.execute(
        select(Inventory)
        .where(
            Inventory.cartridge_id == request.cartridge_id,
        )
        .with_for_update()
    )

    inventory = inventory_result.scalar_one_or_none()

    if inventory is None:
        raise ValueError(
            "Inventory record not found."
        )

    if inventory.quantity < request.quantity:
        raise ValueError(
            f"Insufficient stock. Available quantity: {inventory.quantity}."
        )

    inventory.quantity -= request.quantity

    cartridge_issue = CartridgeIssue(
        request_id=request.id,
        employee_id=request.requester_id,
        location_id=request.location_id,
        engineer_id=request.engineer_id,
        printer_id=request.printer_id,
        cartridge_id=request.cartridge_id,
        quantity=request.quantity,
        issue_date=date.today(),
        remarks=request.remarks,
    )

    session.add(cartridge_issue)

    await session.flush()

    await create_stock_movement(
        session=session,
        cartridge_id=request.cartridge_id,
        movement_type=StockMovementType.ISSUE,
        quantity=request.quantity,
        performed_by=performed_by,
        reference_id=cartridge_issue.id,
        remarks=request.remarks,
    )

    request.status = CartridgeRequestStatus.INSTALLED

    await session.commit()

    await session.refresh(cartridge_issue)

    return cartridge_issue