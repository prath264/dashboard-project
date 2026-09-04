from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.cartridge_request import (
    CartridgeRequest,
    CartridgeRequestStatus,
)
from app.schemas.cartridge_request import (
    CartridgeRequestCreate,
    CartridgeRequestResponse,
)


def serialize_request(
    request: CartridgeRequest,
) -> CartridgeRequestResponse:

    return CartridgeRequestResponse(
        id=request.id,

        requester_id=request.requester_id,
        requester_name=(
            request.requester.username
            if request.requester
            else None
        ),

        location_id=request.location_id,
        location_name=(
            request.location.name
            if request.location
            else None
        ),

        engineer_id=request.engineer_id,
        engineer_name=(
            request.engineer.name
            if request.engineer
            else None
        ),

        printer_id=request.printer_id,
        printer_model=(
            request.printer.model
            if request.printer
            else None
        ),

        cartridge_id=request.cartridge_id,
        cartridge_model=(
            request.cartridge.model
            if request.cartridge
            else None
        ),

        quantity=request.quantity,

        status=request.status.value,

        requested_date=request.requested_date,

        installed_date=(
            request.cartridge_issue.issue_date
            if request.cartridge_issue
            else None
        ),

        remarks=request.remarks,

        rejection_reason=request.rejection_reason,
    )


async def list_cartridge_requests(
    db: AsyncSession,
    status: str | None = None,
) -> list[CartridgeRequestResponse]:

    query = (
        select(CartridgeRequest)
        .options(
            selectinload(CartridgeRequest.requester),
            selectinload(CartridgeRequest.location),
            selectinload(CartridgeRequest.engineer),
            selectinload(CartridgeRequest.printer),
            selectinload(CartridgeRequest.cartridge),
            selectinload(CartridgeRequest.cartridge_issue),
        )
        .order_by(CartridgeRequest.id.desc())
    )

    if status:
        normalized_status = status.strip().capitalize()

        try:
            status_enum = CartridgeRequestStatus(
                normalized_status
            )
        except ValueError:
            status_enum = None

        if status_enum is not None:
            query = query.where(
                CartridgeRequest.status == status_enum
            )

    result = await db.execute(query)

    requests = result.scalars().all()

    return [
        serialize_request(request)
        for request in requests
    ]


async def get_cartridge_request(
    db: AsyncSession,
    request_id: int,
) -> CartridgeRequestResponse | None:

    result = await db.execute(
        select(CartridgeRequest)
        .options(
            selectinload(CartridgeRequest.requester),
            selectinload(CartridgeRequest.location),
            selectinload(CartridgeRequest.engineer),
            selectinload(CartridgeRequest.printer),
            selectinload(CartridgeRequest.cartridge),
            selectinload(CartridgeRequest.cartridge_issue),
        )
        .where(
            CartridgeRequest.id == request_id
        )
    )

    request = result.scalar_one_or_none()

    if request is None:
        return None

    return serialize_request(request)


async def create_cartridge_request(
    db: AsyncSession,
    data: CartridgeRequestCreate,
) -> CartridgeRequestResponse:

    request = CartridgeRequest(
        requester_id=data.requester_id,
        location_id=data.location_id,
        engineer_id=data.engineer_id,
        printer_id=data.printer_id,
        cartridge_id=data.cartridge_id,
        quantity=data.quantity,
        remarks=data.remarks,
        status=CartridgeRequestStatus.PENDING,
    )

    db.add(request)

    await db.flush()

    await db.refresh(request)

    result = await db.execute(
        select(CartridgeRequest)
        .options(
            selectinload(CartridgeRequest.requester),
            selectinload(CartridgeRequest.location),
            selectinload(CartridgeRequest.engineer),
            selectinload(CartridgeRequest.printer),
            selectinload(CartridgeRequest.cartridge),
            selectinload(CartridgeRequest.cartridge_issue),
        )
        .where(
            CartridgeRequest.id == request.id
        )
    )

    created_request = result.scalar_one()

    return serialize_request(created_request)


async def approve_cartridge_request(
    db: AsyncSession,
    request_id: int,
    approved_by: int,
) -> CartridgeRequestResponse | None:

    result = await db.execute(
        select(CartridgeRequest)
        .options(
            selectinload(CartridgeRequest.requester),
            selectinload(CartridgeRequest.location),
            selectinload(CartridgeRequest.engineer),
            selectinload(CartridgeRequest.printer),
            selectinload(CartridgeRequest.cartridge),
            selectinload(CartridgeRequest.cartridge_issue),
        )
        .where(
            CartridgeRequest.id == request_id
        )
    )

    request = result.scalar_one_or_none()

    if request is None:
        return None

    if request.status != CartridgeRequestStatus.PENDING:
        raise ValueError(
            "Only pending requests can be approved."
        )

    request.status = CartridgeRequestStatus.APPROVED

    request.approved_by = approved_by

    request.approved_at = datetime.now(timezone.utc)

    await db.flush()

    await db.refresh(request)

    return serialize_request(request)


async def reject_cartridge_request(
    db: AsyncSession,
    request_id: int,
    rejection_reason: str,
) -> CartridgeRequestResponse | None:

    result = await db.execute(
        select(CartridgeRequest)
        .options(
            selectinload(CartridgeRequest.requester),
            selectinload(CartridgeRequest.location),
            selectinload(CartridgeRequest.engineer),
            selectinload(CartridgeRequest.printer),
            selectinload(CartridgeRequest.cartridge),
            selectinload(CartridgeRequest.cartridge_issue),
        )
        .where(
            CartridgeRequest.id == request_id
        )
    )

    request = result.scalar_one_or_none()

    if request is None:
        return None

    if request.status != CartridgeRequestStatus.PENDING:
        raise ValueError(
            "Only pending requests can be rejected."
        )

    request.status = CartridgeRequestStatus.REJECTED

    request.rejection_reason = rejection_reason

    await db.flush()

    await db.refresh(request)

    return serialize_request(request)