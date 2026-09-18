import logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from .database import Base, engine
from .routes import users, visitors
from .services.logger import setup_logging

load_dotenv()

# Initialize centralized logging before anything else
setup_logging(level=logging.INFO)

Base.metadata.create_all(bind=engine)


def _ensure_host_email_column() -> None:
    """Ensure host_email column exists for legacy databases."""
    inspector = inspect(engine)
    if "visitors" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("visitors")}
    if "host_email" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE visitors ADD COLUMN host_email VARCHAR(255)"))


_ensure_host_email_column()

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(title="Visitor Management System", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.include_router(users.router)
app.include_router(visitors.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}