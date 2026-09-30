"""add employee_id to cartridge_requests

cartridge_requests.requester_id references users.id (the logged-in user who
logged the request). The employee the cartridge is issued for was previously
guessed at install time by matching users.employee_id to employees.employee_id.
This adds an explicit cartridge_requests.employee_id -> employees.id.

Revision ID: 20260924_add_request_employee
Revises: 20260925_backfill_issue_stock
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260924_add_request_employee"
down_revision: Union[str, None] = "20260925_backfill_issue_stock"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cartridge_requests",
        sa.Column("employee_id", sa.Integer(), nullable=True),
    )

    # 1. Requests that already have an issue: use the issue's employee.
    op.execute(
        """
        UPDATE cartridge_requests r
        SET employee_id = i.employee_id
        FROM cartridge_issues i
        WHERE i.request_id = r.id
        """
    )

    # 2. Remaining requests: fall back to the old users.employee_id ->
    #    employees.employee_id link.
    op.execute(
        """
        UPDATE cartridge_requests r
        SET employee_id = e.id
        FROM users u
        JOIN employees e ON e.employee_id = u.employee_id
        WHERE u.id = r.requester_id
          AND r.employee_id IS NULL
        """
    )

    # 3. Never guess: stop if any request still has no employee.
    missing = op.get_bind().execute(
        sa.text(
            "SELECT count(*) FROM cartridge_requests WHERE employee_id IS NULL"
        )
    ).scalar_one()
    if missing:
        raise RuntimeError(
            f"{missing} cartridge_requests row(s) have no resolvable employee. "
            "Fix or delete them before running this migration."
        )

    op.alter_column(
        "cartridge_requests",
        "employee_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.create_foreign_key(
        "cartridge_requests_employee_id_fkey",
        "cartridge_requests",
        "employees",
        ["employee_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_index(
        "ix_cartridge_requests_employee_id",
        "cartridge_requests",
        ["employee_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_cartridge_requests_employee_id",
        table_name="cartridge_requests",
    )
    op.drop_constraint(
        "cartridge_requests_employee_id_fkey",
        "cartridge_requests",
        type_="foreignkey",
    )
    op.drop_column("cartridge_requests", "employee_id")
