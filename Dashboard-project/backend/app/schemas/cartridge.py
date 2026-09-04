from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CartridgeCreate(BaseModel):
    printer_id: int

    model: str = Field(
        min_length=1,
        max_length=150,
    )

    color: str = Field(
        min_length=1,
        max_length=50,
    )

    quantity: int = Field(
        default=1,
        ge=1,
    )

    reorder_level: int = Field(
        default=10,
        ge=0,
    )

    remarks: str | None = None


class CartridgeResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    model: str
    color: str
    printer_id: int
    reorder_level: int
    is_active: bool
    created_at: datetime