import asyncio
from app.db.session import engine
from sqlalchemy import text


async def check():
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'cartridge_requests' ORDER BY column_name"
            )
        )
        print("cartridge_requests columns:", [r[0] for r in result])

        result = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'engineers' ORDER BY column_name"
            )
        )
        print("engineers columns:", [r[0] for r in result])


asyncio.run(check())