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
from typing import Optional, Dict, Any
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

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        public_url: Optional[str] = None,
        sip_server: Optional[str] = None,
        timeout: int = 30
    ):
        """
        Initialize Magnus SDK.

        Args:
            api_key: Magnus API key
            api_secret: Magnus API secret
            public_url: Magnus public URL (e.g., https://voice00.epic.dm)
            sip_server: SIP server hostname (e.g., voice00.epic.dm)
            timeout: Request timeout in seconds
        """
        self.api_key = api_key or os.environ.get("MAGNUS_API_KEY", "")
        self.api_secret = api_secret or os.environ.get("MAGNUS_API_SECRET", "")
        self.public_url = (public_url or os.environ.get("MAGNUS_PUBLIC_URL", "https://voice00.epic.dm")).rstrip("/")
        self.sip_server = sip_server or os.environ.get("MAGNUS_SIP_SERVER", "voice00.epic.dm")
        self.timeout = timeout

        if not self.api_key or not self.api_secret:
            logger.warning("Magnus API credentials not configured")

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
        url = f"{self.public_url}/mbilling/index.php/{module}/{action}"

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
            logger.debug(f"Magnus API request: {method} {url}")

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
        Create a new Magnus user. This automatically creates a SIP user.

        Matches PHP: $magnusBilling->createUser([...])
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

    def generate_unique_did(self) -> str:
        """
        Generate a unique DID number in the configured range.

        Based on PHP:
        do {
            $randomNumber = rand(9000, 9999);
            $did = 17678180000 + $randomNumber;
            $id_did = $magnusBilling->getId('did', 'did', $did);
        } while ($id_did);

        Range: 1-767-818-9xxx (9000-9999)
        """
        max_attempts = 100
        for attempt in range(max_attempts):
            # Generate DID in 9xxx range (9000-9999)
            suffix = random.randint(9000, 9999)
            did = f"{self.DID_PREFIX}{suffix}"

            # Check if this DID already exists
            existing_did = self.get_id("did", "did", did)
            logger.debug(f"Checking DID {did}: existing_did={existing_did}, type={type(existing_did)}")

            if not existing_did:
                logger.info(f"Generated unique DID: {did} (attempt {attempt + 1})")
                return did

            logger.debug(f"DID {did} already exists (ID: {existing_did}), retrying...")

        raise MagnusSDKError(f"Could not generate unique DID after {max_attempts} attempts")

    def generate_password(self, length: int = 12) -> str:
        """Generate a random password."""
        import string
        chars = string.ascii_letters + string.digits
        return ''.join(random.choice(chars) for _ in range(length))

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

        Args:
            agent_id: The voice agent ID (used in username)
            agent_name: Name of the agent
            email: Email for the account
            phone: Optional phone number
            did_number: Optional specific DID to use

        Returns:
            ProvisioningResult with all the created resources
        """
        # Generate unique DID if not provided
        did = did_number or self.generate_unique_did()

        # Generate credentials
        password = self.generate_password()

        # Create username from agent name and DID suffix
        # Magnus limits usernames to 20 characters
        # Format: {name_prefix}_{last 4 digits of DID} = max 15 + 1 + 4 = 20
        clean_name = ''.join(c for c in agent_name if c.isalnum())[:15].lower()
        did_suffix = did[-4:]  # Last 4 digits for uniqueness
        username = f"{clean_name}_{did_suffix}"

        logger.info(f"Provisioning voice agent: {agent_id} as {username}")

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
            logger.info(f"Creating SIP account for user {user_id}: {username}")
            sip_result = self.create("sip", {
                "id_user": user_id,
                "name": username,
                "accountcode": username,
                "secret": password,
                "callerid": username,
                "host": "dynamic",
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
                "activated": "1"
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

            # Step 6: Create DID destination (link DID to SIP user)
            logger.info(f"Creating DID destination for DID {did} -> SIP {sip_id}")
            destination_result = self.create("diddestination", {
                "id_user": user_id,
                "id_did": did_id,
                "voip_call": "1",
                "id_sip": sip_id,
                "idUserusername": username,
                "destination": f"SIP/{username}",
                "priority": "1"
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
