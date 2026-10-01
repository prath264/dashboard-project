import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import select

BACKEND_ROOT = Path(__file__).resolve().parents[1]

if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

load_dotenv(BACKEND_ROOT / ".env")

from app.core.security import verify_password
from app.db.session import AsyncSessionLocal
from app.models.user import User


async def main() -> None:

    email = "admin@mmrcl.co.in"
    password = "Admin@123456"

    async with AsyncSessionLocal() as session:

        result = await session.execute(
            select(User).where(
                User.email == email
            )
        )

        user = result.scalar_one_or_none()

        if user is None:
            print("USER NOT FOUND")
            return

        print("USER FOUND")
        print("ID:", user.id)
        print("Email:", user.email)
        print("Username:", user.username)
        print("Role:", user.role.value)
        print("Active:", user.is_active)

        print()

        valid = verify_password(
            password,
            user.password_hash,
        )

        print(
            "PASSWORD VALID:",
            valid,
        )


if __name__ == "__main__":
    asyncio.run(main())