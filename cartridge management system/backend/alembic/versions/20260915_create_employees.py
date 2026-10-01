"""create employees table

Revision ID: 20260915_create_employees
Revises: 20260911_printer_assignments
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260915_create_employees"
down_revision: Union[str, None] = "20260911_printer_assignments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "employees",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("employee_id", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("department", sa.String(length=255), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_employees_employee_id", "employees", ["employee_id"], unique=True)
    op.create_index("ix_employees_name", "employees", ["name"], unique=False)
    op.create_index("ix_employees_department", "employees", ["department"], unique=False)
    op.create_index("ix_employees_is_active", "employees", ["is_active"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_employees_is_active", table_name="employees")
    op.drop_index("ix_employees_department", table_name="employees")
    op.drop_index("ix_employees_name", table_name="employees")
    op.drop_index("ix_employees_employee_id", table_name="employees")
    op.drop_table("employees")