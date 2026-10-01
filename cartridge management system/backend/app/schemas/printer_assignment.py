from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PrinterAssignmentCreate(BaseModel):
    user_id: int
    printer_id: int


class PrinterAssignmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    user_name: str
    printer_id: int
    printer_model: str
    location_id: int
    location_name: str
    assigned_at: datetime
    unassigned_at: datetime | None
    assigned_by: int
