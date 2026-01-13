"""
Magnus Billing SDK Client

Python implementation matching the PHP Magnus Billing SDK pattern.
Used for creating SIP users, DIDs, and DID destinations for voice agents.
"""

import os
import random
import logging
import hmac
import hashlib
import time
import requests
import urllib3
from typing import Optional, Dict, Any, Tuple, List
import warnings
from dataclasses import dataclass
from urllib.parse import urlencode

# Suppress SSL warnings for Magnus server (self-signed certificate)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)


class MagnusSDKError(Exception):
    """Exception raised for Magnus SDK errors."""
    def __init__(self, message: str, status_code: Optional[int] = None, response: Optional[Dict] = None):
        self.message = message
        self.status_code = status_code
        self.response = response
        super().__init__(self.message)


class DIDRangeExhaustedError(MagnusSDKError):
    """
    Exception raised when the DID range is completely exhausted.

    This is a specific error that indicates no more phone numbers are available
    in the configured range and requires administrative action to resolve.
    """
    def __init__(
        self,
        message: str,
        total_in_range: int,
        used_in_range: int,
        range_start: str,
        range_end: str
    ):
        self.total_in_range = total_in_range
        self.used_in_range = used_in_range
        self.available_in_range = total_in_range - used_in_range
        self.range_start = range_start
        self.range_end = range_end
        self.utilization_percent = (used_in_range / total_in_range * 100) if total_in_range > 0 else 100

        # Create a detailed, actionable error message
        detailed_message = (
            f"{message}\n\n"
            f"DID Range Status:\n"
            f"  - Range: {range_start} to {range_end}\n"
            f"  - Total capacity: {total_in_range}\n"
            f"  - Currently in use: {used_in_range}\n"
            f"  - Available: {self.available_in_range}\n"
            f"  - Utilization: {self.utilization_percent:.1f}%\n\n"
            f"Action Required: Contact your administrator to either:\n"
            f"  1. Release unused DIDs from the current range\n"
            f"  2. Configure an additional DID range\n"
            f"  3. Expand the current DID range allocation"
        )

        super().__init__(detailed_message)
        self.original_message = message


class DIDRangeNearlyExhaustedWarning(Warning):
    """Warning raised when the DID range is nearly exhausted (>90% used)."""
    pass


@dataclass
class MagnusUser:
    """Represents a Magnus Billing user."""
    id: str
    username: str
    sip_id: Optional[str] = None
    sip_username: Optional[str] = None
    sip_password: Optional[str] = None


@dataclass
class MagnusDID:
    """Represents a Magnus DID."""
    id: str
    did: str
    country: str


@dataclass
class ProvisioningResult:
    """Result of provisioning a voice agent with Magnus."""
    success: bool
    magnus_user_id: str
    magnus_sip_id: str
    magnus_did_id: str
    did_number: str
    sip_username: str
    sip_password: str
    sip_server: str
    error: Optional[str] = None


@dataclass
class DIDRangeStatus:
    """
    Status of DID range utilization.

    Used for pre-emptive detection of range exhaustion and near-exhaustion warnings.
    """
    total_in_range: int
    used_in_range: int
    available_in_range: int
    utilization_percent: float
    range_start: str
    range_end: str
    is_exhausted: bool
    is_nearly_exhausted: bool
    warning_threshold_percent: float = 90.0
    critical_threshold_percent: float = 99.0

    @property
    def status_message(self) -> str:
        """Get a human-readable status message."""
        if self.is_exhausted:
            return f"CRITICAL: DID range exhausted. {self.used_in_range}/{self.total_in_range} DIDs in use (100%)."
        elif self.is_nearly_exhausted:
            return (
                f"WARNING: DID range nearly exhausted. "
                f"{self.used_in_range}/{self.total_in_range} DIDs in use ({self.utilization_percent:.1f}%). "
                f"Only {self.available_in_range} DIDs remaining."
            )
        else:
            return (
                f"OK: DID range healthy. "
                f"{self.used_in_range}/{self.total_in_range} DIDs in use ({self.utilization_percent:.1f}%). "
                f"{self.available_in_range} DIDs available."
            )


