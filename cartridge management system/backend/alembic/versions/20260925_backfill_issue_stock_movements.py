"""backfill ISSUE stock movements for existing cartridge issues

The Inventory page's "Issued" column is the sum of ISSUE rows in
stock_movements. The historical import (20260923_replace_mmrcl_data) created
cartridge_issues but no stock movements, so Issued showed 0 for every
cartridge. This adds one ISSUE movement per cartridge issue that does not
already have one. Inventory quantities are NOT changed.

Revision ID: 20260925_backfill_issue_stock
Revises: 20260923_replace_mmrcl_data
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260925_backfill_issue_stock"
down_revision: Union[str, None] = "20260923_replace_mmrcl_data"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BACKFILL_TABLE = "backfill_20260925_stock_movement_ids"


def upgrade() -> None:
    op.create_table(
        BACKFILL_TABLE,
        sa.Column("stock_movement_id", sa.Integer(), primary_key=True),
    )

    op.execute(
        """
        WITH inserted AS (
            INSERT INTO stock_movements
                (
                    cartridge_id,
                    movement_type,
                    quantity,
                    performed_by,
                    reference_id,
                    remarks,
                    created_at
                )
            SELECT
                i.cartridge_id,
                CAST('ISSUE' AS stock_movement_type),
                i.quantity,
                COALESCE(r.approved_by, r.requester_id),
                i.id,
                i.remarks,
                COALESCE(
                    r.approved_at,
                    r.requested_date,
                    CAST(i.issue_date AS TIMESTAMP)
                )
            FROM cartridge_issues i
            JOIN cartridge_requests r ON r.id = i.request_id
            WHERE NOT EXISTS (
                SELECT 1
                FROM stock_movements m
                WHERE m.movement_type = CAST('ISSUE' AS stock_movement_type)
                  AND m.reference_id = i.id
            )
            ORDER BY i.id
            RETURNING id
        )
        INSERT INTO backfill_20260925_stock_movement_ids (stock_movement_id)
        SELECT id FROM inserted
        """
    )


def downgrade() -> None:
    # Remove only the movements inserted by this migration.
    op.execute(
        """
        DELETE FROM stock_movements
        WHERE id IN (
            SELECT stock_movement_id
            FROM backfill_20260925_stock_movement_ids
        )
        """
    )
    op.drop_table(BACKFILL_TABLE)
