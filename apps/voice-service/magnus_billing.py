"""
Magnus Billing API Client

Replaces FreeSWITCH/FusionPBX integration with Magnus Billing
for DID management, SIP trunks, call routing, and billing.
"""

import os
import requests
from typing import Optional, Dict, List, Any
from dataclasses import dataclass
from datetime import datetime, date
from enum import Enum


class MagnusAPIError(Exception):
    """Exception raised for Magnus Billing API errors."""
    def __init__(self, message: str, status_code: Optional[int] = None, response: Optional[Dict] = None):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message)


class TrunkStatus(Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


@dataclass
class DIDNumber:
    """Represents a DID (Direct Inward Dialing) number."""
    id: str
    number: str
    country_code: str
    monthly_cost: float
    status: str
    trunk_id: Optional[str] = None
    assigned_at: Optional[datetime] = None


@dataclass
class SIPTrunk:
    """Represents a SIP trunk configuration."""
    id: str
    name: str
    host: str
    port: int
    username: str
    status: TrunkStatus
    max_channels: int
    created_at: datetime


@dataclass
class CallRecord:
    """Represents a call detail record (CDR)."""
    id: str
    call_id: str
    trunk_id: str
    did_number: str
    caller_id: str
    destination: str
    start_time: datetime
    end_time: Optional[datetime]
    duration_seconds: int
    cost: float
    direction: str  # 'inbound' or 'outbound'
    status: str


class MagnusBillingClient:
    """
    Client for interacting with Magnus Billing API.

    Handles:
    - DID (phone number) management
    - SIP trunk configuration
    - Call routing rules
    - Billing and CDR access
    """

    def __init__(
        self,
        api_url: Optional[str] = None,
        api_key: Optional[str] = None,
        account_id: Optional[str] = None,
        timeout: int = 30
    ):
        """
        Initialize Magnus Billing client.

        Args:
            api_url: Magnus Billing API URL (defaults to env MAGNUS_BILLING_API_URL)
            api_key: API key for authentication (defaults to env MAGNUS_BILLING_API_KEY)
            account_id: Account ID (defaults to env MAGNUS_BILLING_ACCOUNT_ID)
            timeout: Request timeout in seconds
        """
        self.api_url = (api_url or os.environ.get("MAGNUS_BILLING_API_URL", "")).rstrip("/")
        self.api_key = api_key or os.environ.get("MAGNUS_BILLING_API_KEY", "")
        self.account_id = account_id or os.environ.get("MAGNUS_BILLING_ACCOUNT_ID", "")
        self.timeout = timeout

        if not self.api_url:
            raise ValueError("Magnus Billing API URL is required")
        if not self.api_key:
            raise ValueError("Magnus Billing API key is required")

    def _get_headers(self) -> Dict[str, str]:
        """Get default headers for API requests."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Account-ID": self.account_id
        }

    def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Make an API request to Magnus Billing.

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint path
            data: Request body data
            params: Query parameters

        Returns:
            API response as dictionary

        Raises:
            MagnusAPIError: If the API request fails
        """
        url = f"{self.api_url}/{endpoint.lstrip('/')}"

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self._get_headers(),
                json=data,
                params=params,
                timeout=self.timeout
            )

            # Parse response
            try:
                response_data = response.json()
            except ValueError:
                response_data = {"raw": response.text}

            # Check for errors
            if not response.ok:
                error_message = response_data.get("error", {}).get("message", response.text)
                raise MagnusAPIError(
                    message=f"API request failed: {error_message}",
                    status_code=response.status_code,
                    response=response_data
                )

            return response_data

        except requests.RequestException as e:
            raise MagnusAPIError(f"Request failed: {str(e)}")

    # =========================================================================
    # DID (Phone Number) Management
    # =========================================================================

    def list_available_dids(
        self,
        country_code: Optional[str] = None,
        area_code: Optional[str] = None,
        limit: int = 100
    ) -> List[DIDNumber]:
        """
        List available DIDs for purchase.

        Args:
            country_code: Filter by country code (e.g., 'US', 'GB')
            area_code: Filter by area code (e.g., '415', '212')
            limit: Maximum number of results

        Returns:
            List of available DID numbers
        """
        params = {"limit": limit}
        if country_code:
            params["country_code"] = country_code
        if area_code:
            params["area_code"] = area_code

        response = self._make_request("GET", "/dids/available", params=params)

        return [
            DIDNumber(
                id=did["id"],
                number=did["number"],
                country_code=did["country_code"],
                monthly_cost=did["monthly_cost"],
                status="available"
            )
            for did in response.get("dids", [])
        ]

    def list_owned_dids(self, status: Optional[str] = None) -> List[DIDNumber]:
        """
        List DIDs owned by this account.

        Args:
            status: Filter by status ('active', 'inactive', 'suspended')

        Returns:
            List of owned DID numbers
        """
        params = {}
        if status:
            params["status"] = status

        response = self._make_request("GET", "/dids", params=params)

        return [
            DIDNumber(
                id=did["id"],
                number=did["number"],
                country_code=did["country_code"],
                monthly_cost=did["monthly_cost"],
                status=did["status"],
                trunk_id=did.get("trunk_id"),
                assigned_at=datetime.fromisoformat(did["assigned_at"]) if did.get("assigned_at") else None
            )
            for did in response.get("dids", [])
        ]

    def purchase_did(self, did_number: str) -> DIDNumber:
        """
        Purchase a DID number.

        Args:
            did_number: The DID number to purchase

        Returns:
            The purchased DID details
        """
        response = self._make_request("POST", "/dids/purchase", data={"number": did_number})

        did = response["did"]
        return DIDNumber(
            id=did["id"],
            number=did["number"],
            country_code=did["country_code"],
            monthly_cost=did["monthly_cost"],
            status=did["status"]
        )

    def release_did(self, did_number: str) -> bool:
        """
        Release (cancel) a DID number.

        Args:
            did_number: The DID number to release

        Returns:
            True if successfully released
        """
        self._make_request("DELETE", f"/dids/{did_number}")
        return True

    def assign_did_to_trunk(self, did_number: str, trunk_id: str) -> DIDNumber:
        """
        Assign a DID to a SIP trunk.

        Args:
            did_number: The DID number to assign
            trunk_id: The trunk ID to assign to

        Returns:
            Updated DID details
        """
        response = self._make_request(
            "PUT",
            f"/dids/{did_number}/assign",
            data={"trunk_id": trunk_id}
        )

        did = response["did"]
        return DIDNumber(
            id=did["id"],
            number=did["number"],
            country_code=did["country_code"],
            monthly_cost=did["monthly_cost"],
            status=did["status"],
            trunk_id=did.get("trunk_id"),
            assigned_at=datetime.fromisoformat(did["assigned_at"]) if did.get("assigned_at") else None
        )

    def unassign_did_from_trunk(self, did_number: str) -> DIDNumber:
        """
        Unassign a DID from its trunk.

        Args:
            did_number: The DID number to unassign

        Returns:
            Updated DID details
        """
        response = self._make_request("PUT", f"/dids/{did_number}/unassign")

        did = response["did"]
        return DIDNumber(
            id=did["id"],
            number=did["number"],
            country_code=did["country_code"],
            monthly_cost=did["monthly_cost"],
            status=did["status"],
            trunk_id=None,
            assigned_at=None
        )

    # =========================================================================
    # SIP Trunk Management
    # =========================================================================

    def list_sip_trunks(self) -> List[SIPTrunk]:
        """
        List all SIP trunks for this account.

        Returns:
            List of SIP trunks
        """
        response = self._make_request("GET", "/trunks")

        return [
            SIPTrunk(
                id=trunk["id"],
                name=trunk["name"],
                host=trunk["host"],
                port=trunk.get("port", 5060),
                username=trunk["username"],
                status=TrunkStatus(trunk["status"]),
                max_channels=trunk.get("max_channels", 0),
                created_at=datetime.fromisoformat(trunk["created_at"])
            )
            for trunk in response.get("trunks", [])
        ]

    def get_sip_trunk(self, trunk_id: str) -> SIPTrunk:
        """
        Get details of a specific SIP trunk.

        Args:
            trunk_id: The trunk ID

        Returns:
            SIP trunk details
        """
        response = self._make_request("GET", f"/trunks/{trunk_id}")

        trunk = response["trunk"]
        return SIPTrunk(
            id=trunk["id"],
            name=trunk["name"],
            host=trunk["host"],
            port=trunk.get("port", 5060),
            username=trunk["username"],
            status=TrunkStatus(trunk["status"]),
            max_channels=trunk.get("max_channels", 0),
            created_at=datetime.fromisoformat(trunk["created_at"])
        )

    def create_sip_trunk(
        self,
        name: str,
        config: Dict[str, Any]
    ) -> SIPTrunk:
        """
        Create a new SIP trunk.

        Args:
            name: Trunk name
            config: Trunk configuration including:
                - host: SIP server host
                - port: SIP port (default 5060)
                - username: Authentication username
                - password: Authentication password
                - max_channels: Maximum concurrent channels
                - codecs: List of supported codecs

        Returns:
            Created SIP trunk
        """
        data = {
            "name": name,
            **config
        }

        response = self._make_request("POST", "/trunks", data=data)

        trunk = response["trunk"]
        return SIPTrunk(
            id=trunk["id"],
            name=trunk["name"],
            host=trunk["host"],
            port=trunk.get("port", 5060),
            username=trunk["username"],
            status=TrunkStatus(trunk["status"]),
            max_channels=trunk.get("max_channels", 0),
            created_at=datetime.fromisoformat(trunk["created_at"])
        )

    def update_sip_trunk(self, trunk_id: str, config: Dict[str, Any]) -> SIPTrunk:
        """
        Update a SIP trunk configuration.

        Args:
            trunk_id: The trunk ID to update
            config: Updated configuration

        Returns:
            Updated SIP trunk
        """
        response = self._make_request("PUT", f"/trunks/{trunk_id}", data=config)

        trunk = response["trunk"]
        return SIPTrunk(
            id=trunk["id"],
            name=trunk["name"],
            host=trunk["host"],
            port=trunk.get("port", 5060),
            username=trunk["username"],
            status=TrunkStatus(trunk["status"]),
            max_channels=trunk.get("max_channels", 0),
            created_at=datetime.fromisoformat(trunk["created_at"])
        )

    def delete_sip_trunk(self, trunk_id: str) -> bool:
        """
        Delete a SIP trunk.

        Args:
            trunk_id: The trunk ID to delete

        Returns:
            True if successfully deleted
        """
        self._make_request("DELETE", f"/trunks/{trunk_id}")
        return True

    def get_trunk_credentials(self, trunk_id: str) -> Dict[str, str]:
        """
        Get SIP credentials for a trunk.

        Args:
            trunk_id: The trunk ID

        Returns:
            Dictionary with username, password, host, port
        """
        response = self._make_request("GET", f"/trunks/{trunk_id}/credentials")
        return response["credentials"]

    # =========================================================================
    # Call Routing
    # =========================================================================

    def set_inbound_route(
        self,
        did_number: str,
        destination: str,
        destination_type: str = "sip"
    ) -> Dict[str, Any]:
        """
        Set inbound routing for a DID.

        Args:
            did_number: The DID number
            destination: Where to route calls (SIP URI, phone number, etc.)
            destination_type: Type of destination ('sip', 'pstn', 'ivr', 'queue')

        Returns:
            Route configuration
        """
        data = {
            "destination": destination,
            "destination_type": destination_type
        }

        response = self._make_request("PUT", f"/dids/{did_number}/route", data=data)
        return response["route"]

    def get_inbound_route(self, did_number: str) -> Dict[str, Any]:
        """
        Get inbound routing configuration for a DID.

        Args:
            did_number: The DID number

        Returns:
            Current route configuration
        """
        response = self._make_request("GET", f"/dids/{did_number}/route")
        return response["route"]

    def set_outbound_route(
        self,
        trunk_id: str,
        rules: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Set outbound routing rules for a trunk.

        Args:
            trunk_id: The trunk ID
            rules: List of routing rules, each containing:
                - pattern: Dial pattern (regex or prefix)
                - priority: Rule priority (lower = higher priority)
                - rate_limit: Optional calls per minute limit

        Returns:
            Routing configuration
        """
        data = {"rules": rules}

        response = self._make_request("PUT", f"/trunks/{trunk_id}/outbound-rules", data=data)
        return response["routing"]

    def get_outbound_routes(self, trunk_id: str) -> List[Dict[str, Any]]:
        """
        Get outbound routing rules for a trunk.

        Args:
            trunk_id: The trunk ID

        Returns:
            List of routing rules
        """
        response = self._make_request("GET", f"/trunks/{trunk_id}/outbound-rules")
        return response.get("rules", [])

    # =========================================================================
    # Billing & CDR (Call Detail Records)
    # =========================================================================

    def get_call_records(
        self,
        start_date: date,
        end_date: date,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[CallRecord]:
        """
        Get call detail records for a date range.

        Args:
            start_date: Start date for records
            end_date: End date for records
            filters: Optional filters including:
                - trunk_id: Filter by trunk
                - did_number: Filter by DID
                - direction: 'inbound' or 'outbound'
                - min_duration: Minimum call duration

        Returns:
            List of call records
        """
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
        if filters:
            params.update(filters)

        response = self._make_request("GET", "/cdr", params=params)

        return [
            CallRecord(
                id=record["id"],
                call_id=record["call_id"],
                trunk_id=record["trunk_id"],
                did_number=record["did_number"],
                caller_id=record["caller_id"],
                destination=record["destination"],
                start_time=datetime.fromisoformat(record["start_time"]),
                end_time=datetime.fromisoformat(record["end_time"]) if record.get("end_time") else None,
                duration_seconds=record["duration_seconds"],
                cost=record["cost"],
                direction=record["direction"],
                status=record["status"]
            )
            for record in response.get("records", [])
        ]

    def get_call_record(self, call_id: str) -> CallRecord:
        """
        Get a specific call record.

        Args:
            call_id: The call ID

        Returns:
            Call record details
        """
        response = self._make_request("GET", f"/cdr/{call_id}")

        record = response["record"]
        return CallRecord(
            id=record["id"],
            call_id=record["call_id"],
            trunk_id=record["trunk_id"],
            did_number=record["did_number"],
            caller_id=record["caller_id"],
            destination=record["destination"],
            start_time=datetime.fromisoformat(record["start_time"]),
            end_time=datetime.fromisoformat(record["end_time"]) if record.get("end_time") else None,
            duration_seconds=record["duration_seconds"],
            cost=record["cost"],
            direction=record["direction"],
            status=record["status"]
        )

    def get_current_balance(self) -> Dict[str, Any]:
        """
        Get current account balance.

        Returns:
            Balance information including:
                - balance: Current balance
                - currency: Currency code
                - credit_limit: Credit limit if applicable
        """
        response = self._make_request("GET", "/billing/balance")
        return response["balance"]

    def get_rate_for_destination(self, destination: str) -> Dict[str, Any]:
        """
        Get call rate for a destination.

        Args:
            destination: Phone number or destination code

        Returns:
            Rate information including:
                - rate_per_minute: Cost per minute
                - connection_fee: One-time connection fee
                - currency: Currency code
                - destination_name: Human-readable destination name
        """
        response = self._make_request("GET", f"/billing/rates/{destination}")
        return response["rate"]

    def get_usage_summary(
        self,
        start_date: date,
        end_date: date
    ) -> Dict[str, Any]:
        """
        Get usage summary for a date range.

        Args:
            start_date: Start date
            end_date: End date

        Returns:
            Usage summary including:
                - total_calls: Number of calls
                - total_minutes: Total call minutes
                - total_cost: Total cost
                - inbound_calls: Inbound call count
                - outbound_calls: Outbound call count
                - by_trunk: Usage broken down by trunk
                - by_did: Usage broken down by DID
        """
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }

        response = self._make_request("GET", "/billing/usage", params=params)
        return response["summary"]

    # =========================================================================
    # Health & Status
    # =========================================================================

    def health_check(self) -> Dict[str, Any]:
        """
        Check Magnus Billing API health.

        Returns:
            Health status information
        """
        response = self._make_request("GET", "/health")
        return response

    def get_trunk_status(self, trunk_id: str) -> Dict[str, Any]:
        """
        Get real-time status of a trunk.

        Args:
            trunk_id: The trunk ID

        Returns:
            Status including:
                - status: Current status
                - active_channels: Number of active channels
                - last_call: Last call timestamp
                - uptime: Trunk uptime
        """
        response = self._make_request("GET", f"/trunks/{trunk_id}/status")
        return response["status"]


# Singleton instance for convenience
_client: Optional[MagnusBillingClient] = None


def get_magnus_client() -> MagnusBillingClient:
    """
    Get or create a Magnus Billing client singleton.

    Returns:
        MagnusBillingClient instance
    """
    global _client
    if _client is None:
        _client = MagnusBillingClient()
    return _client
