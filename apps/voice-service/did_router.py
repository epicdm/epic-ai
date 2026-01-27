"""
DID Router Module

Resolves inbound phone numbers (DIDs) to agent IDs by calling the
Epic AI web API. Used for routing incoming voice calls to the correct agent.

Example usage:
    from did_router import DIDRouter

    router = DIDRouter()
    agent_id = await router.resolve_did("+14155551234")
    if agent_id:
        # Route call to this agent
        pass
"""

import os
import re
import logging
import httpx
from typing import Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class DIDResolution:
    """Result of a DID resolution lookup."""
    agent_id: str
    organization_id: str
    routing_type: Optional[str] = None


class DIDRouterError(Exception):
    """Base exception for DID routing errors."""
    pass


class DIDNotFoundError(DIDRouterError):
    """Raised when no agent mapping is found for a DID."""
    pass


class DIDRouter:
    """
    Client for resolving DIDs to agent IDs.

    Communicates with the Epic AI web API to look up phone number
    to agent mappings.
    """

    def __init__(
        self,
        api_base_url: Optional[str] = None,
        timeout: float = 10.0,
    ):
        """
        Initialize the DID router.

        Args:
            api_base_url: Base URL of the Epic AI web API.
                         Defaults to EPIC_AI_API_URL env var or http://localhost:3000
            timeout: HTTP request timeout in seconds.
        """
        self.api_base_url = (
            api_base_url
            or os.getenv("EPIC_AI_API_URL")
            or os.getenv("WEB_API_URL")
            or "http://localhost:3000"
        ).rstrip("/")

        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.api_base_url,
                timeout=self.timeout,
                headers={"Content-Type": "application/json"},
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    @staticmethod
    def normalize_phone(phone: str) -> str:
        """
        Normalize a phone number to E.164 format.

        Args:
            phone: Phone number in any format.

        Returns:
            Phone number in E.164 format (e.g., +14155551234).
        """
        if not phone:
            return phone

        has_plus = phone.startswith("+")
        digits = re.sub(r"\D", "", phone)

        if has_plus:
            return f"+{digits}"

        # Assume US number if 10 digits
        if len(digits) == 10:
            return f"+1{digits}"

        # If 11 digits starting with 1, treat as US
        if len(digits) == 11 and digits.startswith("1"):
            return f"+{digits}"

        return f"+{digits}"

    async def resolve_did(self, did: str) -> Optional[DIDResolution]:
        """
        Resolve a DID to an agent ID.

        Args:
            did: The inbound phone number (DID) to resolve.

        Returns:
            DIDResolution with agent_id and organization_id if found,
            None if no mapping exists.

        Raises:
            DIDRouterError: On API communication errors.
        """
        if not did:
            logger.warning("Empty DID provided to resolve_did")
            return None

        normalized = self.normalize_phone(did)
        logger.info(f"Resolving DID: {did} (normalized: {normalized})")

        try:
            response = await self.client.post(
                "/api/telephony/resolve-did",
                json={"did": normalized},
            )

            if response.status_code == 404:
                logger.warning(f"No agent mapping found for DID: {did}")
                return None

            if response.status_code != 200:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get("error", f"HTTP {response.status_code}")
                logger.error(f"DID resolution failed: {error_msg}")
                raise DIDRouterError(f"DID resolution failed: {error_msg}")

            data = response.json()
            resolution = DIDResolution(
                agent_id=data["agentId"],
                organization_id=data["organizationId"],
                routing_type=data.get("routingType"),
            )

            logger.info(
                f"Resolved DID {did} -> agent {resolution.agent_id} "
                f"(org: {resolution.organization_id})"
            )
            return resolution

        except httpx.RequestError as e:
            logger.error(f"HTTP request error resolving DID {did}: {e}")
            raise DIDRouterError(f"Failed to connect to API: {e}") from e
        except Exception as e:
            if isinstance(e, DIDRouterError):
                raise
            logger.error(f"Unexpected error resolving DID {did}: {e}")
            raise DIDRouterError(f"Unexpected error: {e}") from e

    async def resolve_did_or_raise(self, did: str) -> DIDResolution:
        """
        Resolve a DID to an agent ID, raising if not found.

        Args:
            did: The inbound phone number (DID) to resolve.

        Returns:
            DIDResolution with agent_id and organization_id.

        Raises:
            DIDNotFoundError: If no mapping exists for the DID.
            DIDRouterError: On API communication errors.
        """
        result = await self.resolve_did(did)
        if result is None:
            raise DIDNotFoundError(f"No agent mapping found for DID: {did}")
        return result


# Module-level singleton for convenience
_default_router: Optional[DIDRouter] = None


def get_router() -> DIDRouter:
    """Get the default DID router singleton."""
    global _default_router
    if _default_router is None:
        _default_router = DIDRouter()
    return _default_router


async def resolve_did(did: str) -> Optional[str]:
    """
    Convenience function to resolve a DID to an agent ID.

    Args:
        did: The inbound phone number to resolve.

    Returns:
        The agent ID if found, None otherwise.
    """
    result = await get_router().resolve_did(did)
    return result.agent_id if result else None
