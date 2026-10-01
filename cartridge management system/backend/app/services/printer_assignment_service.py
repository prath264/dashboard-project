from datetime import datetime, timezone

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.models.location import Location
from app.models.printer import Printer
from app.models.printer_assignment import PrinterAssignment
from app.models.user import User
from app.schemas.printer_assignment import PrinterAssignmentCreate


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def list_active_assignments(
    db: AsyncSession,
) -> list[dict]:
    result = await db.execute(
        select(
            PrinterAssignment,
            Employee.name.label("user_name"),
            Printer.model.label("printer_model"),
            Printer.location_id,
            Location.name.label("location_name"),
        )
        .join(Employee, Employee.id == PrinterAssignment.user_id)
        .join(Printer, Printer.id == PrinterAssignment.printer_id)
        .join(Location, Location.id == Printer.location_id)
        .where(PrinterAssignment.unassigned_at.is_(None))
        .order_by(PrinterAssignment.assigned_at.desc())
    )

    return [
        {
            "id": assignment.id,
            "user_id": assignment.user_id,
            "user_name": user_name,
            "printer_id": assignment.printer_id,
            "printer_model": printer_model,
            "location_id": location_id,
            "location_name": location_name,
            "assigned_at": assignment.assigned_at,
            "unassigned_at": assignment.unassigned_at,
            "assigned_by": assignment.assigned_by,
        }
        for assignment, user_name, printer_model, location_id, location_name in result.all()
    ]


async def create_assignment(
    db: AsyncSession,
    data: PrinterAssignmentCreate,
    assigned_by: int,
) -> dict | None:
    user_result = await db.execute(
        select(Employee).where(Employee.id == data.user_id, Employee.is_active.is_(True))
    )
    user = user_result.scalar_one_or_none()

    printer_result = await db.execute(
        select(Printer).where(Printer.id == data.printer_id, Printer.is_active.is_(True))
    )
    printer = printer_result.scalar_one_or_none()

    if user is None or printer is None:
        return None

    current_result = await db.execute(
        select(PrinterAssignment).where(
            PrinterAssignment.printer_id == data.printer_id,
            PrinterAssignment.unassigned_at.is_(None),
        )
    )
    current = current_result.scalar_one_or_none()
    if current is not None:
        current.unassigned_at = _now()

    assignment = PrinterAssignment(
        user_id=data.user_id,
        printer_id=data.printer_id,
        assigned_by=assigned_by,
    )
    db.add(assignment)
    await db.flush()

    rows = await list_active_assignments_for_ids(db, assignment.id)
    return rows[0] if rows else None


async def list_active_assignments_for_ids(
    db: AsyncSession,
    assignment_id: int,
) -> list[dict]:
    result = await db.execute(
        select(
            PrinterAssignment,
            Employee.name.label("user_name"),
            Printer.model.label("printer_model"),
            Printer.location_id,
            Location.name.label("location_name"),
        )
        .join(Employee, Employee.id == PrinterAssignment.user_id)
        .join(Printer, Printer.id == PrinterAssignment.printer_id)
        .join(Location, Location.id == Printer.location_id)
        .where(PrinterAssignment.id == assignment_id)
    )
    return [
        {
            "id": assignment.id,
            "user_id": assignment.user_id,
            "user_name": user_name,
            "printer_id": assignment.printer_id,
            "printer_model": printer_model,
            "location_id": location_id,
            "location_name": location_name,
            "assigned_at": assignment.assigned_at,
            "unassigned_at": assignment.unassigned_at,
            "assigned_by": assignment.assigned_by,
        }
        for assignment, user_name, printer_model, location_id, location_name in result.all()
    ]


async def unassign(
    db: AsyncSession,
    assignment_id: int,
) -> bool:
    result = await db.execute(
        select(PrinterAssignment).where(PrinterAssignment.id == assignment_id)
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        return False

    if assignment.unassigned_at is None:
        assignment.unassigned_at = _now()
        await db.flush()
    return True


async def get_auto_fill_for_user(
    db: AsyncSession,
    user_id: int,
) -> dict | None:
    personal_result = await db.execute(
        select(Printer.id, Printer.location_id)
        .join(
            PrinterAssignment,
            and_(
                PrinterAssignment.printer_id == Printer.id,
                PrinterAssignment.unassigned_at.is_(None),
            ),
        )
        .where(
            PrinterAssignment.user_id == user_id,
            Printer.is_active.is_(True),
        )
        .order_by(PrinterAssignment.assigned_at.desc())
        .limit(1)
    )
    personal = personal_result.one_or_none()
    if personal is not None:
        return {"printer_id": personal.id, "location_id": personal.location_id}

    employee_result = await db.execute(
        select(Employee.department).where(Employee.id == user_id, Employee.is_active.is_(True))
    )
    department = employee_result.scalar_one_or_none()
    if not department:
        return None

    active_assignment = (
        select(PrinterAssignment.printer_id)
        .where(PrinterAssignment.unassigned_at.is_(None))
        .scalar_subquery()
    )
    shared_result = await db.execute(
        select(Printer.id, Printer.location_id)
        .where(
            Printer.is_active.is_(True),
            Printer.department == department,
            ~Printer.id.in_(active_assignment),
        )
        .order_by(Printer.id)
        .limit(1)
    )
    shared = shared_result.one_or_none()
    if shared is None:
        return None
    return {"printer_id": shared.id, "location_id": shared.location_id}
