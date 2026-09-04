from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate


class UserService:

    @staticmethod
    async def get_by_email(
        db: AsyncSession,
        email: str,
    ) -> User | None:

        result = await db.execute(
            select(User).where(
                User.email == email
            )
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        user_id: int,
    ) -> User | None:

        result = await db.execute(
            select(User).where(
                User.id == user_id
            )
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def list_users(
        db: AsyncSession,
        *,
        page: int,
        page_size: int,
        role: UserRole | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[User], int]:

        query = select(User)

        count_query = (
            select(func.count())
            .select_from(User)
        )

        if role is not None:
            query = query.where(
                User.role == role
            )

            count_query = count_query.where(
                User.role == role
            )

        if is_active is not None:
            query = query.where(
                User.is_active == is_active
            )

            count_query = count_query.where(
                User.is_active == is_active
            )

        total = (
            await db.execute(count_query)
        ).scalar_one()

        result = await db.execute(
            query
            .order_by(User.id.desc())
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
    async def create_user(
        db: AsyncSession,
        payload: UserCreate,
    ) -> User:

        existing_email = (
            await UserService.get_by_email(
                db,
                payload.email,
            )
        )

        if existing_email:
            raise ValueError(
                "Email already registered"
            )

        existing_username = await db.execute(
            select(User).where(
                User.username == payload.username
            )
        )

        if existing_username.scalar_one_or_none():
            raise ValueError(
                "Username already registered"
            )

        existing_employee = await db.execute(
            select(User).where(
                User.employee_id
                == payload.employee_id
            )
        )

        if existing_employee.scalar_one_or_none():
            raise ValueError(
                "Employee ID already registered"
            )

        user = User(
            employee_id=payload.employee_id,
            username=payload.username,
            email=payload.email,
            password_hash=hash_password(
                payload.password
            ),
            role=payload.role,
            department=payload.department,
            is_active=payload.is_active,
        )

        db.add(user)

        await db.flush()
        await db.refresh(user)

        return user

    @staticmethod
    async def update_user(
        db: AsyncSession,
        user: User,
        payload: UserUpdate,
    ) -> User:

        data = payload.model_dump(
            exclude_unset=True
        )

        password = data.pop(
            "password",
            None,
        )

        for field, value in data.items():
            setattr(
                user,
                field,
                value,
            )

        if password:
            user.password_hash = hash_password(
                password
            )

        await db.flush()
        await db.refresh(user)

        return user