"""switch cartridge_issues and printer_assignments FKs to employees table

Revision ID: 20260918_switch_employee_fks
Revises: 20260915_create_employees
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260918_switch_employee_fks"
down_revision: Union[str, None] = "20260915_create_employees"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Clear data that would conflict with new FKs
    op.execute("DELETE FROM stock_movements WHERE reference_id IN (SELECT id FROM cartridge_issues)")
    op.execute("TRUNCATE TABLE cartridge_issues RESTART IDENTITY CASCADE")
    op.execute("TRUNCATE TABLE printer_assignments RESTART IDENTITY CASCADE")

    # Drop existing FK constraints
    op.drop_constraint("cartridge_issues_employee_id_fkey", "cartridge_issues", type_="foreignkey")
    op.drop_constraint("printer_assignments_user_id_fkey", "printer_assignments", type_="foreignkey")

    # Change cartridge_issues.employee_id to reference employees.id
    op.alter_column("cartridge_issues", "employee_id", existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key(
        "cartridge_issues_employee_id_fkey",
        "cartridge_issues",
        "employees",
        ["employee_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # Change printer_assignments.user_id to reference employees.id
    op.alter_column("printer_assignments", "user_id", existing_type=sa.Integer(), nullable=False)
    op.create_foreign_key(
        "printer_assignments_user_id_fkey",
        "printer_assignments",
        "employees",
        ["user_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # printer_assignments.assigned_by stays pointing to users.id (no change needed)


def downgrade() -> None:
    # Drop new FK constraints
    op.drop_constraint("cartridge_issues_employee_id_fkey", "cartridge_issues", type_="foreignkey")
    op.drop_constraint("printer_assignments_user_id_fkey", "printer_assignments", type_="foreignkey")

    # Restore cartridge_issues.employee_id to reference users.id
    op.create_foreign_key(
        "cartridge_issues_employee_id_fkey",
        "cartridge_issues",
        "users",
        ["employee_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # Restore printer_assignments.user_id to reference users.id
    op.create_foreign_key(
        "printer_assignments_user_id_fkey",
        "printer_assignments",
        "users",
        ["user_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    # Note: Data truncated in upgrade cannot be restored in downgrade