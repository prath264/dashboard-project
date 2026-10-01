"""create issue cartridges

Revision ID: c1342def32fe
Revises: 001_initial_auth
Create Date: 2026-08-17 17:27:57.040900
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Revision identifiers, used by Alembic.
revision: str = "c1342def32fe"
down_revision: Union[str, None] = "001_initial_auth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "issue_cartridges",
        sa.Column(
            "issue_id",
            sa.Integer(),
            autoincrement=True,
            nullable=False,
        ),
        sa.Column(
            "employee_name",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "employee_id",
            sa.String(length=50),
            nullable=False,
        ),
        sa.Column(
            "department",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "location",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "engineer_name",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "printer_model",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "cartridge_model",
            sa.String(length=100),
            nullable=False,
        ),
        sa.Column(
            "quantity",
            sa.Integer(),
            server_default=sa.text("1"),
            nullable=False,
        ),
        sa.Column(
            "issue_date",
            sa.Date(),
            server_default=sa.text("CURRENT_DATE"),
            nullable=False,
        ),
        sa.Column(
            "remarks",
            sa.Text(),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("issue_id"),
    )


def downgrade() -> None:
    op.drop_table("issue_cartridges")