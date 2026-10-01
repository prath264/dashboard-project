from pydantic import BaseModel


class InventoryCartridgeResponse(BaseModel):
    cartridge_id: int
    cartridge: str
    color: str
    printer_id: int
    printer: str
    total: int
    available: int
    issued: int
    reorder: int
    status: str


class InventoryPrinterResponse(BaseModel):
    id: int
    model: str
    serial: str | None
    location: str
    cartridge: str
    status: str