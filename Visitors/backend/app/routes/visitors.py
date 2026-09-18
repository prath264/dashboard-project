from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import EmailStr
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas import ActionResponse, QRScanRequest, TokenActionResponse, VisitorResponse
from ..services import get_visitor_service
from ..services.logger import get_logger
from ..services.visitor_service import VisitorService


logger = get_logger("routes.visitors")
router = APIRouter(prefix="/api/visitors", tags=["visitors"])


@router.post("/register", response_model=VisitorResponse, status_code=201)
async def register_visitor(
    name: Annotated[str, Form(...)],
    phone: Annotated[str, Form(...)],
    email: Annotated[EmailStr, Form(...)],
    host_employee: Annotated[str, Form(...)],
    purpose: Annotated[str, Form(...)],
    host_email: Annotated[str | None, Form()] = None,
    selfie: UploadFile | None = File(None),
    service: VisitorService = Depends(get_visitor_service),
):
    """
    Register a new visitor with pending status.

    All fields are required except host_email and selfie.
    Phone number and email are validated at the schema level.
    """
    selfie_bytes = None
    selfie_filename = None
    if selfie and selfie.filename:
        selfie_bytes = await selfie.read()
        selfie_filename = selfie.filename

    return service.register_visitor(
        name=name,
        phone=phone,
        email=str(email),
        host_employee=host_employee,
        host_email=host_email,
        purpose=purpose,
        selfie=selfie_bytes,
        selfie_filename=selfie_filename,
    )


@router.get("", response_model=list[VisitorResponse])
def list_visitors(service = Depends(get_visitor_service)):
    """List all visitors ordered by creation date (newest first)."""
    return service.list_visitors()


@router.get("/{visitor_id}", response_model=VisitorResponse)
def get_visitor(visitor_id: int, service = Depends(get_visitor_service)):
    """Get a single visitor by ID."""
    return service.get_visitor(visitor_id)


@router.post("/{visitor_id}/approve", response_model=ActionResponse)
def approve_visitor(visitor_id: int, service = Depends(get_visitor_service)):
    """
    Approve a pending visitor and generate a QR code.

    Only visitors with PENDING status can be approved.
    """
    return service.approve_visitor(visitor_id)


@router.post("/{visitor_id}/reject", response_model=ActionResponse)
def reject_visitor(visitor_id: int, service = Depends(get_visitor_service)):
    """
    Reject a pending visitor.

    Only visitors with PENDING status can be rejected.
    """
    return service.reject_visitor(visitor_id)


@router.post("/check-in", response_model=ActionResponse)
def check_in(payload: QRScanRequest, service = Depends(get_visitor_service)):
    """
    Check in a visitor using a QR code.

    Visitor must have APPROVED status and an active QR code.
    """
    return service.check_in(payload)


@router.post("/check-out", response_model=ActionResponse)
def check_out(payload: QRScanRequest, service = Depends(get_visitor_service)):
    """
    Check out a visitor using a QR code.

    Visitor must have CHECKED_IN status and an active QR code.
    """
    return service.check_out(payload)


@router.get("/{visitor_id}/qr")
def get_qr_image(visitor_id: int, service = Depends(get_visitor_service)):
    """
    Get the QR code image for an approved visitor.

    Returns a PNG image stream. Only works for visitors with
    APPROVED status and an active QR code.
    """
    buffer = service.get_qr_image(visitor_id)
    return StreamingResponse(buffer, media_type="image/png")


@router.get("/approve/{token}", response_class=HTMLResponse)
def approve_by_token(token: str, service = Depends(get_visitor_service)):
    """
    Approve a pending visitor using a secure approval token from email.

    Validates the token, checks the visit is still pending,
    updates status to APPROVED, and returns an HTML confirmation page.
    """
    result = service.approve_by_token(token)
    return _token_response_html(result)


@router.get("/reject/{token}", response_class=HTMLResponse)
def reject_by_token(token: str, service = Depends(get_visitor_service)):
    """
    Reject a pending visitor using a secure approval token from email.

    Validates the token, checks the visit is still pending,
    updates status to REJECTED, and returns an HTML confirmation page.
    """
    result = service.reject_by_token(token)
    return _token_response_html(result)


def _token_response_html(result) -> str:
    """Generate a simple HTML confirmation page for token-based actions."""
    status_colors = {
        "approved": "#28a745",
        "rejected": "#dc3545",
        "already_handled": "#ffc107",
    }
    color = status_colors.get(result.status, "#6c757d")

    status_messages = {
        "approved": "Approved",
        "rejected": "Rejected",
        "already_handled": "Already Handled",
    }
    status_display = status_messages.get(result.status, result.status.title())

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visitor {status_display}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            text-align: center;
            background-color: #f5f5f5;
        }}
        .card {{
            background: white;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .status {{
            display: inline-block;
            padding: 12px 24px;
            border-radius: 4px;
            font-size: 24px;
            font-weight: 600;
            color: white;
            background-color: {color};
            margin-bottom: 20px;
        }}
        .message {{
            font-size: 16px;
            color: #333;
            line-height: 1.5;
        }}
        .visitor-name {{
            font-weight: 600;
            color: #007bff;
        }}
    </style>
</head>
<body>
    <div class="card">
        <div class="status">{status_display}</div>
        <p class="message">{result.message}</p>
        <p class="message">Visitor: <span class="visitor-name">{result.visitor_name}</span></p>
    </div>
</body>
</html>"""