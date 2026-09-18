"""add printer assignments and printer departments

Revision ID: 20260911_printer_assignments
Revises: eab278ebc1a5
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260911_printer_assignments"
down_revision: Union[str, None] = "eab278ebc1a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "printers",
        sa.Column("department", sa.String(length=255), nullable=True),
    )

    op.create_table(
        "printer_assignments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("printer_id", sa.Integer(), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("unassigned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("assigned_by", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["printer_id"], ["printers.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_printer_assignments_user_id", "printer_assignments", ["user_id"])
    op.create_index("ix_printer_assignments_printer_id", "printer_assignments", ["printer_id"])
    op.create_index("ix_printer_assignments_assigned_by", "printer_assignments", ["assigned_by"])
    op.create_index(
        "uq_printer_assignments_active_printer",
        "printer_assignments",
        ["printer_id"],
        unique=True,
        postgresql_where=sa.text("unassigned_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_printer_assignments_active_printer",
        table_name="printer_assignments",
    )
    op.drop_index("ix_printer_assignments_assigned_by", table_name="printer_assignments")
    op.drop_index("ix_printer_assignments_printer_id", table_name="printer_assignments")
    op.drop_index("ix_printer_assignments_user_id", table_name="printer_assignments")
    op.drop_table("printer_assignments")
    op.drop_column("printers", "department")
