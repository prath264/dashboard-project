from fastapi import APIRouter, Depends, HTTPException, Query, status

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.common import ApiResponse, Meta
from app.schemas.employee import EmployeeCreate, EmployeeResponse, EmployeeUpdate
from app.services.employee_service import EmployeeService


router = APIRouter()


@router.get(
    "",
    response_model=ApiResponse[list[EmployeeResponse]],
)
async def list_employees(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_active: bool | None = None,
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[list[EmployeeResponse]]:

    employees, total = await EmployeeService.list_employees(
        db,
        page=page,
        page_size=page_size,
        is_active=is_active,
        search=search,
    )

    return ApiResponse(
        data=[
            EmployeeResponse.model_validate(employee)
            for employee in employees
        ],
        meta=Meta(
            page=page,
            page_size=page_size,
            total=total,
        ),
    )


@router.post(
    "",
    response_model=ApiResponse[EmployeeResponse],
    status_code=status.HTTP_201_CREATED,
)
async def create_employee(
    payload: EmployeeCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
) -> ApiResponse[EmployeeResponse]:

    try:
        employee = await EmployeeService.create_employee(
            db,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return ApiResponse(
        data=EmployeeResponse.model_validate(employee)
    )


@router.get(
    "/{employee_id}",
    response_model=ApiResponse[EmployeeResponse],
)
async def get_employee(
    employee_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ApiResponse[EmployeeResponse]:

    employee = await EmployeeService.get_by_id(
        db,
        employee_id,
    )

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    return ApiResponse(
        data=EmployeeResponse.model_validate(employee)
    )


@router.patch(
    "/{employee_id}",
    response_model=ApiResponse[EmployeeResponse],
)
async def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(
        require_roles(
            UserRole.it_admin,
            UserRole.master_admin,
        )
    ),
) -> ApiResponse[EmployeeResponse]:

    employee = await EmployeeService.get_by_id(
        db,
        employee_id,
    )

    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    if payload.employee_id is not None:
        existing = await EmployeeService.get_by_employee_id(
            db,
            payload.employee_id,
        )
        if existing and existing.id != employee_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Employee ID already registered",
            )

    employee = await EmployeeService.update_employee(
        db,
        employee,
        payload,
    )

    return ApiResponse(
        data=EmployeeResponse.model_validate(employee)
    )