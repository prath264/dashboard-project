from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    employee_id: str = Field(
        min_length=1,
        max_length=50,
    )

    username: str = Field(
        min_length=1,
        max_length=100,
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    role: UserRole

    department: str | None = Field(
        default=None,
        max_length=255,
    )

    is_active: bool = True


class UserUpdate(BaseModel):
    employee_id: str | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    username: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    email: EmailStr | None = None

    role: UserRole | None = None

    department: str | None = Field(
        default=None,
        max_length=255,
    )

    is_active: bool | None = None

    password: str | None = Field(
        default=None,
        min_length=8,
        max_length=128,
    )


class UserRead(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    employee_id: str
    username: str
    email: EmailStr
    role: UserRole
    department: str | None
    is_active: bool
    created_at: datetime