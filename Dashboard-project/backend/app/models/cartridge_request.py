from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CartridgeRequestStatus(str, Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    INSTALLED = "Installed"


class CartridgeRequest(Base):
    __tablename__ = "cartridge_requests"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    requester_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    location_id: Mapped[int] = mapped_column(
        ForeignKey("locations.id"),
        nullable=False,
    )

    engineer_id: Mapped[int] = mapped_column(
        ForeignKey("engineers.id"),
        nullable=False,
    )

    printer_id: Mapped[int] = mapped_column(
        ForeignKey("printers.id"),
        nullable=False,
    )

    cartridge_id: Mapped[int] = mapped_column(
        ForeignKey("cartridges.id"),
        nullable=False,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    status: Mapped[CartridgeRequestStatus] = mapped_column(
        SQLEnum(
            CartridgeRequestStatus,
            name="cartridge_request_status",
        ),
        nullable=False,
        default=CartridgeRequestStatus.PENDING,
    )

    requested_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    rejection_reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    approved_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    requester = relationship(
        "User",
        foreign_keys=[requester_id],
    )

    location = relationship(
        "Location",
        foreign_keys=[location_id],
    )

    engineer = relationship(
        "Engineer",
        foreign_keys=[engineer_id],
    )

    printer = relationship(
        "Printer",
        foreign_keys=[printer_id],
    )

    cartridge = relationship(
        "Cartridge",
        foreign_keys=[cartridge_id],
    )

    approver = relationship(
        "User",
        foreign_keys=[approved_by],
    )

    cartridge_issue = relationship(
        "CartridgeIssue",
        uselist=False,
    )