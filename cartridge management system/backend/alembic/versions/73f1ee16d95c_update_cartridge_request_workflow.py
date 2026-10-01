"""update cartridge request workflow

Revision ID: 73f1ee16d95c
Revises: 002_update_user_roles
Create Date: 2026-08-24 12:35:49.480487

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "73f1ee16d95c"
down_revision: Union[str, None] = "002_update_user_roles"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:

    # ---------------------------------------------------------
    # 1. Add engineer_id as nullable temporarily
    # ---------------------------------------------------------

    op.add_column(
        "cartridge_requests",
        sa.Column(
            "engineer_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.create_index(
        "ix_cartridge_requests_engineer_id",
        "cartridge_requests",
        ["engineer_id"],
        unique=False,
    )

    op.create_foreign_key(
        "fk_cartridge_requests_engineer_id",
        "cartridge_requests",
        "engineers",
        ["engineer_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # ---------------------------------------------------------
    # 2. Existing requests must have an engineer
    # ---------------------------------------------------------
    #
    # If your database already contains cartridge requests,
    # assign the correct engineer_id before making the column
    # NOT NULL.
    #
    # For a new/empty request table, this update does nothing.
    #

    connection = op.get_bind()

    existing_requests = connection.execute(
        sa.text(
            """
            SELECT COUNT(*)
            FROM cartridge_requests
            """
        )
    ).scalar_one()

    if existing_requests > 0:

        missing_engineers = connection.execute(
            sa.text(
                """
                SELECT COUNT(*)
                FROM cartridge_requests
                WHERE engineer_id IS NULL
                """
            )
        ).scalar_one()

        if missing_engineers > 0:
            raise RuntimeError(
                "Existing cartridge requests do not have engineer_id. "
                "Assign engineer_id values before completing this migration."
            )

    # ---------------------------------------------------------
    # 3. Make engineer_id mandatory
    # ---------------------------------------------------------

    op.alter_column(
        "cartridge_requests",
        "engineer_id",
        existing_type=sa.Integer(),
        nullable=False,
    )

    # ---------------------------------------------------------
    # 4. Rename request status ISSUED -> INSTALLED
    # ---------------------------------------------------------

    op.execute(
        """
        ALTER TYPE cartridge_request_status
        RENAME VALUE 'ISSUED' TO 'INSTALLED'
        """
    )


def downgrade() -> None:

    # ---------------------------------------------------------
    # 1. Rename INSTALLED back to ISSUED
    # ---------------------------------------------------------

    op.execute(
        """
        ALTER TYPE cartridge_request_status
        RENAME VALUE 'INSTALLED' TO 'ISSUED'
        """
    )

    # ---------------------------------------------------------
    # 2. Remove engineer foreign key
    # ---------------------------------------------------------

    op.drop_constraint(
        "fk_cartridge_requests_engineer_id",
        "cartridge_requests",
        type_="foreignkey",
    )

    op.drop_index(
        "ix_cartridge_requests_engineer_id",
        table_name="cartridge_requests",
    )

    op.drop_column(
        "cartridge_requests",
        "engineer_id",
    )