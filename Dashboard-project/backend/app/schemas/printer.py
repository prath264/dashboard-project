from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PrinterCreate(BaseModel):
    model: str = Field(
        min_length=1,
        max_length=150,
    )

    serial_number: str | None = Field(
        default=None,
        max_length=100,
    )

    location_id: int

    is_active: bool = True


class PrinterUpdate(BaseModel):
    is_active: bool | None = None


class PrinterResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    model: str
    serial_number: str | None
    location_id: int
    is_active: bool
    created_at: datetime