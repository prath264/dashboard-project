
import io
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import qrcode
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models import Visitor, VisitorStatus
from ..schemas import ActionResponse, QRScanRequest, TokenActionResponse, VisitorResponse
from ..services.logger import get_logger
from ..services.notification_service import notify_host, notify_visitor


logger = get_logger("visitor_service")


class VisitorService:
    """
    Business logic for visitor management operations.

    This service encapsulates all visitor-related workflows:
    registration, approval/rejection, check-in/check-out, and QR code handling.

    Routes should only handle HTTP concerns and delegate business logic
    to this service.
    """

    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()
        self.upload_dir = Path(__file__).resolve().parent.parent.parent / "uploads"
        self.upload_dir.mkdir(exist_ok=True)

    def _serialize(self, visitor: Visitor) -> VisitorResponse:
        """Convert a Visitor ORM model to a VisitorResponse Pydantic model."""
        return VisitorResponse.model_validate(visitor)

    def _save_selfie(
        self,
        selfie: Optional[bytes],
        filename: Optional[str],
    ) -> Optional[str]:
        """Save uploaded selfie and return the stored filename."""
        if not selfie or not filename:
            return None

        ext = Path(filename).suffix or ".jpg"
        stored_name = f"{uuid.uuid4().hex}{ext}"
        dest = self.upload_dir / stored_name
        dest.write_bytes(selfie)

        return stored_name

    def register_visitor(
        self,
        name: str,
        phone: str,
        email: str,
        host_employee: str,
        host_email: Optional[str],
        purpose: str,
        selfie: Optional[bytes] = None,
        selfie_filename: Optional[str] = None,
    ) -> VisitorResponse:
        """Register a new visitor with pending status."""

        selfie_path = self._save_selfie(selfie, selfie_filename)

        visitor = Visitor(
            name=name,
            phone=phone,
            email=email,
            host_employee=host_employee,
            host_email=host_email,
            purpose=purpose,
            selfie_path=selfie_path,
            status=VisitorStatus.PENDING,
        )

        self.db.add(visitor)
        self.db.commit()
        self.db.refresh(visitor)

        notify_host(
            subject=f"New visitor request: {visitor.name}",
            body=(
                f"Hello {visitor.host_employee},\n\n"
                f"{visitor.name} has requested a visit with you.\n\n"
                f"Purpose: {visitor.purpose}\n"
                f"Phone: {visitor.phone}\n"
                f"Email: {visitor.email}\n\n"
                f"Please review and approve or reject the request "
                f"in the Visitor Management admin dashboard."
            ),
            host_email=visitor.host_email,
            approval_token=visitor.approval_token,
        )

        logger.info(
            "Visitor registered: %s (id=%d)",
            visitor.name,
            visitor.id,
        )

        return self._serialize(visitor)

    def list_visitors(self) -> list[VisitorResponse]:
        """List all visitors, newest first."""

        visitors = (
            self.db.query(Visitor)
            .order_by(Visitor.created_at.desc())
            .all()
        )

        return [self._serialize(visitor) for visitor in visitors]

    def get_visitor(self, visitor_id: int) -> VisitorResponse:
        """Get a single visitor by ID."""

        visitor = (
            self.db.query(Visitor)
            .filter(Visitor.id == visitor_id)
            .first()
        )

        if not visitor:
            raise HTTPException(
                status_code=404,
                detail="Visitor not found",
            )

        return self._serialize(visitor)

    def approve_visitor(self, visitor_id: int) -> ActionResponse:
        """Approve a pending visitor and generate a QR code."""

        visitor = (
            self.db.query(Visitor)
            .filter(Visitor.id == visitor_id)
            .first()
        )

        if not visitor:
            raise HTTPException(
                status_code=404,
                detail="Visitor not found",
            )

        if visitor.status != VisitorStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot approve visitor with status "
                    f"'{visitor.status.value}'"
                ),
            )

        visitor.status = VisitorStatus.APPROVED
        visitor.qr_code = uuid.uuid4().hex
        visitor.qr_active = True
        visitor.approved_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(visitor)

        notify_host(
            subject=f"Visitor approved: {visitor.name}",
            body=(
                f"Hello {visitor.host_employee},\n\n"
                f"Your visitor {visitor.name} has been approved.\n\n"
                f"Purpose: {visitor.purpose}\n"
                f"They will receive a QR code for check-in at the gate."
            ),
            host_email=visitor.host_email,
        )

        message = (
            f"Visit approved for {visitor.name}. "
            f"QR code generated. "
            f"Host {visitor.host_employee} has been notified."
        )

        logger.info(
            "Visitor approved: %s (id=%d)",
            visitor.name,
            visitor.id,
        )

        return ActionResponse(
            message=message,
            visitor=self._serialize(visitor),
        )

    def reject_visitor(self, visitor_id: int) -> ActionResponse:
        """Reject a pending visitor."""

        visitor = (
            self.db.query(Visitor)
            .filter(Visitor.id == visitor_id)
            .first()
        )

        if not visitor:
            raise HTTPException(
                status_code=404,
                detail="Visitor not found",
            )

        if visitor.status != VisitorStatus.PENDING:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot reject visitor with status "
                    f"'{visitor.status.value}'"
                ),
            )

        visitor.status = VisitorStatus.REJECTED
        visitor.qr_active = False

        self.db.commit()
        self.db.refresh(visitor)

        visitor_message = (
            f"Your visit request to meet {visitor.host_employee} "
            f"has been rejected. "
            f"Please contact your host for more information."
        )

        notify_visitor(
            visitor.name,
            visitor.email,
            visitor.phone,
            visitor_message,
        )

        notify_host(
            subject=f"Visitor request rejected: {visitor.name}",
            body=(
                f"Hello {visitor.host_employee},\n\n"
                f"The visit request from {visitor.name} "
                f'for "{visitor.purpose}" has been rejected.'
            ),
            host_email=visitor.host_email,
        )

        message = (
            f"Visit request from {visitor.name} has been rejected. "
            f"Visitor has been notified at {visitor.email}."
        )

        logger.info(
            "Visitor rejected: %s (id=%d)",
            visitor.name,
            visitor.id,
        )

        return ActionResponse(
            message=message,
            visitor=self._serialize(visitor),
        )

    def _get_visitor_by_token(self, token: str) -> Visitor:
        """Get a visitor by approval token."""
        visitor = (
            self.db.query(Visitor)
            .filter(Visitor.approval_token == token)
            .first()
        )
        if not visitor:
            raise HTTPException(
                status_code=404,
                detail="Invalid or expired approval link",
            )
        return visitor

    def _handle_token_action(
        self,
        token: str,
        action: str,
    ) -> TokenActionResponse:
        """
        Handle approve/reject by token.

        Returns TokenActionResponse with status: "approved", "rejected", or "already_handled".
        """
        visitor = self._get_visitor_by_token(token)

        # Check if already handled
        if visitor.status != VisitorStatus.PENDING:
            status_map = {
                VisitorStatus.APPROVED: "approved",
                VisitorStatus.REJECTED: "rejected",
                VisitorStatus.CHECKED_IN: "approved",
                VisitorStatus.CHECKED_OUT: "approved",
            }
            handled_status = status_map.get(visitor.status, "already_handled")
            message = (
                f"This visit request has already been {handled_status}."
            )
            return TokenActionResponse(
                status="already_handled",
                message=message,
                visitor_name=visitor.name,
            )

        if action == "approve":
            visitor.status = VisitorStatus.APPROVED
            visitor.qr_code = uuid.uuid4().hex
            visitor.qr_active = True
            visitor.approved_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(visitor)

            notify_host(
                subject=f"Visitor approved: {visitor.name}",
                body=(
                    f"Hello {visitor.host_employee},\n\n"
                    f"Your visitor {visitor.name} has been approved via email link.\n\n"
                    f"Purpose: {visitor.purpose}\n"
                    f"They will receive a QR code for check-in at the gate."
                ),
                host_email=visitor.host_email,
            )

            logger.info(
                "Visitor approved via token: %s (id=%d)",
                visitor.name,
                visitor.id,
            )

            return TokenActionResponse(
                status="approved",
                message=f"Visit approved for {visitor.name}. QR code generated.",
                visitor_name=visitor.name,
            )

        elif action == "reject":
            visitor.status = VisitorStatus.REJECTED
            visitor.qr_active = False
            self.db.commit()
            self.db.refresh(visitor)

            visitor_message = (
                f"Your visit request to meet {visitor.host_employee} "
                f"has been rejected. "
                f"Please contact your host for more information."
            )

            notify_visitor(
                visitor.name,
                visitor.email,
                visitor.phone,
                visitor_message,
            )

            notify_host(
                subject=f"Visitor request rejected: {visitor.name}",
                body=(
                    f"Hello {visitor.host_employee},\n\n"
                    f"The visit request from {visitor.name} "
                    f'for "{visitor.purpose}" has been rejected via email link.'
                ),
                host_email=visitor.host_email,
            )

            logger.info(
                "Visitor rejected via token: %s (id=%d)",
                visitor.name,
                visitor.id,
            )

            return TokenActionResponse(
                status="rejected",
                message=f"Visit request from {visitor.name} has been rejected.",
                visitor_name=visitor.name,
            )

    def approve_by_token(self, token: str) -> TokenActionResponse:
        """Approve a pending visitor using a secure approval token."""
        return self._handle_token_action(token, "approve")

    def reject_by_token(self, token: str) -> TokenActionResponse:
        """Reject a pending visitor using a secure approval token."""
        return self._handle_token_action(token, "reject")

    def check_in(self, payload: QRScanRequest) -> ActionResponse:
        """Check in a visitor using a QR code."""

        visitor = (
            self.db.query(Visitor)
            .filter(Visitor.qr_code == payload.qr_code)
            .first()
        )

        if not visitor:
            raise HTTPException(
                status_code=404,
                detail="Invalid QR code",
            )

        if not visitor.qr_active:
            raise HTTPException(
                status_code=400,
                detail="QR code is deactivated",
            )

        if visitor.status != VisitorStatus.APPROVED:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot check in visitor with status "
                    f"'{visitor.status.value}'"
                ),
            )

        visitor.status = VisitorStatus.CHECKED_IN
        visitor.checked_in_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(visitor)

        notify_host(
            subject=f"Visitor checked in: {visitor.name}",
            body=(
                f"Hello {visitor.host_employee},\n\n"
                f"Your visitor {visitor.name} has checked in.\n\n"
                f"Purpose: {visitor.purpose}"
            ),
            host_email=visitor.host_email,
        )

        message = f"{visitor.name} checked in successfully."

        logger.info(
            "Visitor checked in: %s (id=%d)",
            visitor.name,
            visitor.id,
        )

        return ActionResponse(
            message=message,
            visitor=self._serialize(visitor),
        )

    def check_out(self, payload: QRScanRequest) -> ActionResponse:
        """Check out a visitor using a QR code."""

        visitor = (
            self.db.query(Visitor)
            .filter(Visitor.qr_code == payload.qr_code)
            .first()
        )

        if not visitor:
            raise HTTPException(
                status_code=404,
                detail="Invalid QR code",
            )

        if not visitor.qr_active:
            raise HTTPException(
                status_code=400,
                detail="QR code is already deactivated",
            )

        if visitor.status != VisitorStatus.CHECKED_IN:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot check out visitor with status "
                    f"'{visitor.status.value}'"
                ),
            )

        visitor.status = VisitorStatus.CHECKED_OUT
        visitor.checked_in_at = visitor.checked_in_at or datetime.utcnow()
        visitor.checked_out_at = datetime.utcnow()
        visitor.qr_active = False

        self.db.commit()
        self.db.refresh(visitor)

        notify_host(
            subject=f"Visitor checked out: {visitor.name}",
            body=(
                f"Hello {visitor.host_employee},\n\n"
                f"Your visitor {visitor.name} has checked out. "
                f"The visit is now complete."
            ),
            host_email=visitor.host_email,
        )

        message = (
            f"{visitor.name} checked out. "
            f"Visit completed and QR deactivated."
        )

        logger.info(
            "Visitor checked out: %s (id=%d)",
            visitor.name,
            visitor.id,
        )

        return ActionResponse(
            message=message,
            visitor=self._serialize(visitor),
        )

    def get_qr_image(self, visitor_id: int) -> io.BytesIO:
        """Generate a QR code image for an approved visitor."""

        visitor = (
            self.db.query(Visitor)
            .filter(Visitor.id == visitor_id)
            .first()
        )

        if not visitor:
            raise HTTPException(
                status_code=404,
                detail="Visitor not found",
            )

        if not visitor.qr_code or not visitor.qr_active:
            raise HTTPException(
                status_code=400,
                detail="No active QR code for this visitor",
            )

        img = qrcode.make(visitor.qr_code)

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)

        return buffer


def get_visitor_service(
    db: Session = Depends(get_db),
) -> VisitorService:
    """
    FastAPI dependency that creates VisitorService
    with the current database session.
    """
    return VisitorService(db)

