"""complete cartridge request engineer relationship

Revision ID: f2a7428d8c77
Revises: update_cartridge_request_status
Create Date: 2026-08-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f2a7428d8c77"
down_revision: Union[str, None] = "update_cartridge_request_status"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()

    # ---------------------------------------------------------
    # 1. engineer_id already exists in cartridge_requests
    # ---------------------------------------------------------
    # Do NOT add the column again.
    #
    # Existing engineers:
    # 1 = Sandesh Kadam
    # 2 = Kushal Nehete
    # 3 = Prathamesh Gholap
    #
    # Existing cartridge requests are assigned engineer 1.
    # Change this value if the existing requests belong
    # to another engineer.
    # ---------------------------------------------------------

    connection.execute(
        sa.text(
            """
            UPDATE cartridge_requests
            SET engineer_id = 1
            WHERE engineer_id IS NULL
            """
        )
    )

    # ---------------------------------------------------------
    # 2. Create index if it does not already exist
    # ---------------------------------------------------------

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS
        ix_cartridge_requests_engineer_id
        ON cartridge_requests (engineer_id)
        """
    )

    # ---------------------------------------------------------
    # 3. Create foreign key if it does not already exist
    # ---------------------------------------------------------

    fk_exists = connection.execute(
        sa.text(
            """
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_cartridge_requests_engineer_id'
            """
        )
    ).scalar_one_or_none()

    if fk_exists is None:
        op.create_foreign_key(
            "fk_cartridge_requests_engineer_id",
            "cartridge_requests",
            "engineers",
            ["engineer_id"],
            ["id"],
            ondelete="RESTRICT",
        )

    # ---------------------------------------------------------
    # 4. Make engineer_id mandatory
    # ---------------------------------------------------------

    op.alter_column(
        "cartridge_requests",
        "engineer_id",
        existing_type=sa.Integer(),
        nullable=False,
    )


def downgrade() -> None:

    # Allow NULL again
    op.alter_column(
        "cartridge_requests",
        "engineer_id",
        existing_type=sa.Integer(),
        nullable=True,
    )

    # Remove foreign key if present
    connection = op.get_bind()

    fk_exists = connection.execute(
        sa.text(
            """
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_cartridge_requests_engineer_id'
            """
        )
    ).scalar_one_or_none()

    if fk_exists is not None:
        op.drop_constraint(
            "fk_cartridge_requests_engineer_id",
            "cartridge_requests",
            type_="foreignkey",
        )

    # Remove index
    op.execute(
        """
        DROP INDEX IF EXISTS
        ix_cartridge_requests_engineer_id
        """
    )