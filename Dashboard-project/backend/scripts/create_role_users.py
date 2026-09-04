import asyncio
import sys
from pathlib import Path

from sqlalchemy import select

BACKEND_ROOT = Path(__file__).resolve().parents[1]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole


USERS = [
    {
        "employee_id": "FMS001",
        "username": "fmsit",
        "email": "fmsit@mmrcl.com",
        "password": "FmsIT@123456",
        "role": UserRole.fms_it,
        "department": "IT",
    },
    {
        "employee_id": "ITA001",
        "username": "itadmin",
        "email": "itadmin@mmrcl.com",
        "password": "ITAdmin@123456",
        "role": UserRole.it_admin,
        "department": "IT",
    },
]


async def create_users():
    async with AsyncSessionLocal() as session:

        for data in USERS:

            result = await session.execute(
                select(User).where(
                    (User.email == data["email"])
                    | (User.username == data["username"])
                    | (User.employee_id == data["employee_id"])
                )
            )

            existing_user = result.scalar_one_or_none()

            if existing_user:
                print(
                    f"Already exists: "
                    f"{existing_user.email} "
                    f"({existing_user.role.value})"
                )
                continue

            user = User(
                employee_id=data["employee_id"],
                username=data["username"],
                email=data["email"],
                password_hash=hash_password(
                    data["password"]
                ),
                role=data["role"],
                department=data["department"],
                is_active=True,
            )

            session.add(user)

        await session.commit()

    print()
    print("Role test users created.")
    print()
    print("FMS IT")
    print("Email:    fmsit@mmrcl.com")
    print("Password: FmsIT@123456")
    print()
    print("IT ADMIN")
    print("Email:    itadmin@mmrcl.com")
    print("Password: ITAdmin@123456")


if __name__ == "__main__":
    asyncio.run(create_users())