from fastapi import APIRouter, HTTPException

from ..config import get_settings
from ..schemas import EmployeeResponse
from ..services import get_graph_service
from ..services.logger import get_logger


logger = get_logger("routes.users")
router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[EmployeeResponse])
def list_employees():
    """
    List all enabled Azure AD users for the host employee dropdown.

    Requires Microsoft Graph to be configured with:
    - MS_CLIENT_ID
    - MS_TENANT_ID
    - MS_CLIENT_SECRET
    - Application permission: User.Read.All (admin consent required)
    """
    settings = get_settings()
    if not settings.graph_configured:
        raise HTTPException(
            status_code=503,
            detail=(
                "Microsoft Graph is not configured. "
                "Set MS_CLIENT_ID, MS_TENANT_ID, MS_CLIENT_SECRET, and MS_SERVICE_ACCOUNT_EMAIL."
            ),
        )

    try:
        employees = get_graph_service().list_users()
        return [EmployeeResponse(**employee) for employee in employees]
    except Exception as exc:
        logger.exception("Failed to fetch employees from Microsoft Graph")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch employees from Microsoft Graph: {exc}",
        ) from exc