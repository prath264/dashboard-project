"""rename requested_at to requested_date

Revision ID: a1b2c3d4e5f6
Revises: 73f1ee16d95c
Create Date: 2026-08-25

"""

from typing import Sequence, Union

from alembic import op


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "f2a7428d8c77"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "cartridge_requests",
        "requested_at",
        new_column_name="requested_date",
    )


def downgrade() -> None:
    op.alter_column(
        "cartridge_requests",
        "requested_date",
        new_column_name="requested_at",
    )