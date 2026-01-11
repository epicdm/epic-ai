"""
Magnus Billing SDK Client

Python implementation matching the PHP Magnus Billing SDK pattern.
Used for creating SIP users, DIDs, and DID destinations for voice agents.
"""

import os
import random
import logging
import requests
from typing import Optional, Dict, Any
from dataclasses import dataclass

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
    $magnusBilling->public_url = "https://voice.epic.dm";
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
            public_url: Magnus public URL (e.g., https://voice.epic.dm)
            sip_server: SIP server hostname (e.g., voice00.epic.dm)
            timeout: Request timeout in seconds
        """
        self.api_key = api_key or os.environ.get("MAGNUS_API_KEY", "")
        self.api_secret = api_secret or os.environ.get("MAGNUS_API_SECRET", "")
        self.public_url = (public_url or os.environ.get("MAGNUS_PUBLIC_URL", "https://voice.epic.dm")).rstrip("/")
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

        The Magnus API uses a form-based approach:
        POST /mbilling/index.php/module/action
        with form data including api_key and api_secret
        """
        url = f"{self.public_url}/mbilling/index.php/{module}/{action}"

        form_data = {
            "api_key": self.api_key,
            "api_secret": self.api_secret,
        }
        if data:
            form_data.update(data)

        try:
            logger.debug(f"Magnus API request: {method} {url}")

            response = requests.request(
                method=method,
                url=url,
                data=form_data,
                timeout=self.timeout
            )

            try:
                response_data = response.json()
            except ValueError:
                response_data = {"raw": response.text}

            if not response.ok:
                raise MagnusSDKError(
                    message=f"API request failed: {response.text}",
                    status_code=response.status_code,
                    response=response_data
                )

            # Check for API-level errors
            if isinstance(response_data, dict) and response_data.get("success") == False:
                raise MagnusSDKError(
                    message=response_data.get("msg", "Unknown error"),
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
        data = {
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
        }

        return self._make_request("save", "user", data)

    def create(self, module: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a record in any Magnus module.

        Matches PHP: $magnusBilling->create('module', [...])
        """
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
        """
        data = {
            "filter": f'[{{"field":"{field}","value":"{value}"}}]'
        }

        try:
            response = self._make_request("read", module, data)

            if isinstance(response, dict) and "rows" in response:
                rows = response["rows"]
                if rows and len(rows) > 0:
                    return str(rows[0].get("id", ""))

            return None
        except MagnusSDKError:
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

    def generate_did(self) -> str:
        """
        Generate a random DID number in the configured range.

        Based on PHP: $did = 17678180000 + rand(9000, 9999);
        """
        suffix = random.randint(0, 9999)
        return f"{self.DID_PREFIX}{suffix:04d}"

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
        # Generate DID if not provided
        did = did_number or self.generate_did()

        # Generate credentials
        password = self.generate_password()

        # Create username from agent name and DID
        # Clean agent name: remove non-alphanumeric, lowercase, truncate
        clean_name = ''.join(c for c in agent_name if c.isalnum())[:20].lower()
        username = f"{clean_name}_{did}"

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

            if not user_result.get("success", False):
                raise MagnusSDKError(f"Failed to create user: {user_result.get('msg', 'Unknown error')}")

            # Step 2: Get the created user ID
            user_id = self.get_id("user", "username", username)
            if not user_id:
                raise MagnusSDKError("Could not find created user")
            logger.info(f"Created user ID: {user_id}")

            # Step 3: Get the auto-created SIP user ID
            sip_id = self.get_id("sip", "id_user", user_id)
            if not sip_id:
                raise MagnusSDKError("Could not find SIP user")
            logger.info(f"SIP user ID: {sip_id}")

            # Step 4: Create DID
            logger.info(f"Creating DID: {did}")
            did_result = self.create("did", {
                "did": did,
                "country": "Dominica",
                "activated": "1"
            })

            if not did_result.get("success", False):
                raise MagnusSDKError(f"Failed to create DID: {did_result.get('msg', 'Unknown error')}")

            # Step 5: Get the created DID ID
            did_id = self.get_id("did", "did", did)
            if not did_id:
                raise MagnusSDKError("Could not find created DID")
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
