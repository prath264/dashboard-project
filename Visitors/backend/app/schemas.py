from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from .models import VisitorStatus


class VisitorBase(BaseModel):
    name: str
    phone: str
    email: EmailStr
    host_employee: str
    host_email: str | None = None
    purpose: str


class VisitorCreate(VisitorBase):
    pass


class VisitorResponse(VisitorBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    selfie_path: str | None
    status: VisitorStatus
    qr_code: str | None
    qr_active: bool
    approval_token: str | None
    created_at: datetime
    approved_at: datetime | None
    checked_in_at: datetime | None
    checked_out_at: datetime | None


class ActionResponse(BaseModel):
    message: str
    visitor: VisitorResponse


class QRScanRequest(BaseModel):
    qr_code: str


class EmployeeResponse(BaseModel):
    id: str
    display_name: str
    email: str


class TokenActionResponse(BaseModel):
    """Response for token-based approve/reject endpoints."""
    status: str  # "approved", "rejected", "already_handled"
    message: str
    visitor_name: str
