from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import (
    auth,
    users,
    cartridge_issues,
    cartridge_requests,
    printers,
    cartridges,
    inventory,
    locations,
    engineers,
    dashboard,
    stock_movements,
)


settings = get_settings()


app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


API_V1 = "/api/v1"


app.include_router(
    auth.router,
    prefix=f"{API_V1}/auth",
    tags=["auth"],
)


app.include_router(
    users.router,
    prefix=f"{API_V1}/users",
    tags=["users"],
)


app.include_router(
    cartridge_requests.router,
    prefix=f"{API_V1}/cartridge-requests",
    tags=["Cartridge Requests"],
)


app.include_router(
    cartridge_issues.router,
    prefix=f"{API_V1}/cartridge-issues",
    tags=["Cartridge Issues"],
)


app.include_router(
    printers.router,
    prefix=f"{API_V1}/printers",
    tags=["Printers"],
)


app.include_router(
    cartridges.router,
    prefix=f"{API_V1}/cartridges",
    tags=["Cartridges"],
)


app.include_router(
    inventory.router,
    prefix=f"{API_V1}/inventory",
    tags=["Inventory"],
)


app.include_router(
    locations.router,
    prefix=f"{API_V1}/locations",
    tags=["Locations"],
)


app.include_router(
    engineers.router,
    prefix=f"{API_V1}/engineers",
    tags=["Engineers"],
)


app.include_router(
    dashboard.router,
    prefix=f"{API_V1}/dashboard",
    tags=["Dashboard"],
)


app.include_router(
    stock_movements.router,
    prefix=f"{API_V1}/stock-movements",
    tags=["Stock Movements"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}