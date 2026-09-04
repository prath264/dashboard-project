from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import all models so Alembic metadata is populated.
from app.models import (  # noqa: E402, F401
    cartridge,
    cartridge_issue,
    cartridge_request,
    engineer,
    inventory,
    location,
    printer,
    refresh_token,
    stock_movement,
    user,
)