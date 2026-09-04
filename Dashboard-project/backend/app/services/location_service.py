
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.location import Location
from app.models.printer import Printer
from app.schemas.location import LocationCreate, LocationUpdate


async def list_locations(
    db: AsyncSession,
) -> list[Location]:
    """
    Return active locations only.

    Used by forms and dropdowns.
    """
    result = await db.execute(
        select(Location)
        .where(Location.is_active.is_(True))
        .order_by(Location.name.asc())
    )

    return list(result.scalars().all())


async def list_locations_with_counts(
    db: AsyncSession,
) -> list[dict]:
    """
    Return all locations, including inactive locations,
    together with their printer count.

    Used by the Location management page.
    """
    result = await db.execute(
        select(
            Location,
            func.count(Printer.id).label("printer_count"),
        )
        .outerjoin(
            Printer,
            Printer.location_id == Location.id,
        )
        .group_by(Location.id)
        .order_by(Location.name.asc())
    )

    rows = result.all()

    return [
        {
            "id": location.id,
            "name": location.name,
            "is_active": location.is_active,
            "created_at": location.created_at,
            "printer_count": printer_count,
        }
        for location, printer_count in rows
    ]


async def create_location(
    db: AsyncSession,
    data: LocationCreate,
) -> Location:
    location = Location(
        name=data.name,
        is_active=data.is_active,
    )

    db.add(location)

    await db.flush()
    await db.refresh(location)

    return location


async def update_location(
    db: AsyncSession,
    location_id: int,
    data: LocationUpdate,
) -> Location | None:
    result = await db.execute(
        select(Location).where(
            Location.id == location_id
        )
    )

    location = result.scalar_one_or_none()

    if location is None:
        return None

    if data.name is not None:
        location.name = data.name

    if data.is_active is not None:
        location.is_active = data.is_active

    await db.flush()
    await db.refresh(location)

    return location

