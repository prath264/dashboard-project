from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate


class EmployeeService:

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        employee_id: int,
    ) -> Employee | None:

        result = await db.execute(
            select(Employee).where(
                Employee.id == employee_id
            )
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_employee_id(
        db: AsyncSession,
        employee_id: str,
    ) -> Employee | None:

        result = await db.execute(
            select(Employee).where(
                Employee.employee_id == employee_id
            )
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def list_employees(
        db: AsyncSession,
        *,
        page: int,
        page_size: int,
        is_active: bool | None = None,
        search: str | None = None,
    ) -> tuple[list[Employee], int]:

        query = select(Employee)

        count_query = (
            select(func.count())
            .select_from(Employee)
        )

        if is_active is not None:
            query = query.where(
                Employee.is_active == is_active
            )

            count_query = count_query.where(
                Employee.is_active == is_active
            )

        if search is not None:
            search_term = f"%{search}%"
            search_filter = or_(
                Employee.employee_id.ilike(search_term),
                Employee.name.ilike(search_term),
                Employee.department.ilike(search_term),
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)

        total = (
            await db.execute(count_query)
        ).scalar_one()

        result = await db.execute(
            query
            .order_by(Employee.id.desc())
            .offset(
                (page - 1) * page_size
            )
            .limit(page_size)
        )

        return (
            list(result.scalars().all()),
            total,
        )

    @staticmethod
    async def create_employee(
        db: AsyncSession,
        payload: EmployeeCreate,
    ) -> Employee:

        existing = await EmployeeService.get_by_employee_id(
            db,
            payload.employee_id,
        )

        if existing:
            raise ValueError("Employee ID already registered")

        employee = Employee(
            employee_id=payload.employee_id,
            name=payload.name,
            department=payload.department,
            is_active=payload.is_active,
        )

        db.add(employee)

        await db.flush()
        await db.refresh(employee)

        return employee

    @staticmethod
    async def update_employee(
        db: AsyncSession,
        employee: Employee,
        payload: EmployeeUpdate,
    ) -> Employee:

        data = payload.model_dump(
            exclude_unset=True
        )

        for field, value in data.items():
            setattr(
                employee,
                field,
                value,
            )

        await db.flush()
        await db.refresh(employee)

        return employee