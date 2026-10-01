from datetime import date
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class ReportsQueryParams(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class SummaryCard(BaseModel):
    issued: int
    received: int
    adjusted: int
    net: int
    pending: int


class RequestStatusCard(BaseModel):
    pending: int
    approved: int
    installed: int
    rejected: int


class InventorySummaryCard(BaseModel):
    total_cartridges: int
    total_available: int
    total_issued_all_time: int
    low_stock_count: int
    out_of_stock_count: int


class TopCartridgeRow(BaseModel):
    cartridge_id: int
    cartridge_model: str
    cartridge_color: str
    total_issued: int
    issued_percentage: float
    available: int
    status: str


class LocationConsumptionRow(BaseModel):
    location_id: int
    location_name: str
    total_issued: int
    request_count: int
    issued_percentage: float


class MonthlyTrendRow(BaseModel):
    month: date
    issued: int
    received: int
    adjusted: int


class EngineerActivityRow(BaseModel):
    engineer_id: int
    engineer_name: str
    engineer_employee_id: str
    total_issued: int
    request_count: int


class LowStockItemRow(BaseModel):
    cartridge_id: int
    cartridge_model: str
    cartridge_color: str
    reorder_level: int
    available: int
    printer_model: str
    location_name: str
    status: str


class ReportsResponse(BaseModel):
    summary: SummaryCard
    request_status: RequestStatusCard
    inventory_summary: InventorySummaryCard
    top_cartridges: List[TopCartridgeRow]
    location_consumption: List[LocationConsumptionRow]
    monthly_trend: List[MonthlyTrendRow]
    engineer_activity: List[EngineerActivityRow]
    low_stock_items: List[LowStockItemRow]