class MagnusSDK:
    """
    Magnus Billing SDK client matching the PHP SDK pattern.

    Based on:
    $magnusBilling = new MagnusBilling('api_key', 'api_secret');
    $magnusBilling->public_url = "https://voice00.epic.dm";
    """

    # Default configuration from PHP code
    DEFAULT_ID_GROUP = "3"
    DEFAULT_ID_PLAN = "34"
    DEFAULT_ID_OFFER = "7"
    DEFAULT_CODECS = "opus,g729,gsm,alaw,ulaw"
    DEFAULT_PREFIX_LOCAL = "*/1767/7,767/1767/10"
    DID_PREFIX = "1767818"  # 17678180000 range

    # LiveKit SIP domain for call routing
    DEFAULT_LIVEKIT_SIP_DOMAIN = "3m4yki5jezn.sip.livekit.cloud"

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        public_url: Optional[str] = None,
        sip_server: Optional[str] = None,
        livekit_sip_domain: Optional[str] = None,
        timeout: int = 30
    ):
        """
        Initialize Magnus SDK.

        Args:
            api_key: Magnus API key
            api_secret: Magnus API secret
            public_url: Magnus public URL (e.g., https://voice00.epic.dm)
            sip_server: SIP server hostname (e.g., voice00.epic.dm)
            livekit_sip_domain: LiveKit SIP domain for call routing (e.g., 3m4yki5jezn.sip.livekit.cloud)
            timeout: Request timeout in seconds
        """
        self.api_key = api_key or os.environ.get("MAGNUS_API_KEY", "")
        self.api_secret = api_secret or os.environ.get("MAGNUS_API_SECRET", "")
        self.public_url = (public_url or os.environ.get("MAGNUS_PUBLIC_URL", "https://voice00.epic.dm")).rstrip("/")
        self.sip_server = sip_server or os.environ.get("MAGNUS_SIP_SERVER", "voice00.epic.dm")
        self.livekit_sip_domain = livekit_sip_domain or os.environ.get("LIVEKIT_SIP_DOMAIN", self.DEFAULT_LIVEKIT_SIP_DOMAIN)
        self.timeout = timeout

        if not self.api_key or not self.api_secret:
            logger.warning("Magnus API credentials not configured")

    def list_providers(self) -> List[Dict[str, Any]]:
        """
        List all providers in Magnus Billing.
        This is useful for debugging id_provider validation issues.
        """
        try:
            response = self._make_request("read", "provider", {})
            if isinstance(response, dict) and "rows" in response:
                return response["rows"]
            return []
        except MagnusSDKError as e:
            logger.warning(f"Failed to list providers: {e}")
            return []

    def list_trunks(self) -> List[Dict[str, Any]]:
        """
        List all trunks in Magnus Billing.
        """
        try:
            response = self._make_request("read", "trunk", {})
            if isinstance(response, dict) and "rows" in response:
                return response["rows"]
            return []
        except MagnusSDKError as e:
            logger.warning(f"Failed to list trunks: {e}")
            return []

    def get_default_provider_id(self) -> str:
        """
        Get a valid provider ID to use for SIP creation.
        Returns the first provider ID found, or "0" if no providers exist.

        Magnus SIP requires id_provider field, and "0" may not be valid.
        """
        providers = self.list_providers()
        if providers:
            first_provider = providers[0]
            provider_id = str(first_provider.get("id", "0"))
            logger.info(f"Found provider ID: {provider_id} (name: {first_provider.get('provider_name', 'unknown')})")
            return provider_id
        logger.warning("No providers found in Magnus, using '0'")
        return "0"

    def get_or_create_livekit_trunk(self) -> str:
        """
        Get the LiveKit SIP trunk ID, creating it if it doesn't exist.

        This is required for routing calls externally to LiveKit.
        The trunk points to the LiveKit SIP domain.

        Returns:
            The trunk ID for the livekit_sip trunk

        Raises:
            MagnusSDKError: If trunk creation fails
        """
        # First try to find existing trunk
        try:
            response = self._make_request("read", "trunk", {
                "filter": '[{"field":"trunkcode","value":"livekit_sip"}]'
            })

            if isinstance(response, dict) and "rows" in response:
                for row in response["rows"]:
                    if row.get("trunkcode") == "livekit_sip":
                        trunk_id = str(row.get("id", ""))
                        if trunk_id:
                            logger.info(f"Found existing LiveKit trunk: ID={trunk_id}")
                            return trunk_id
        except MagnusSDKError:
            pass  # Trunk doesn't exist, create it

        # Create the LiveKit SIP trunk
        logger.info(f"Creating LiveKit SIP trunk for {self.livekit_sip_domain}")
        provider_id = self.get_default_provider_id()
        logger.info(f"Using provider_id {provider_id} for trunk creation")
        trunk_data = {
            "id": "0",  # 0 = create new
            "id_provider": provider_id,  # Required field - trunk must belong to a provider
            "trunkcode": "livekit_sip",
            "user": "admin",  # Magnus requires user field for trunk creation
            "host": self.livekit_sip_domain,
            "fromuser": "",  # No auth needed for LiveKit inbound
            "fromdomain": self.livekit_sip_domain,
            "secret": "",
            "providertech": "SIP",
            "status": "1",  # Active
            "context": "default",
            "qualify": "yes",
            "type": "peer",
            "insecure": "invite,port",
            "nat": "force_rport,comedia",
            "dtmfmode": "rfc2833",
            "allow": "opus,g729,alaw,ulaw",
            "disallow": "all",
            "transport": "udp",  # Max 3 chars
            "directmedia": "no",
            "port": "5060",
            "link_sms": "",  # Required field - empty string for no SMS linking
        }

        result = self._make_request("save", "trunk", trunk_data)

        if result.get("success"):
            rows = result.get("rows", [])
            if rows and len(rows) > 0:
                trunk_id = str(rows[0].get("id", ""))
                if trunk_id:
                    logger.info(f"Created LiveKit trunk: ID={trunk_id}")
                    return trunk_id

        raise MagnusSDKError(f"Failed to create LiveKit trunk: {result.get('msg', result)}")

    def _make_request(
        self,
        action: str,
        module: str,
        data: Optional[Dict] = None,
        method: str = "POST"
    ) -> Dict[str, Any]:
        """
        Make an API request to Magnus Billing.

        The Magnus API uses HMAC-SHA512 authentication:
        - POST data is URL-encoded
        - Signature is HMAC-SHA512(post_data, api_secret)
        - Headers: Key (api_key) and Sign (signature)
        """
        url = f"{self.public_url}/index.php/{module}/{action}"

        # Build form data with required parameters (matching PHP SDK)
        form_data = {
            "module": module,
            "action": action,
            "nonce": str(int(time.time() * 1000000)),  # Microsecond precision like PHP
        }
        if data:
            form_data.update(data)

        # URL-encode the POST data
        post_data = urlencode(form_data)

        # Compute HMAC-SHA512 signature
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            post_data.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()

        # Set authentication headers
        headers = {
            "Key": self.api_key,
            "Sign": signature,
            "Content-Type": "application/x-www-form-urlencoded",
        }

        try:
            logger.info(f"Magnus API request: {method} {url}")
            logger.info(f"Magnus API POST data: {form_data}")

            response = requests.request(
                method=method,
                url=url,
                data=post_data,
                headers=headers,
                timeout=self.timeout,
                verify=False  # Magnus server uses self-signed certificate
            )

            try:
                response_data = response.json()
            except ValueError:
                response_data = {"raw": response.text}

            # Log the response for debugging (use INFO level to ensure visibility)
            logger.info(f"Magnus API response ({response.status_code}): {response_data}")

            if not response.ok:
                raise MagnusSDKError(
                    message=f"API request failed: {response.text}",
                    status_code=response.status_code,
                    response=response_data
                )

            # Check for API-level errors
            if isinstance(response_data, dict) and response_data.get("success") == False:
                error_msg = response_data.get("msg") or response_data.get("error") or f"API returned failure: {response_data}"
                raise MagnusSDKError(
                    message=error_msg,
                    response=response_data
                )

            return response_data

        except requests.RequestException as e:
            raise MagnusSDKError(f"Request failed: {str(e)}")

    def create_user(
        self,
        username: str,
        password: str,
        email: str,
        firstname: str = "",
        lastname: str = "",
        phone: str = "",
        description: str = "EpicAI_VoiceAgent"
    ) -> Dict[str, Any]:
        """
        Create a new Magnus user (billing account).

        Matches PHP: $magnusBilling->createUser([...])

        Note: This creates ONLY the user record. SIP accounts must be created
        separately via the 'sip' module (see _provision_with_did()).
        The id_provider and transport fields are SIP-specific and should NOT
        be passed to the User module.
        """
        # Generate a unique callingcard PIN (8 digits)
        callingcard_pin = str(random.randint(10000000, 99999999))

        data = {
            "id": "0",  # id=0 signals creation in Magnus API
            "username": username,
            "password": password,
            "active": "1",
            "firstname": firstname or username,
            "lastname": lastname or "Agent",
            "email": email,
            "typepaid": "0",
            "prefix_local": self.DEFAULT_PREFIX_LOCAL,
            "id_group": self.DEFAULT_ID_GROUP,
            "id_plan": self.DEFAULT_ID_PLAN,
            "description": description,
            "phone": phone,
            "mobile": phone,
            "id_offer": self.DEFAULT_ID_OFFER,
            "callingcard_pin": callingcard_pin,
            # NOTE: id_provider and transport are SIP-specific fields
            # They should NOT be passed to the User module - SIP accounts
            # are created separately via the 'sip' module in _provision_with_did()
        }

        return self._make_request("save", "user", data)

    def create(self, module: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a record in any Magnus module.

        Matches PHP: $magnusBilling->create('module', [...])
        """
        data["id"] = "0"  # id=0 signals creation in Magnus API
        return self._make_request("save", module, data)

    def update(self, module: str, record_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update a record in any Magnus module.

        Matches PHP: $magnusBilling->update('module', id, [...])
        """
        data["id"] = record_id
        return self._make_request("save", module, data)

    def get_id(self, module: str, field: str, value: str) -> Optional[str]:
        """
        Get the ID of a record by field value.

        Matches PHP: $magnusBilling->getId('module', 'field', 'value')

        NOTE: Magnus API filter doesn't work correctly - it returns all records.
        We must manually search through the returned rows.
        """
        data = {
            "filter": f'[{{"field":"{field}","value":"{value}"}}]'
        }

        try:
            response = self._make_request("read", module, data)

            if isinstance(response, dict) and "rows" in response:
                rows = response["rows"]
                if rows and len(rows) > 0:
                    # IMPORTANT: Magnus filter doesn't work - it returns ALL records!
                    # We must manually search for the matching record
                    for row in rows:
                        if str(row.get(field, "")) == str(value):
                            record_id = str(row.get("id", ""))
                            logger.debug(f"Found {module} with {field}={value}: ID={record_id}")
                            # Return None if ID is empty string (record exists but has no ID)
                            return record_id if record_id else None

                    logger.debug(f"No {module} found with {field}={value} (searched {len(rows)} rows)")

            return None
        except MagnusSDKError as e:
            # Log the error but still return None - this means "not found"
            logger.warning(f"Error checking {module} for {field}={value}: {e}")
            return None

    def get_record(self, module: str, field: str, value: str) -> Optional[Dict]:
        """
        Get a record by field value.
        """
        data = {
            "filter": f'[{{"field":"{field}","value":"{value}"}}]'
        }

        try:
            response = self._make_request("read", module, data)

            if isinstance(response, dict) and "rows" in response:
                rows = response["rows"]
                if rows and len(rows) > 0:
                    return rows[0]

            return None
        except MagnusSDKError:
            return None

    def get_all_dids(self) -> set:
        """
        Fetch ALL DIDs from Magnus and return them as a set for fast lookup.

        This is necessary because the Magnus API ignores filter parameters
        and returns all records anyway. By fetching once and caching locally,
        we can efficiently check for uniqueness without making repeated API calls.

        Returns:
            Set of DID numbers (as strings) currently in Magnus
        """
        try:
            # Fetch all DIDs - no filter since Magnus ignores it anyway
            response = self._make_request("read", "did", {})

            existing_dids = set()
            if isinstance(response, dict) and "rows" in response:
                rows = response["rows"]
                for row in rows:
                    did_value = row.get("did", "")
                    if did_value:
                        existing_dids.add(str(did_value))

                logger.info(f"Fetched {len(existing_dids)} existing DIDs from Magnus")

            return existing_dids

        except MagnusSDKError as e:
            logger.error(f"Failed to fetch DIDs from Magnus: {e}")
            # Return empty set on error - this will allow DID generation to proceed
            # and let the create operation fail if there's actually a duplicate
            return set()

    def get_did_usage_stats(self) -> Dict[str, Any]:
        """
        Get statistics about DID usage in the configured range.

        Returns:
            Dict with usage statistics including:
            - total_in_range: Total DIDs available in range (1000)
            - used_in_range: Count of DIDs in use within the 9xxx range
            - available_in_range: Count of available DIDs
            - utilization_percent: Percentage of range in use
            - all_dids_count: Total DIDs in Magnus (all ranges)
            - range_start: Start of the DID range
            - range_end: End of the DID range
        """
        existing_dids = self.get_all_dids()

        # Count DIDs in our specific range (9000-9999)
        range_prefix = f"{self.DID_PREFIX}9"  # 17678189xxx
        used_in_range = sum(1 for did in existing_dids if did.startswith(range_prefix))

        total_in_range = 1000  # 9000-9999
        available_in_range = total_in_range - used_in_range
        utilization_percent = (used_in_range / total_in_range) * 100

        return {
            "total_in_range": total_in_range,
            "used_in_range": used_in_range,
            "available_in_range": available_in_range,
            "utilization_percent": round(utilization_percent, 2),
            "all_dids_count": len(existing_dids),
            "range_start": f"{self.DID_PREFIX}9000",
            "range_end": f"{self.DID_PREFIX}9999",
        }

    def get_did_range_status(
        self,
        existing_dids: set = None,
        warning_threshold: float = 90.0,
        critical_threshold: float = 99.0
    ) -> DIDRangeStatus:
        """
        Get detailed status of DID range utilization with exhaustion detection.

        This method provides pre-emptive detection of:
        - Complete range exhaustion (100% used)
        - Near-exhaustion warnings (above warning threshold, default 90%)

        Args:
            existing_dids: Optional pre-fetched set of DIDs. If not provided,
                          will fetch from Magnus.
            warning_threshold: Percentage at which to flag as nearly exhausted (default 90%)
            critical_threshold: Percentage at which to flag as critical (default 99%)

        Returns:
            DIDRangeStatus object with utilization details and exhaustion flags
        """
        if existing_dids is None:
            existing_dids = self.get_all_dids()

        # Count DIDs in our specific range (9000-9999)
        range_prefix = f"{self.DID_PREFIX}9"  # 17678189xxx
        used_in_range = sum(1 for did in existing_dids if did.startswith(range_prefix))

        total_in_range = 1000  # 9000-9999
        available_in_range = total_in_range - used_in_range
        utilization_percent = (used_in_range / total_in_range) * 100 if total_in_range > 0 else 100

        range_start = f"{self.DID_PREFIX}9000"
        range_end = f"{self.DID_PREFIX}9999"

        is_exhausted = available_in_range <= 0
        is_nearly_exhausted = utilization_percent >= warning_threshold and not is_exhausted

        return DIDRangeStatus(
            total_in_range=total_in_range,
            used_in_range=used_in_range,
            available_in_range=available_in_range,
            utilization_percent=round(utilization_percent, 2),
            range_start=range_start,
            range_end=range_end,
            is_exhausted=is_exhausted,
            is_nearly_exhausted=is_nearly_exhausted,
            warning_threshold_percent=warning_threshold,
            critical_threshold_percent=critical_threshold
        )

    def check_range_exhaustion(
        self,
        existing_dids: set = None,
        raise_on_exhausted: bool = True,
        warn_on_nearly_exhausted: bool = True
    ) -> DIDRangeStatus:
        """
        Check if the DID range is exhausted or nearly exhausted.

        This method should be called before provisioning to provide early
        detection and clear error messages about range exhaustion.

        Args:
            existing_dids: Optional pre-fetched set of DIDs
            raise_on_exhausted: If True, raises DIDRangeExhaustedError when range is full
            warn_on_nearly_exhausted: If True, logs a warning when range is nearly full

        Returns:
            DIDRangeStatus object

        Raises:
            DIDRangeExhaustedError: If range is exhausted and raise_on_exhausted is True
        """
        status = self.get_did_range_status(existing_dids)

        if status.is_exhausted:
            error_msg = (
                f"Cannot provision new phone number: DID range is completely exhausted. "
                f"All {status.total_in_range} DIDs in range {status.range_start}-{status.range_end} are in use."
            )
            logger.error(error_msg)

            if raise_on_exhausted:
                raise DIDRangeExhaustedError(
                    message=error_msg,
                    total_in_range=status.total_in_range,
                    used_in_range=status.used_in_range,
                    range_start=status.range_start,
                    range_end=status.range_end
                )

        elif status.is_nearly_exhausted and warn_on_nearly_exhausted:
            warning_msg = (
                f"DID range is nearly exhausted: {status.used_in_range}/{status.total_in_range} "
                f"({status.utilization_percent:.1f}%) DIDs in use. "
                f"Only {status.available_in_range} DIDs remaining in range "
                f"{status.range_start}-{status.range_end}."
            )
            logger.warning(warning_msg)
            warnings.warn(warning_msg, DIDRangeNearlyExhaustedWarning)

        return status

    def get_available_dids_in_range(self, existing_dids: set = None) -> list:
        """
        Get a list of all available (unused) DIDs in the configured range.

        This is useful for diagnostics and understanding which specific DIDs
        are still available.

        Args:
            existing_dids: Optional pre-fetched set of existing DIDs

        Returns:
            List of available DID numbers (as strings), sorted numerically
        """
        if existing_dids is None:
            existing_dids = self.get_all_dids()

        available = []
        for suffix in range(9000, 10000):
            did = f"{self.DID_PREFIX}{suffix}"
            if did not in existing_dids:
                available.append(did)

        return available

    def check_did_exists(self, did: str) -> bool:
        """
        Check if a specific DID exists in Magnus.

        This uses the local filtering approach since Magnus API
        ignores filter parameters.

        Args:
            did: The DID number to check

        Returns:
            True if the DID exists, False otherwise
        """
        existing_dids = self.get_all_dids()
        return did in existing_dids

    def generate_unique_did(self, existing_dids: set = None, use_sequential: bool = False, sequential_start: int = None) -> str:
        """
        Generate a unique DID number in the configured range.

        Based on PHP:
        do {
            $randomNumber = rand(9000, 9999);
            $did = 17678180000 + $randomNumber;
            $id_did = $magnusBilling->getId('did', 'did', $did);
        } while ($id_did);

        Range: 1-767-818-9xxx (9000-9999)

        Args:
            existing_dids: Optional set of DIDs already in use. If not provided,
                          will fetch all DIDs from Magnus once and use that.
            use_sequential: If True, skip random and go straight to sequential search.
                           This is useful for fallback after race conditions.
            sequential_start: Starting suffix for sequential search (9000-9999).
                             If not provided, starts from 9000.

        Returns:
            A unique DID number string

        Raises:
            MagnusSDKError: If no unique DID can be found after checking all possibilities
        """
        # Fetch all existing DIDs once if not provided
        if existing_dids is None:
            existing_dids = self.get_all_dids()
            logger.info(f"Loaded {len(existing_dids)} existing DIDs for uniqueness check")

        # If sequential mode requested, skip random attempts
        if not use_sequential:
            # Try random DIDs first (faster for sparse ranges)
            max_random_attempts = 50
            for attempt in range(max_random_attempts):
                # Generate DID in 9xxx range (9000-9999)
                suffix = random.randint(9000, 9999)
                did = f"{self.DID_PREFIX}{suffix}"

                # Check against local cache of existing DIDs
                if did not in existing_dids:
                    logger.info(f"Generated unique DID: {did} (random attempt {attempt + 1})")
                    return did

                logger.debug(f"DID {did} already exists in cache, retrying...")

            # If random didn't find one, switch to sequential
            logger.warning(f"Random DID generation failed after {max_random_attempts} attempts, trying sequential search")

        # Sequential search (for nearly-full ranges or fallback after race conditions)
        start_suffix = sequential_start if sequential_start is not None else 9000
        logger.info(f"Starting sequential DID search from {self.DID_PREFIX}{start_suffix}")

        for suffix in range(start_suffix, 10000):
            did = f"{self.DID_PREFIX}{suffix}"
            if did not in existing_dids:
                logger.info(f"Generated unique DID via sequential search: {did}")
                return did

        # If we started mid-range, wrap around and check the beginning
        if start_suffix > 9000:
            logger.info(f"Wrapping around to check DIDs from 9000 to {start_suffix - 1}")
            for suffix in range(9000, start_suffix):
                did = f"{self.DID_PREFIX}{suffix}"
                if did not in existing_dids:
                    logger.info(f"Generated unique DID via sequential search (wrapped): {did}")
                    return did

        # Count DIDs actually in our range for accurate error reporting
        range_prefix = f"{self.DID_PREFIX}9"
        used_in_range = sum(1 for did in existing_dids if did.startswith(range_prefix))
        total_in_range = 1000

        raise DIDRangeExhaustedError(
            message=(
                f"Cannot generate unique DID: All DIDs in range are in use. "
                f"Searched entire range {self.DID_PREFIX}9000-{self.DID_PREFIX}9999."
            ),
            total_in_range=total_in_range,
            used_in_range=used_in_range,
            range_start=f"{self.DID_PREFIX}9000",
            range_end=f"{self.DID_PREFIX}9999"
        )

    def generate_password(self, length: int = 12) -> str:
        """Generate a random password."""
        import string
        chars = string.ascii_letters + string.digits
        return ''.join(random.choice(chars) for _ in range(length))

    def _is_duplicate_did_error(self, error_msg: str) -> bool:
        """
        Check if an error message indicates a duplicate DID (race condition).

        Args:
            error_msg: The error message to check

        Returns:
            True if the error is a duplicate DID error, False otherwise
        """
        error_lower = error_msg.lower()
        return (
            ("duplicate entry" in error_lower and "did" in error_lower) or
            ("already exists" in error_lower and "did" in error_lower) or
            "duplicate did" in error_lower or
            "did already in use" in error_lower
        )

    def provision_voice_agent(
        self,
        agent_id: str,
        agent_name: str,
        email: str,
        phone: str = "",
        did_number: Optional[str] = None
    ) -> ProvisioningResult:
        """
        Complete provisioning flow for a voice agent.

        This matches the PHP flow:
        1. Create Magnus user (auto-creates SIP user)
        2. Get the auto-created SIP user ID
        3. Create DID
        4. Create DID destination (link DID to SIP user)
        5. Update SIP user settings

        Race Condition Handling:
        - Phase 1: Try with random DIDs (fast for sparse ranges)
        - Phase 2: On repeated failures, switch to sequential DID allocation
                   starting from the last failed DID's position
        - This ensures we eventually find an available DID even under
          high concurrency, without hammering the same DIDs

        Args:
            agent_id: The voice agent ID (used in username)
            agent_name: Name of the agent
            email: Email for the account
            phone: Optional phone number
            did_number: Optional specific DID to use

        Returns:
            ProvisioningResult with all the created resources
        """
        # If specific DID requested, use it without retry logic
        if did_number:
            return self._provision_with_did(agent_id, agent_name, email, phone, did_number)

        # Fetch all existing DIDs once upfront for efficient uniqueness checking
        # This avoids making separate API calls for each DID check
        existing_dids = self.get_all_dids()
        logger.info(f"Loaded {len(existing_dids)} existing DIDs for provisioning")

        # Pre-emptive check for range exhaustion before attempting provisioning
        # This provides clear error messaging upfront instead of failing after retries
        range_status = self.check_range_exhaustion(
            existing_dids=existing_dids,
            raise_on_exhausted=True,  # Fail fast if range is exhausted
            warn_on_nearly_exhausted=True  # Log warning if range is nearly full
        )
        logger.info(f"DID range status: {range_status.status_message}")

        # Configuration for retry strategy
        max_random_retries = 5      # Max attempts using random DID generation
        max_sequential_retries = 10  # Max attempts using sequential DID generation
        total_max_retries = max_random_retries + max_sequential_retries

        # Track state for sequential fallback
        use_sequential = False
        sequential_start = None
        last_failed_did = None
        race_condition_count = 0

        for retry_attempt in range(total_max_retries):
            try:
                # Generate unique DID using local cache
                # Switch to sequential mode after too many random failures
                did = self.generate_unique_did(
                    existing_dids=existing_dids,
                    use_sequential=use_sequential,
                    sequential_start=sequential_start
                )

                mode_str = "sequential" if use_sequential else "random"
                logger.info(f"Attempting provisioning with DID {did} ({mode_str} mode, attempt {retry_attempt + 1}/{total_max_retries})")

                result = self._provision_with_did(agent_id, agent_name, email, phone, did)

                # If successful, return the result
                if result.success:
                    if race_condition_count > 0:
                        logger.info(f"Provisioning succeeded after {race_condition_count} race condition(s)")
                    return result

                # Check if failure is due to duplicate DID (race condition)
                if result.error and self._is_duplicate_did_error(result.error):
                    race_condition_count += 1
                    logger.warning(
                        f"Race condition #{race_condition_count}: DID {did} was created by another process. "
                        f"Adding to cache and retrying..."
                    )
                    existing_dids.add(did)
                    last_failed_did = did

                    # After several random failures, switch to sequential mode
                    # Sequential mode is more deterministic and avoids repeatedly
                    # trying the same popular random DIDs
                    if race_condition_count >= max_random_retries and not use_sequential:
                        use_sequential = True
                        # Start sequential search from the last failed DID's position + 1
                        if last_failed_did:
                            try:
                                failed_suffix = int(last_failed_did[-4:])
                                sequential_start = (failed_suffix + 1) if failed_suffix < 9999 else 9000
                            except ValueError:
                                sequential_start = 9000
                        logger.warning(
                            f"Switching to sequential DID allocation after {race_condition_count} race conditions. "
                            f"Starting from {self.DID_PREFIX}{sequential_start}"
                        )
                    continue

                # If failed but not due to duplicate DID, don't retry
                logger.error(f"Provisioning failed with non-retryable error: {result.error}")
                return result

            except DIDRangeExhaustedError:
                # Range exhaustion is a terminal error - don't retry, just re-raise
                # This provides clear messaging to the user
                raise

            except MagnusSDKError as e:
                error_msg = str(e)

                # Check if this is a duplicate DID error (race condition)
                if self._is_duplicate_did_error(error_msg):
                    race_condition_count += 1
                    logger.warning(
                        f"Race condition #{race_condition_count} (exception): DID {did} duplicate error. "
                        f"Adding to cache and retrying..."
                    )
                    existing_dids.add(did)
                    last_failed_did = did

                    # Switch to sequential mode after several failures
                    if race_condition_count >= max_random_retries and not use_sequential:
                        use_sequential = True
                        if last_failed_did:
                            try:
                                failed_suffix = int(last_failed_did[-4:])
                                sequential_start = (failed_suffix + 1) if failed_suffix < 9999 else 9000
                            except ValueError:
                                sequential_start = 9000
                        logger.warning(
                            f"Switching to sequential DID allocation after {race_condition_count} race conditions (exception path). "
                            f"Starting from {self.DID_PREFIX}{sequential_start}"
                        )

                    # Check if we've exhausted all retries
                    if retry_attempt == total_max_retries - 1:
                        # After many race conditions, check if range is actually exhausted
                        final_status = self.get_did_range_status(existing_dids)
                        if final_status.is_exhausted:
                            raise DIDRangeExhaustedError(
                                message=(
                                    f"DID range exhausted after {total_max_retries} provisioning attempts. "
                                    f"Race conditions encountered: {race_condition_count}."
                                ),
                                total_in_range=final_status.total_in_range,
                                used_in_range=final_status.used_in_range,
                                range_start=final_status.range_start,
                                range_end=final_status.range_end
                            )
                        else:
                            raise MagnusSDKError(
                                f"Could not provision agent after {total_max_retries} attempts due to repeated race conditions. "
                                f"Race conditions encountered: {race_condition_count}. "
                                f"DID range still has {final_status.available_in_range} available DIDs - "
                                f"this may indicate high concurrency. Please try again."
                            )
                    continue  # Try again with new DID
                else:
                    # Different error, don't retry
                    logger.error(f"Non-retryable error during provisioning: {error_msg}")
                    raise

        # Should not reach here, but just in case
        final_status = self.get_did_range_status(existing_dids)
        if final_status.is_exhausted:
            raise DIDRangeExhaustedError(
                message=f"Could not provision agent: DID range exhausted after {total_max_retries} attempts.",
                total_in_range=final_status.total_in_range,
                used_in_range=final_status.used_in_range,
                range_start=final_status.range_start,
                range_end=final_status.range_end
            )
        else:
            raise MagnusSDKError(
                f"Could not provision agent after {total_max_retries} attempts. "
                f"Race conditions encountered: {race_condition_count}. "
                f"DID range has {final_status.available_in_range} available DIDs."
            )

    def _provision_with_did(
        self,
        agent_id: str,
        agent_name: str,
        email: str,
        phone: str,
        did: str
    ) -> ProvisioningResult:
        """
        Internal method to provision with a specific DID.
        Separated from provision_voice_agent to allow retry logic.
        """
        # Generate credentials
        password = self.generate_password()

        # Create username from agent name and DID suffix
        # Magnus limits usernames to 20 characters
        # Format: {name_prefix}_{last 4 digits of DID} = max 15 + 1 + 4 = 20
        clean_name = ''.join(c for c in agent_name if c.isalnum())[:15].lower()
        did_suffix = did[-4:]  # Last 4 digits for uniqueness
        username = f"{clean_name}_{did_suffix}"

        logger.info(f"Provisioning voice agent: {agent_id} as {username} with DID {did}")

        try:
            # Step 1: Create Magnus user (this auto-creates a SIP user)
            logger.info(f"Creating Magnus user: {username}")
            user_result = self.create_user(
                username=username,
                password=password,
                email=email,
                firstname=agent_name,
                lastname="Voice Agent",
                phone=phone,
                description=f"EpicAI_Agent_{agent_id}"
            )

            logger.info(f"User creation response: {user_result}")
            if not user_result.get("success", False):
                raise MagnusSDKError(f"Failed to create user: {user_result.get('msg', 'Unknown error')} - Full response: {user_result}")

            # Step 2: Extract the created user ID from the response
            # Note: Don't use get_id() as it may return a different user with similar criteria
            rows = user_result.get("rows", [])
            if rows and len(rows) > 0:
                user_id = str(rows[0].get("id", ""))
            else:
                user_id = ""
            if not user_id:
                raise MagnusSDKError(f"Could not extract user ID from creation response: {user_result}")
            logger.info(f"Created user ID: {user_id}")

            # Step 3: Create SIP account explicitly (don't rely on auto-creation)
            # Get valid provider ID - "0" is rejected by some Magnus configurations
            provider_id = self.get_default_provider_id()
            logger.info(f"Creating SIP account for user {user_id}: {username} (provider_id: {provider_id})")
            sip_result = self.create("sip", {
                "id": "0",           # 0 = create new
                "id_user": user_id,  # Foreign key to Magnus user table
                "id_provider": provider_id,  # Use valid provider ID from Magnus
                "user": username,    # SIP username (Asterisk expects this as the username string)
                "name": username,
                "accountcode": username,
                "secret": password,
                "callerid": username,
                "host": "dynamic",
                "transport": "udp",  # Required field - max 3 chars
                "allow": "ulaw,alaw,g729,gsm",
                "dtmfmode": "rfc2833",
                "nat": "force_rport,comedia",
                "qualify": "yes",
                "context": "billing",
                "insecure": "invite,port",
                "status": "1"
            })

            logger.info(f"SIP creation response: {sip_result}")
            if not sip_result.get("success", False):
                raise MagnusSDKError(f"Failed to create SIP account: {sip_result.get('msg', 'Unknown error')} - Full response: {sip_result}")

            # Extract SIP ID from creation response
            sip_rows = sip_result.get("rows", [])
            if sip_rows and len(sip_rows) > 0:
                sip_id = str(sip_rows[0].get("id", ""))
            else:
                sip_id = ""
            if not sip_id:
                raise MagnusSDKError(f"Could not extract SIP ID from creation response: {sip_result}")
            logger.info(f"Created SIP account ID: {sip_id}")

            # Step 4: Create DID with user as owner
            logger.info(f"Creating DID: {did} for user {user_id}")
            did_result = self.create("did", {
                "did": did,
                "id_user": user_id,
                "reserved": "1",  # Reserve for this user
                "country": "Dominica",
                "activated": "1",
                "sms_res": "",  # Required field - empty string for no SMS
            })

            if not did_result.get("success", False):
                raise MagnusSDKError(f"Failed to create DID: {did_result.get('msg', 'Unknown error')}")

            # Step 5: Extract the created DID ID from the response
            did_rows = did_result.get("rows", [])
            if did_rows and len(did_rows) > 0:
                did_id = str(did_rows[0].get("id", ""))
            else:
                did_id = ""
            if not did_id:
                raise MagnusSDKError(f"Could not extract DID ID from creation response: {did_result}")
            logger.info(f"Created DID ID: {did_id}")

            # Step 6: Create DID destination (route to LiveKit SIP via trunk)
            # NOTE: voip_call=0 means route externally, not to local SIP user
            # The id_trunk field routes through the LiveKit SIP trunk
            logger.info(f"Creating DID destination for DID {did} -> LiveKit {self.livekit_sip_domain}")

            # Get or create the LiveKit trunk
            trunk_id = self.get_or_create_livekit_trunk()
            logger.info(f"Using LiveKit trunk ID: {trunk_id}")

            destination_result = self.create("diddestination", {
                "id_did": did_id,
                "id_user": user_id,  # Foreign key to Magnus user table (required)
                "user": username,    # Username string (Magnus expects both fields)
                "id_trunk": trunk_id,  # Route through LiveKit SIP trunk
                "voip_call": "0",  # Route externally, not to local VoIP
                "id_sip": "",      # No local SIP account
                "destination": f"SIP/{did}@{self.livekit_sip_domain}",
                "priority": "1",
                "link_sms": "0",  # Required field - 0 = no SMS link
            })

            if not destination_result.get("success", False):
                logger.warning(f"Failed to create DID destination: {destination_result.get('msg')}")

            # Step 7: Update SIP user settings
            logger.info(f"Updating SIP settings for {sip_id}")
            sip_update_result = self.update("sip", sip_id, {
                "callerid": did,
                "voicemail": "1",
                "voicemail_email": email,
                "voicemail_password": did[-4:],  # Last 4 digits
                "allow": self.DEFAULT_CODECS,
            })

            if not sip_update_result.get("success", False):
                logger.warning(f"Failed to update SIP settings: {sip_update_result.get('msg')}")

            return ProvisioningResult(
                success=True,
                magnus_user_id=user_id,
                magnus_sip_id=sip_id,
                magnus_did_id=did_id,
                did_number=did,
                sip_username=username,
                sip_password=password,
                sip_server=self.sip_server
            )

        except MagnusSDKError as e:
            logger.error(f"Provisioning failed: {e.message}")
            return ProvisioningResult(
                success=False,
                magnus_user_id="",
                magnus_sip_id="",
                magnus_did_id="",
                did_number=did,
                sip_username=username,
                sip_password="",
                sip_server=self.sip_server,
                error=e.message
            )
        except Exception as e:
            logger.error(f"Unexpected error during provisioning: {e}")
            return ProvisioningResult(
                success=False,
                magnus_user_id="",
                magnus_sip_id="",
                magnus_did_id="",
                did_number="",
                sip_username="",
                sip_password="",
                sip_server=self.sip_server,
                error=str(e)
            )

    def create_organization_user(
        self,
        org_id: str,
        org_name: str,
        email: str,
        phone: str = ""
    ) -> Dict[str, Any]:
        """
        Create a Magnus user for an organization (for billing purposes).
        This should be called ONCE per organization, not per agent.

        Args:
            org_id: Organization ID (used in username for uniqueness)
            org_name: Organization name
            email: Contact email for the organization
            phone: Optional phone number

        Returns:
            Dict with 'success', 'magnus_user_id', 'magnus_username', 'error'
        """
        # Generate a unique username for the organization
        # Format: org_{clean_name}_{short_id} (max 20 chars)
        clean_name = ''.join(c for c in org_name if c.isalnum())[:10].lower()
        short_id = org_id[-6:] if len(org_id) >= 6 else org_id
        username = f"org_{clean_name}_{short_id}"[:20]
        password = self.generate_password()

        logger.info(f"Creating Magnus organization user: {username} for org {org_id}")

        try:
            user_result = self.create_user(
                username=username,
                password=password,
                email=email,
                firstname=org_name[:50],
                lastname="Organization",
                phone=phone,
                description=f"EpicAI_Org_{org_id}"
            )

            logger.info(f"Organization user creation response: {user_result}")
            if not user_result.get("success", False):
                return {
                    "success": False,
                    "magnus_user_id": "",
                    "magnus_username": "",
                    "error": f"Failed to create organization user: {user_result.get('msg', 'Unknown error')}"
                }

            # Extract the created user ID
            rows = user_result.get("rows", [])
            if rows and len(rows) > 0:
                user_id = str(rows[0].get("id", ""))
            else:
                user_id = ""

            if not user_id:
                return {
                    "success": False,
                    "magnus_user_id": "",
                    "magnus_username": "",
                    "error": f"Could not extract user ID from response: {user_result}"
                }

            logger.info(f"Created organization Magnus user ID: {user_id}")
            return {
                "success": True,
                "magnus_user_id": user_id,
                "magnus_username": username,
                "error": None
            }

        except Exception as e:
            logger.error(f"Error creating organization user: {e}")
            return {
                "success": False,
                "magnus_user_id": "",
                "magnus_username": "",
                "error": str(e)
            }

    def provision_sip_and_did(
        self,
        magnus_user_id: str,
        agent_id: str,
        agent_name: str,
        email: str,
        did_number: Optional[str] = None
    ) -> ProvisioningResult:
        """
        Provision a SIP account and DID for a voice agent under an EXISTING Magnus user.
        This is the correct flow: organization has ONE user, each agent gets SIP + DID.

        Args:
            magnus_user_id: The existing Magnus user ID (organization's billing account)
            agent_id: The voice agent ID
            agent_name: Name of the agent (used in SIP username)
            email: Email for voicemail notifications
            did_number: Optional specific DID to use

        Returns:
            ProvisioningResult with SIP and DID details (magnus_user_id will be the org's user)
        """
        # If specific DID requested, use it directly
        if did_number:
            return self._provision_sip_and_did_with_did(magnus_user_id, agent_id, agent_name, email, did_number)

        # Fetch existing DIDs for uniqueness checking
        existing_dids = self.get_all_dids()
        logger.info(f"Loaded {len(existing_dids)} existing DIDs for SIP/DID provisioning")

        # Pre-emptive check for range exhaustion
        range_status = self.check_range_exhaustion(
            existing_dids=existing_dids,
            raise_on_exhausted=True,
            warn_on_nearly_exhausted=True
        )
        logger.info(f"DID range status: {range_status.status_message}")

        # Retry configuration
        max_random_retries = 5
        max_sequential_retries = 10
        total_max_retries = max_random_retries + max_sequential_retries

        use_sequential = False
        sequential_start = None
        last_failed_did = None
        race_condition_count = 0

        for retry_attempt in range(total_max_retries):
            try:
                did = self.generate_unique_did(
                    existing_dids=existing_dids,
                    use_sequential=use_sequential,
                    sequential_start=sequential_start
                )

                mode_str = "sequential" if use_sequential else "random"
                logger.info(f"Attempting SIP/DID provisioning with DID {did} ({mode_str} mode, attempt {retry_attempt + 1}/{total_max_retries})")

                result = self._provision_sip_and_did_with_did(magnus_user_id, agent_id, agent_name, email, did)

                if result.success:
                    if race_condition_count > 0:
                        logger.info(f"SIP/DID provisioning succeeded after {race_condition_count} race condition(s)")
                    return result

                # Check for duplicate DID error
                if result.error and self._is_duplicate_did_error(result.error):
                    race_condition_count += 1
                    logger.warning(f"Race condition #{race_condition_count}: DID {did} conflict. Retrying...")
                    existing_dids.add(did)
                    last_failed_did = did

                    if race_condition_count >= max_random_retries and not use_sequential:
                        use_sequential = True
                        if last_failed_did:
                            try:
                                failed_suffix = int(last_failed_did[-4:])
                                sequential_start = (failed_suffix + 1) if failed_suffix < 9999 else 9000
                            except ValueError:
                                sequential_start = 9000
                        logger.warning(f"Switching to sequential DID allocation starting from {self.DID_PREFIX}{sequential_start}")
                    continue

                logger.error(f"SIP/DID provisioning failed: {result.error}")
                return result

            except DIDRangeExhaustedError:
                raise
            except MagnusSDKError as e:
                error_msg = str(e)
                if self._is_duplicate_did_error(error_msg):
                    race_condition_count += 1
                    existing_dids.add(did)
                    last_failed_did = did
                    if race_condition_count >= max_random_retries and not use_sequential:
                        use_sequential = True
                        try:
                            failed_suffix = int(last_failed_did[-4:])
                            sequential_start = (failed_suffix + 1) if failed_suffix < 9999 else 9000
                        except ValueError:
                            sequential_start = 9000
                    if retry_attempt == total_max_retries - 1:
                        final_status = self.get_did_range_status(existing_dids)
                        if final_status.is_exhausted:
                            raise DIDRangeExhaustedError(
                                message=f"DID range exhausted after {total_max_retries} attempts.",
                                total_in_range=final_status.total_in_range,
                                used_in_range=final_status.used_in_range,
                                range_start=final_status.range_start,
                                range_end=final_status.range_end
                            )
                    continue
                else:
                    raise

        # Fallback error
        final_status = self.get_did_range_status(existing_dids)
        raise MagnusSDKError(
            f"Could not provision SIP/DID after {total_max_retries} attempts. "
            f"Race conditions: {race_condition_count}. Available DIDs: {final_status.available_in_range}"
        )

    def _provision_sip_and_did_with_did(
        self,
        magnus_user_id: str,
        agent_id: str,
        agent_name: str,
        email: str,
        did: str
    ) -> ProvisioningResult:
        """
        Internal method to provision SIP and DID with a specific DID under an existing user.
        """
        password = self.generate_password()

        # Create SIP username: {agent_name}_{did_suffix}
        clean_name = ''.join(c for c in agent_name if c.isalnum())[:15].lower()
        did_suffix = did[-4:]
        sip_username = f"{clean_name}_{did_suffix}"

        logger.info(f"Provisioning SIP/DID for agent {agent_id} under user {magnus_user_id}: {sip_username} with DID {did}")

        try:
            # Step 1: Create SIP account under the existing user
            # Get valid provider ID - "0" is rejected by some Magnus configurations
            provider_id = self.get_default_provider_id()
            logger.info(f"Creating SIP account for user {magnus_user_id}: {sip_username} (provider_id: {provider_id})")
            sip_result = self.create("sip", {
                "id": "0",                   # 0 = create new
                "id_user": magnus_user_id,   # Foreign key to Magnus user table
                "id_provider": provider_id,  # Use valid provider ID from Magnus
                "user": sip_username,        # SIP username (Asterisk expects this as the username string)
                "name": sip_username,
                "accountcode": sip_username,
                "secret": password,
                "callerid": sip_username,
                "host": "dynamic",
                "transport": "udp",          # Required field - max 3 chars
                "allow": "ulaw,alaw,g729,gsm",
                "dtmfmode": "rfc2833",
                "nat": "force_rport,comedia",
                "qualify": "yes",
                "context": "billing",
                "insecure": "invite,port",
                "status": "1"
            })

            logger.info(f"SIP creation response: {sip_result}")
            if not sip_result.get("success", False):
                raise MagnusSDKError(f"Failed to create SIP account: {sip_result.get('msg', 'Unknown error')}")

            sip_rows = sip_result.get("rows", [])
            sip_id = str(sip_rows[0].get("id", "")) if sip_rows else ""
            if not sip_id:
                raise MagnusSDKError(f"Could not extract SIP ID from response: {sip_result}")
            logger.info(f"Created SIP account ID: {sip_id}")

            # Step 2: Create DID with user as owner
            logger.info(f"Creating DID: {did} for user {magnus_user_id}")
            did_result = self.create("did", {
                "did": did,
                "id_user": magnus_user_id,
                "reserved": "1",
                "country": "Dominica",
                "activated": "1",
                "sms_res": "",  # Required field - empty string for no SMS
            })

            if not did_result.get("success", False):
                raise MagnusSDKError(f"Failed to create DID: {did_result.get('msg', 'Unknown error')}")

            did_rows = did_result.get("rows", [])
            did_id = str(did_rows[0].get("id", "")) if did_rows else ""
            if not did_id:
                raise MagnusSDKError(f"Could not extract DID ID from response: {did_result}")
            logger.info(f"Created DID ID: {did_id}")

            # Step 3: Create DID destination (route to LiveKit SIP via trunk)
            # NOTE: voip_call=0 means route externally, not to local SIP user
            # The id_trunk field routes through the LiveKit SIP trunk
            logger.info(f"Creating DID destination: DID {did} -> LiveKit {self.livekit_sip_domain}")

            # Get or create the LiveKit trunk
            trunk_id = self.get_or_create_livekit_trunk()
            logger.info(f"Using LiveKit trunk ID: {trunk_id}")

            destination_result = self.create("diddestination", {
                "id_did": did_id,
                "id_user": magnus_user_id,  # Foreign key to Magnus user table (required)
                "user": sip_username,        # Username string (Magnus expects both fields)
                "id_trunk": trunk_id,  # Route through LiveKit SIP trunk
                "voip_call": "0",  # Route externally, not to local VoIP
                "id_sip": "",      # No local SIP account
                "destination": f"SIP/{did}@{self.livekit_sip_domain}",
                "priority": "1",
                "link_sms": "0",  # Required field - 0 = no SMS link
            })

            if not destination_result.get("success", False):
                logger.warning(f"Failed to create DID destination: {destination_result.get('msg')}")

            # Step 4: Update SIP settings
            logger.info(f"Updating SIP settings for {sip_id}")
            sip_update_result = self.update("sip", sip_id, {
                "callerid": did,
                "voicemail": "1",
                "voicemail_email": email,
                "voicemail_password": did[-4:],
                "allow": self.DEFAULT_CODECS,
            })

            if not sip_update_result.get("success", False):
                logger.warning(f"Failed to update SIP settings: {sip_update_result.get('msg')}")

            return ProvisioningResult(
                success=True,
                magnus_user_id=magnus_user_id,  # This is the ORG's user ID
                magnus_sip_id=sip_id,
                magnus_did_id=did_id,
                did_number=did,
                sip_username=sip_username,
                sip_password=password,
                sip_server=self.sip_server
            )

        except MagnusSDKError as e:
            logger.error(f"SIP/DID provisioning failed: {e.message}")
            return ProvisioningResult(
                success=False,
                magnus_user_id=magnus_user_id,
                magnus_sip_id="",
                magnus_did_id="",
                did_number=did,
                sip_username=sip_username,
                sip_password="",
                sip_server=self.sip_server,
                error=e.message
            )
        except Exception as e:
            logger.error(f"Unexpected error during SIP/DID provisioning: {e}")
            return ProvisioningResult(
                success=False,
                magnus_user_id=magnus_user_id,
                magnus_sip_id="",
                magnus_did_id="",
                did_number="",
                sip_username="",
                sip_password="",
                sip_server=self.sip_server,
                error=str(e)
            )

    def deprovision_sip_and_did(
        self,
        magnus_sip_id: Optional[str] = None,
        magnus_did_id: Optional[str] = None
    ) -> bool:
        """
        Remove SIP account and DID resources WITHOUT deleting the user.
        Use this when deprovisioning a single agent under an org.

        Args:
            magnus_sip_id: The Magnus SIP ID to delete
            magnus_did_id: The Magnus DID ID to delete

        Returns:
            True if successful
        """
        success = True

        # Delete DID destination first
        if magnus_did_id:
            try:
                dest_id = self.get_id("diddestination", "id_did", magnus_did_id)
                if dest_id:
                    self._make_request("destroy", "diddestination", {"id": dest_id})
                    logger.info(f"Deleted DID destination: {dest_id}")
            except Exception as e:
                logger.warning(f"Failed to delete DID destination: {e}")
                success = False

            # Delete the DID
            try:
                self._make_request("destroy", "did", {"id": magnus_did_id})
                logger.info(f"Deleted DID: {magnus_did_id}")
            except Exception as e:
                logger.warning(f"Failed to delete DID: {e}")
                success = False

        # Delete the SIP account (but NOT the user)
        if magnus_sip_id:
            try:
                self._make_request("destroy", "sip", {"id": magnus_sip_id})
                logger.info(f"Deleted SIP account: {magnus_sip_id}")
            except Exception as e:
                logger.warning(f"Failed to delete SIP account: {e}")
                success = False

        return success

    def deprovision_voice_agent(
        self,
        magnus_user_id: Optional[str] = None,
        magnus_did_id: Optional[str] = None,
        username: Optional[str] = None
    ) -> bool:
        """
        Remove Magnus resources for a voice agent.

        Args:
            magnus_user_id: The Magnus user ID to delete
            magnus_did_id: The Magnus DID ID to delete
            username: Username to look up if user_id not provided

        Returns:
            True if successful
        """
        try:
            # If we have username but not user_id, look it up
            if not magnus_user_id and username:
                magnus_user_id = self.get_id("user", "username", username)

            # Delete DID destination first (if DID exists)
            if magnus_did_id:
                try:
                    dest_id = self.get_id("diddestination", "id_did", magnus_did_id)
                    if dest_id:
                        self._make_request("destroy", "diddestination", {"id": dest_id})
                        logger.info(f"Deleted DID destination: {dest_id}")
                except Exception as e:
                    logger.warning(f"Failed to delete DID destination: {e}")

                # Delete the DID
                try:
                    self._make_request("destroy", "did", {"id": magnus_did_id})
                    logger.info(f"Deleted DID: {magnus_did_id}")
                except Exception as e:
                    logger.warning(f"Failed to delete DID: {e}")

            # Delete the user (this should also delete the SIP user)
            if magnus_user_id:
                try:
                    self._make_request("destroy", "user", {"id": magnus_user_id})
                    logger.info(f"Deleted Magnus user: {magnus_user_id}")
                except Exception as e:
                    logger.warning(f"Failed to delete user: {e}")

            return True

        except Exception as e:
            logger.error(f"Error during deprovisioning: {e}")
            return False


# Singleton instance
_sdk: Optional[MagnusSDK] = None


def get_magnus_sdk() -> MagnusSDK:
    """Get or create a Magnus SDK singleton."""
    global _sdk
    if _sdk is None:
        _sdk = MagnusSDK()
    return _sdk
