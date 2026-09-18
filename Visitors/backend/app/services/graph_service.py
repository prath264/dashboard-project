import logging
from typing import Any
from urllib.parse import quote

import httpx
import msal

from ..config import get_settings
from ..services.logger import get_logger


logger = get_logger("graph")


class GraphService:
    """
    Microsoft Graph API service for user lookup and email sending.

    Uses MSAL client credentials flow for application-level authentication
    (no user interaction required). Suitable for daemon/service accounts.

    The service caches the MSAL ConfidentialClientApplication instance
    for efficient token acquisition across multiple requests.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self._app: msal.ConfidentialClientApplication | None = None

    @property
    def app(self) -> msal.ConfidentialClientApplication:
        """
        Lazy-initialize the MSAL confidential client application.

        The app instance is cached after first creation to avoid
        re-reading configuration on every token request.
        """
        if self._app is None:
            self._app = msal.ConfidentialClientApplication(
                self.settings.ms_client_id,
                authority=self.settings.msal_authority,
                client_credential=self.settings.ms_client_secret,
            )
        return self._app

    def _acquire_token(self) -> str:
        """
        Acquire an access token for Microsoft Graph using client credentials.

        Returns:
            Bearer token string for Graph API authorization.

        Raises:
            RuntimeError: If token acquisition fails (e.g., invalid credentials,
                         wrong tenant, missing permissions).
        """
        result = self.app.acquire_token_for_client(
            scopes=[self.settings.graph_scope],
        )
        if "access_token" not in result:
            error = result.get("error_description") or result.get("error") or "Unknown MSAL error"
            raise RuntimeError(f"Failed to acquire Graph token: {error}")
        return result["access_token"]

    def _headers(self) -> dict[str, str]:
        """Build standard headers for Graph API requests."""
        return {
            "Authorization": f"Bearer {self._acquire_token()}",
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        """
        Execute an HTTP request against Microsoft Graph.

        Args:
            method: HTTP method (GET, POST, etc.)
            path: Graph API path (e.g., "/users", "/users/{id}/sendMail")
            **kwargs: Additional arguments passed to httpx.Client.request

        Returns:
            Parsed JSON response, or None for 202/empty responses.

        Raises:
            httpx.HTTPStatusError: If the API returns an error status code.
        """
        url = f"{self.settings.graph_base_url}{path}"
        headers = {**self._headers(), **kwargs.pop("headers", {})}

        with httpx.Client(timeout=30.0) as client:
            response = client.request(method, url, headers=headers, **kwargs)
            response.raise_for_status()

            # Graph returns 202 for sendMail (async) and may return empty body
            if response.status_code == 202 or not response.content:
                return None

            return response.json()

    def list_users(self) -> list[dict[str, str]]:
        """
        List all enabled users from Azure AD for the host employee dropdown.

        Uses the ConsistencyLevel=eventual header with $count=true to enable
        advanced query capabilities ($filter, $orderby, $count) on large directories.
        Without this header, Graph returns a 400 error when using $count or
        certain filter/orderby combinations on the /users endpoint.

        This is a non-obvious Graph API requirement: the "eventual" consistency
        level trades strong consistency for query flexibility, which is acceptable
        for a dropdown list that doesn't require real-time accuracy.

        Returns:
            List of user dicts with id, display_name, and email.
        """
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
            # ConsistencyLevel=eventual is REQUIRED when using $count=true
            # or $filter/$orderby on /users in large tenants.
            # Without it, Graph returns: "Invalid filter clause" or
            # "Requests that include $count must specify ConsistencyLevel header".
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

    def send_mail(self, to_email: str, subject: str, body: str, content_type: str = "HTML") -> None:
        """
        Send an email via Microsoft Graph sendMail endpoint.

        Uses the configured service account mailbox as the sender.
        The email is saved to the sender's Sent Items folder.

        Args:
            to_email: Recipient email address
            subject: Email subject
            body: Email body (HTML unless content_type is "Text")
            content_type: Graph body contentType ("HTML" or "Text")
        """
        sender = self.settings.ms_service_account_email
        payload = {
            "message": {
                "subject": subject,
                "body": {"contentType": content_type, "content": body},
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
    """
    Get the singleton GraphService instance.

    Returns:
        GraphService instance (created on first call).
    """
    global _graph_service
    if _graph_service is None:
        _graph_service = GraphService()
    return _graph_service