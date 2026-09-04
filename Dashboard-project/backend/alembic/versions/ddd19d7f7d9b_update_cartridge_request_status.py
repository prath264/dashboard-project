"""update cartridge request status

Revision ID: update_cartridge_request_status
Revises: 73f1ee16d95c
Create Date: 2026-08-24
"""

from typing import Sequence, Union

from alembic import op


revision: str = "update_cartridge_request_status"
down_revision: Union[str, None] = "73f1ee16d95c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TYPE cartridge_request_status
        RENAME TO cartridge_request_status_old
        """
    )

    op.execute(
        """
        CREATE TYPE cartridge_request_status AS ENUM (
            'PENDING',
            'APPROVED',
            'REJECTED',
            'CANCELLED',
            'INSTALLED'
        )
        """
    )

    op.execute(
        """
        ALTER TABLE cartridge_requests
        ALTER COLUMN status DROP DEFAULT
        """
    )

    op.execute(
        """
        ALTER TABLE cartridge_requests
        ALTER COLUMN status
        TYPE cartridge_request_status
        USING (
            CASE status::text
                WHEN 'ISSUED' THEN 'INSTALLED'
                ELSE status::text
            END
        )::cartridge_request_status
        """
    )

    op.execute(
        """
        DROP TYPE cartridge_request_status_old
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TYPE cartridge_request_status
        RENAME TO cartridge_request_status_new
        """
    )

    op.execute(
        """
        CREATE TYPE cartridge_request_status AS ENUM (
            'PENDING',
            'APPROVED',
            'REJECTED',
            'CANCELLED',
            'ISSUED'
        )
        """
    )

    op.execute(
        """
        ALTER TABLE cartridge_requests
        ALTER COLUMN status
        TYPE cartridge_request_status
        USING (
            CASE status::text
                WHEN 'INSTALLED' THEN 'ISSUED'
                ELSE status::text
            END
        )::cartridge_request_status
        """
    )

    op.execute(
        """
        DROP TYPE cartridge_request_status_new
        """
    )