from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.engineer import Engineer
from app.schemas.engineer import (
    EngineerCreate,
    EngineerUpdate,
)


async def list_engineers(
    db: AsyncSession,
    include_inactive: bool = False,
) -> list[Engineer]:
    query = select(Engineer)

    if not include_inactive:
        query = query.where(
            Engineer.is_active.is_(True)
        )

    query = query.order_by(
        Engineer.name
    )

    result = await db.execute(query)

    return list(result.scalars().all())


async def get_engineer(
    db: AsyncSession,
    engineer_id: int,
) -> Engineer | None:
    result = await db.execute(
        select(Engineer).where(
            Engineer.id == engineer_id
        )
    )

    return result.scalar_one_or_none()


async def create_engineer(
    db: AsyncSession,
    data: EngineerCreate,
) -> Engineer:
    employee_id = data.employee_id.strip()
    name = data.name.strip()

    existing_employee_id = await db.execute(
        select(Engineer).where(
            Engineer.employee_id == employee_id
        )
    )

    if existing_employee_id.scalar_one_or_none():
        raise ValueError(
            "An engineer with this employee ID already exists."
        )

    existing_name = await db.execute(
        select(Engineer).where(
            Engineer.name == name
        )
    )

    if existing_name.scalar_one_or_none():
        raise ValueError(
            "An engineer with this name already exists."
        )

    engineer = Engineer(
        employee_id=employee_id,
        name=name,
        is_active=data.is_active,
    )

    db.add(engineer)

    await db.flush()
    await db.refresh(engineer)

    return engineer


async def update_engineer(
    db: AsyncSession,
    engineer_id: int,
    data: EngineerUpdate,
) -> Engineer:
    engineer = await get_engineer(
        db=db,
        engineer_id=engineer_id,
    )

    if engineer is None:
        raise ValueError(
            "Engineer not found."
        )

    update_data = data.model_dump(
        exclude_unset=True
    )

    if "name" in update_data:
        name = update_data["name"].strip()

        existing_name = await db.execute(
            select(Engineer).where(
                Engineer.name == name,
                Engineer.id != engineer_id,
            )
        )

        if existing_name.scalar_one_or_none():
            raise ValueError(
                "An engineer with this name already exists."
            )

        update_data["name"] = name

    if "employee_id" in update_data:
        employee_id = update_data["employee_id"].strip()

        existing_employee_id = await db.execute(
            select(Engineer).where(
                Engineer.employee_id == employee_id,
                Engineer.id != engineer_id,
            )
        )

        if existing_employee_id.scalar_one_or_none():
            raise ValueError(
                "An engineer with this employee ID already exists."
            )

        update_data["employee_id"] = employee_id

    for field, value in update_data.items():
        setattr(
            engineer,
            field,
            value,
        )

    await db.flush()
    await db.refresh(engineer)

    return engineer