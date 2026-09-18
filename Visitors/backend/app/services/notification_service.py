import html
import logging
from typing import Optional

from ..config import get_settings
from ..services.graph_service import get_graph_service
from ..services.logger import get_logger


logger = get_logger("notifications")

_BUTTON_BASE_STYLE = (
    "display:inline-block;"
    "padding:12px 24px;"
    "border-radius:6px;"
    "color:#ffffff;"
    "text-decoration:none;"
    "font-weight:bold;"
)
_APPROVE_STYLE = _BUTTON_BASE_STYLE + "background-color:#16a34a;"
_REJECT_STYLE = _BUTTON_BASE_STYLE + "background-color:#dc2626;"


def _body_to_html(body: str) -> str:
    """Convert a plain-text body into HTML paragraphs (escaping markup)."""
    paragraphs = [p.strip() for p in body.split("\n\n") if p.strip()]
    return "".join(
        f"<p style=\"margin:0 0 16px;\">{html.escape(p).replace('\n', '<br>')}</p>"
        for p in paragraphs
    )


def notify_host(
    subject: str,
    body: str,
    host_email: Optional[str],
    approval_token: Optional[str] = None,
) -> None:
    """
    Send an email notification to the host employee via Microsoft Graph.

    This function handles the case where Graph is not configured or the host
    email is missing by logging a warning instead of raising an exception.
    The caller does not need to handle notification failures - they are
    logged for audit purposes but don't block the visitor workflow.

    Args:
        subject: Email subject line
        body: Plain text email body (converted to styled HTML paragraphs)
        host_email: Host's email address (may be None)
        approval_token: Optional approval token for generating approve/reject links
    """
    settings = get_settings()

    if not host_email:
        logger.warning("[HOST NOTIFICATION] No host email on file — %s", subject)
        return

    if not settings.graph_configured:
        logger.warning(
            "[HOST NOTIFICATION] Graph not configured — would email %s: %s",
            host_email,
            subject,
        )
        return

    try:
        # Add approve/reject buttons if token is provided
        actions_html = ""
        if approval_token:
            base_url = settings.app_base_url.rstrip("/")
            approve_url = f"{base_url}/api/visitors/approve/{approval_token}"
            reject_url = f"{base_url}/api/visitors/reject/{approval_token}"
            actions_html = (
                '<hr style="border:none;border-top:1px solid #dddddd;margin:24px 0;">'
                '<p style="margin:0 0 12px;"><strong>Quick actions:</strong></p>'
                '<p style="margin:0;">'
                f'<a href="{approve_url}" style="{_APPROVE_STYLE}">✓ Approve</a>'
                '&nbsp;&nbsp;'
                f'<a href="{reject_url}" style="{_REJECT_STYLE}">✕ Reject</a>'
                '</p>'
            )

        email_html = (
            '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;'
            'line-height:1.5;color:#333333;">'
            f"{_body_to_html(body)}"
            f"{actions_html}"
            '</div>'
        )

        get_graph_service().send_mail(host_email, subject, email_html)
    except Exception:
        logger.exception("Failed to send host email to %s", host_email)


def notify_visitor(
    name: str,
    email: str,
    phone: str,
    message: str,
) -> None:
    """
    Send a notification to the visitor.

    Currently logs the notification for audit purposes. In the future,
    this could be extended to send SMS, email, or push notifications
    to the visitor directly.

    Args:
        name: Visitor's full name
        email: Visitor's email address
        phone: Visitor's phone number
        message: Notification message content
    """
    logger.info(
        "[VISITOR NOTIFICATION] To: %s <%s> (%s) — %s",
        name,
        email,
        phone,
        message,
    )