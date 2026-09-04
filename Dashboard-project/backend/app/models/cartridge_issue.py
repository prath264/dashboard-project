from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CartridgeIssue(Base):
    __tablename__ = "cartridge_issues"

    __table_args__ = (
        CheckConstraint(
            "quantity > 0",
            name="ck_cartridge_issue_quantity_positive",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    request_id: Mapped[int] = mapped_column(
        ForeignKey(
            "cartridge_requests.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        unique=True,
        index=True,
    )

    employee_id: Mapped[int] = mapped_column(
        ForeignKey(
            "users.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    location_id: Mapped[int] = mapped_column(
        ForeignKey(
            "locations.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    engineer_id: Mapped[int] = mapped_column(
        ForeignKey(
            "engineers.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    printer_id: Mapped[int] = mapped_column(
        ForeignKey(
            "printers.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    cartridge_id: Mapped[int] = mapped_column(
        ForeignKey(
            "cartridges.id",
            ondelete="RESTRICT",
        ),
        nullable=False,
        index=True,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    issue_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        server_default=func.current_date(),
    )

    remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships

    employee = relationship(
        "User",
        foreign_keys=[employee_id],
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