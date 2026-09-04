
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LocationResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    name: str
    is_active: bool
    created_at: datetime
    printer_count: int = 0


class LocationCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=150,
    )
    is_active: bool = True


class LocationUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )
    is_active: bool | None = None

