"""verify clean

Revision ID: eab278ebc1a5
Revises: 322ca6d635c2
Create Date: 2026-08-25 12:34:52.660945

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "eab278ebc1a5"
down_revision: Union[str, None] = "322ca6d635c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---------------------------------------------------------
    # 1. Add approval fields to cartridge_requests
    # ---------------------------------------------------------

    op.add_column(
        "cartridge_requests",
        sa.Column(
            "approved_by",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.add_column(
        "cartridge_requests",
        sa.Column(
            "approved_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    op.create_index(
        op.f("ix_cartridge_requests_approved_by"),
        "cartridge_requests",
        ["approved_by"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_cartridge_requests_approved_by",
        "cartridge_requests",
        "users",
        ["approved_by"],
        ["id"],
        ondelete="RESTRICT",
    )

    # ---------------------------------------------------------
    # 2. Add employee_id to engineers as nullable
    # ---------------------------------------------------------

    op.add_column(
        "engineers",
        sa.Column(
            "employee_id",
            sa.String(length=50),
            nullable=True,
        ),
    )

    # ---------------------------------------------------------
    # 3. Backfill existing engineers
    # ---------------------------------------------------------

    op.execute(
        """
        UPDATE engineers
        SET employee_id = 'ENG-' || id::text
        WHERE employee_id IS NULL
        """
    )

    # ---------------------------------------------------------
    # 4. Make employee_id mandatory
    # ---------------------------------------------------------

    op.alter_column(
        "engineers",
        "employee_id",
        existing_type=sa.String(length=50),
        nullable=False,
    )

    # ---------------------------------------------------------
    # 5. Make employee_id unique
    # ---------------------------------------------------------

    op.create_index(
        op.f("ix_engineers_employee_id"),
        "engineers",
        ["employee_id"],
        unique=True,
    )


def downgrade() -> None:
    # ---------------------------------------------------------
    # 1. Remove employee_id from engineers
    # ---------------------------------------------------------

    op.drop_index(
        op.f("ix_engineers_employee_id"),
        table_name="engineers",
    )

    op.drop_column(
        "engineers",
        "employee_id",
    )

    # ---------------------------------------------------------
    # 2. Remove approval foreign key
    # ---------------------------------------------------------

    op.drop_constraint(
        "fk_cartridge_requests_approved_by",
        "cartridge_requests",
        type_="foreignkey",
    )

    # ---------------------------------------------------------
    # 3. Remove approval fields
    # ---------------------------------------------------------

    op.drop_index(
        op.f("ix_cartridge_requests_approved_by"),
        table_name="cartridge_requests",
    )

    op.drop_column(
        "cartridge_requests",
        "approved_at",
    )

    op.drop_column(
        "cartridge_requests",
        "approved_by",
    )