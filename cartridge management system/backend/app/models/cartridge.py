from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Cartridge(Base):
    __tablename__ = "cartridges"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )

    model: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        index=True,
    )

    color: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    printer_id: Mapped[int] = mapped_column(
        ForeignKey("printers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    reorder_level: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=10,
    )

    is_active: Mapped[bool] = mapped_column(
        nullable=False,
        default=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )