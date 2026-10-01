from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cartridge_request import (
    CartridgeRequest,
    CartridgeRequestStatus,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def approve_cartridge_request(
    session: AsyncSession,
    request_id: int,
    approved_by: int,
) -> CartridgeRequest:

    # Lock the request row so two approvers cannot
    # approve/reject it simultaneously.
    result = await session.execute(
        select(CartridgeRequest)
        .where(
            CartridgeRequest.id == request_id
        )
        .with_for_update()
    )

    request = result.scalar_one_or_none()

    if request is None:
        raise ValueError(
            "Cartridge request not found."
        )

    if request.status != CartridgeRequestStatus.PENDING:
        raise ValueError(
            f"Request cannot be approved because "
            f"its current status is "
            f"{request.status.value}."
        )

    request.status = CartridgeRequestStatus.APPROVED
    request.approved_by = approved_by
    request.approved_at = utcnow()

    # Clear any previous rejection data.
    request.rejection_reason = None

    await session.commit()
    await session.refresh(request)

    return request


async def reject_cartridge_request(
    session: AsyncSession,
    request_id: int,
    rejected_by: int,
    rejection_reason: str,
) -> CartridgeRequest:

    # Lock the request row for concurrency safety.
    result = await session.execute(
        select(CartridgeRequest)
        .where(
            CartridgeRequest.id == request_id
        )
        .with_for_update()
    )

    request = result.scalar_one_or_none()

    if request is None:
        raise ValueError(
            "Cartridge request not found."
        )

    if request.status != CartridgeRequestStatus.PENDING:
        raise ValueError(
            f"Request cannot be rejected because "
            f"its current status is "
            f"{request.status.value}."
        )

    request.status = CartridgeRequestStatus.REJECTED

    # We use approved_by as the workflow actor because
    # the existing database structure already provides
    # this field for the person who processed the request.
    request.approved_by = rejected_by
    request.approved_at = utcnow()

    request.rejection_reason = rejection_reason.strip()

    await session.commit()
    await session.refresh(request)

    return request