import asyncio
import sys
from pathlib import Path

from sqlalchemy import select

# Allow running this script from the backend directory
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.user import User, UserRole


async def create_master_admin():
    employee_id = "ADM001"
    username = "masteradmin"
    email = "admin@mmrcl.co.in"
    password = "Admin@123456"

    async with AsyncSessionLocal() as db:

        # Check whether user already exists
        result = await db.execute(
            select(User).where(
                (User.email == email)
                | (User.username == username)
                | (User.employee_id == employee_id)
            )
        )

        existing_user = result.scalar_one_or_none()

        if existing_user:
            print("User already exists.")
            print(f"ID: {existing_user.id}")
            print(f"Username: {existing_user.username}")
            print(f"Email: {existing_user.email}")
            print(f"Role: {existing_user.role.value}")
            return

        admin = User(
            employee_id=employee_id,
            username=username,
            email=email,
            password_hash=hash_password(password),
            role=UserRole.master_admin,
            department="IT",
            is_active=True,
        )

        db.add(admin)

        await db.commit()
        await db.refresh(admin)

        print()
        print("Master Admin created successfully.")
        print("--------------------------------")
        print(f"ID:           {admin.id}")
        print(f"Employee ID:  {admin.employee_id}")
        print(f"Username:     {admin.username}")
        print(f"Email:        {admin.email}")
        print(f"Role:         {admin.role.value}")
        print(f"Active:       {admin.is_active}")
        print("--------------------------------")
        print("Login credentials:")
        print(f"Email:        {email}")
        print(f"Password:     {password}")


if __name__ == "__main__":
    asyncio.run(create_master_admin())