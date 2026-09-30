"""Shared numeric/business-rule constants used across services."""

# A cartridge is "Low Stock" when its Available quantity is at or below
# this fraction of its Total (Available + Issued). Replaces the old
# per-cartridge Cartridge.reorder_level threshold.
LOW_STOCK_THRESHOLD_RATIO = 0.25
