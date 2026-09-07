from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ReportsQueryParams(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class SummaryCard(BaseModel):
    issued: int
    received: int
    net: int
    pending: int


class TopCartridgeRow(BaseModel):
    cartridge_id: int
    cartridge_model: str
    total_issued: int


class LocationConsumptionRow(BaseModel):
    location_id: int
    location_name: str
    total_issued: int


class MonthlyTrendRow(BaseModel):
    month: date
    issued: int
    received: int


class ReportsResponse(BaseModel):
    summary: SummaryCard
    top_cartridges: list[TopCartridgeRow]
    location_consumption: list[LocationConsumptionRow]
    monthly_trend: list[MonthlyTrendRow]