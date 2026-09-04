from datetime import date

from pydantic import BaseModel, ConfigDict


class CartridgeIssueCreate(BaseModel):
    request_id: int


class CartridgeIssueResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    request_id: int
    employee_id: int
    location_id: int
    engineer_id: int
    printer_id: int
    cartridge_id: int
    quantity: int
    issue_date: date
    remarks: str | None