import logging
from typing import Any
from urllib.parse import quote

import httpx
import msal

from .config import get_settings

logger = logging.getLogger(__name__)


class GraphService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self._app: msal.ConfidentialClientApplication | None = None

    @property
    def app(self) -> msal.ConfidentialClientApplication:
        if self._app is None:
            self._app = msal.ConfidentialClientApplication(
                self.settings.ms_client_id,
                authority=self.settings.msal_authority,
                client_credential=self.settings.ms_client_secret,
            )
        return self._app

    def _acquire_token(self) -> str:
        result = self.app.acquire_token_for_client(
            scopes=[self.settings.graph_scope],
        )
        if "access_token" not in result:
            error = result.get("error_description") or result.get("error") or "Unknown MSAL error"
            raise RuntimeError(f"Failed to acquire Graph token: {error}")
        return result["access_token"]

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._acquire_token()}",
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        url = f"{self.settings.graph_base_url}{path}"
        headers = {**self._headers(), **kwargs.pop("headers", {})}
        with httpx.Client(timeout=30.0) as client:
            response = client.request(method, url, headers=headers, **kwargs)
            response.raise_for_status()
            if response.status_code == 202 or not response.content:
                return None
            return response.json()

    def list_users(self) -> list[dict[str, str]]:
        users: list[dict[str, str]] = []
        path = (
            "/users"
            "?$select=id,displayName,mail,userPrincipalName"
            "&$filter=accountEnabled eq true"
            "&$orderby=displayName"
            "&$count=true"
            "&$top=999"
        )

        while path:
            data = self._request("GET", path, headers={"ConsistencyLevel": "eventual"})
            for user in data.get("value", []):
                email = user.get("mail") or user.get("userPrincipalName")
                display_name = user.get("displayName") or email
                if not email or not display_name:
                    continue
                users.append(
                    {
                        "id": user["id"],
                        "display_name": display_name,
                        "email": email,
                    }
                )
            next_link = data.get("@odata.nextLink")
            path = next_link.replace(self.settings.graph_base_url, "") if next_link else None

        return users

    def send_mail(self, to_email: str, subject: str, body: str) -> None:
        sender = self.settings.ms_service_account_email
        payload = {
            "message": {
                "subject": subject,
                "body": {"contentType": "Text", "content": body},
                "toRecipients": [
                    {"emailAddress": {"address": to_email}},
                ],
            },
            "saveToSentItems": True,
        }
        self._request("POST", f"/users/{quote(sender)}/sendMail", json=payload)
        logger.info("Graph email sent to %s — %s", to_email, subject)


_graph_service: GraphService | None = None


def get_graph_service() -> GraphService:
    global _graph_service
    if _graph_service is None:
        _graph_service = GraphService()
    return _graph_service
