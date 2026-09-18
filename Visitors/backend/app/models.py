import enum
import secrets
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class VisitorStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"


def generate_approval_token() -> str:
    """Generate a secure random approval token."""
    return secrets.token_urlsafe(32)


class Visitor(Base):
    __tablename__ = "visitors"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    selfie_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    host_employee: Mapped[str] = mapped_column(String(255), nullable=False)
    host_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[VisitorStatus] = mapped_column(
        Enum(VisitorStatus),
        default=VisitorStatus.PENDING,
        nullable=False,
    )
    qr_code: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    qr_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    approval_token: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True, default=generate_approval_token
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    checked_in_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    checked_out_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
