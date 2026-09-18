from pydantic import BaseModel


class PrinterAssignmentAutoFill(BaseModel):
    printer_id: int
    location_id: int
