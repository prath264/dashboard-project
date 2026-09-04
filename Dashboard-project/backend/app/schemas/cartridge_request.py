from datetime import datetime, date

from pydantic import BaseModel, ConfigDict, Field


class CartridgeRequestCreate(BaseModel):
    requester_id: int
    location_id: int
    engineer_id: int
    printer_id: int
    cartridge_id: int
    quantity: int = Field(
        default=1,
        ge=1,
    )
    remarks: str | None = None


class CartridgeRequestUpdate(BaseModel):
    status: str
    rejection_reason: str | None = None


class CartridgeRequestResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    requester_id: int
    requester_name: str | None = None

    location_id: int
    location_name: str | None = None

    engineer_id: int
    engineer_name: str | None = None

    printer_id: int
    printer_model: str | None = None

    cartridge_id: int
    cartridge_model: str | None = None

    quantity: int

    status: str

    requested_date: datetime

    installed_date: date | None = None

    remarks: str | None = None

    rejection_reason: str | None = None