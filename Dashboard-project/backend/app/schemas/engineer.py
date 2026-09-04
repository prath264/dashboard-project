from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EngineerCreate(BaseModel):
    employee_id: str = Field(
        min_length=1,
        max_length=50,
    )
    name: str = Field(
        min_length=1,
        max_length=150,
    )
    is_active: bool = True


class EngineerUpdate(BaseModel):
    employee_id: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )
    is_active: bool | None = None


class EngineerResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    employee_id: str
    name: str
    is_active: bool
    created_at: datetime