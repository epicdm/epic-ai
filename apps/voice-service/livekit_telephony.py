"""
LiveKit SIP Telephony Integration
Manages SIP trunk and dispatch rule creation for phone-to-agent routing
Updated for Magnus Billing integration
"""

import os
import json
import uuid
from typing import Optional, Dict, List, Any
from livekit import api
from livekit.protocol.sip import (
    CreateSIPInboundTrunkRequest,
    CreateSIPOutboundTrunkRequest,
    CreateSIPDispatchRuleRequest,
    ListSIPInboundTrunkRequest,
    ListSIPOutboundTrunkRequest,
    ListSIPDispatchRuleRequest,
    DeleteSIPTrunkRequest,
    DeleteSIPDispatchRuleRequest,
    SIPInboundTrunkInfo,
    SIPOutboundTrunkInfo,
    SIPDispatchRuleInfo,
    SIPDispatchRule,
    SIPDispatchRuleIndividual,
    CreateSIPParticipantRequest,
)
from livekit.protocol.room import RoomConfiguration, CreateRoomRequest
from livekit.protocol.agent_dispatch import CreateAgentDispatchRequest


class LiveKitTelephonyManager:
    """
    Manages LiveKit SIP configuration for voice agent telephony
    Integrates with Magnus Billing for SIP trunk credentials
    """

    def __init__(self):
        """Initialize LiveKit API client"""
        self.livekit_url = os.getenv('LIVEKIT_URL')
        self.livekit_api_key = os.getenv('LIVEKIT_API_KEY')
        self.livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')

        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            print("Warning: LiveKit credentials not fully configured")

    def _check_credentials(self) -> Optional[Dict[str, Any]]:
        """Check if LiveKit credentials are configured"""
        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            return {
                'success': False,
                'error': 'LiveKit credentials not configured'
            }
        return None

    async def create_inbound_trunk(
        self,
        phone_numbers: List[str],
        user_id: Optional[str] = None,
        organization_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create SIP Inbound Trunk for receiving calls to phone numbers

        Args:
            phone_numbers: List of phone numbers (e.g., ['+15105550100'])
            user_id: Optional user ID for multi-tenant tracking
            organization_id: Optional organization ID

        Returns:
            dict: {'success': bool, 'trunk_id': str, 'error': str}
        """
        error = self._check_credentials()
        if error:
            return {**error, 'trunk_id': None}

        lkapi = api.LiveKitAPI()

        try:
            trunk_name = f"Org {organization_id[:8]} Inbound" if organization_id else "Inbound Trunk"

            trunk = SIPInboundTrunkInfo(
                name=trunk_name,
                numbers=phone_numbers,
                allowed_addresses=[],
                allowed_numbers=[],
                krisp_enabled=True,
                headers={
                    "X-Platform": "Epic-AI",
                    "X-User-ID": user_id or "unknown",
                    "X-Org-ID": organization_id or "unknown"
                },
                headers_to_attributes={
                    "X-Customer-ID": "customer_id",
                },
            )

            request = CreateSIPInboundTrunkRequest(trunk=trunk)
            result = await lkapi.sip.create_sip_inbound_trunk(request)

            return {
                'success': True,
                'trunk_id': result.sip_trunk_id,
                'numbers': list(result.numbers),
                'error': None
            }

        except Exception as e:
            return {
                'success': False,
                'trunk_id': None,
                'error': str(e)
            }
        finally:
            await lkapi.aclose()

    async def create_outbound_trunk(
        self,
        username: str,
        password: str,
        sip_domain: str,
        phone_numbers: List[str],
        user_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        port: int = 5060
    ) -> Dict[str, Any]:
        """
        Create SIP Outbound Trunk for making calls through Magnus Billing

        Args:
            username: SIP username from Magnus Billing
            password: SIP password from Magnus Billing
            sip_domain: SIP server domain
            phone_numbers: List of DIDs for caller ID
            user_id: Optional user ID for tracking
            organization_id: Optional organization ID
            port: SIP port (default: 5060)

        Returns:
            dict: {'success': bool, 'trunk_id': str, 'error': str}
        """
        error = self._check_credentials()
        if error:
            return {**error, 'trunk_id': None}

        lkapi = api.LiveKitAPI()

        try:
            trunk_name = f"Org {organization_id[:8]} Outbound - Magnus" if organization_id else "Outbound Trunk - Magnus"
            sip_address = f"{sip_domain}:{port}"

            trunk = SIPOutboundTrunkInfo(
                name=trunk_name,
                address=sip_address,
                auth_username=username,
                auth_password=password,
                numbers=phone_numbers,
            )

            request = CreateSIPOutboundTrunkRequest(trunk=trunk)
            result = await lkapi.sip.create_sip_outbound_trunk(request)

            return {
                'success': True,
                'trunk_id': result.sip_trunk_id,
                'numbers': list(result.numbers),
                'error': None
            }

        except Exception as e:
            return {
                'success': False,
                'trunk_id': None,
                'error': str(e)
            }
        finally:
            await lkapi.aclose()

    async def create_dispatch_rule(
        self,
        agent_name: str,
        trunk_ids: Optional[List[str]] = None,
        phone_numbers: Optional[List[str]] = None,
        user_id: Optional[str] = None,
        organization_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create Dispatch Rule to route incoming calls to AI agents

        Args:
            agent_name: Name of the deployed LiveKit agent
            trunk_ids: Optional list of trunk IDs (empty = all trunks)
            phone_numbers: Optional list of phone numbers for this rule
            user_id: Optional user ID for tracking
            organization_id: Optional organization ID

        Returns:
            dict: {'success': bool, 'rule_id': str, 'error': str}
        """
        error = self._check_credentials()
        if error:
            return {**error, 'rule_id': None}

        lkapi = api.LiveKitAPI()

        try:
            numbers_str = ", ".join(phone_numbers[:2]) if phone_numbers else "All"
            if phone_numbers and len(phone_numbers) > 2:
                numbers_str += f" +{len(phone_numbers) - 2}"
            rule_name = f"Agent: {agent_name} -> {numbers_str}"

            phone_number = phone_numbers[0] if phone_numbers else None
            phone_digits = phone_number.replace('+', '').replace('-', '').replace(' ', '') if phone_number else "unknown"
            room_prefix = f"sip-{phone_digits}__"

            rule = SIPDispatchRule(
                dispatch_rule_individual=SIPDispatchRuleIndividual(
                    room_prefix=room_prefix,
                )
            )

            room_config = RoomConfiguration()
            dispatch = room_config.agents.add()
            dispatch.agent_name = agent_name
            dispatch.metadata = json.dumps({
                "source": "inbound_call",
                "user_id": user_id or "unknown",
                "org_id": organization_id or "unknown",
                "phone_number": phone_number or "unknown"
            })

            dispatch_info = SIPDispatchRuleInfo(
                rule=rule,
                name=rule_name,
                trunk_ids=trunk_ids or [],
                hide_phone_number=False,
                metadata=json.dumps({
                    "user_id": user_id or "unknown",
                    "org_id": organization_id or "unknown",
                    "agent": agent_name,
                    "phone_number": phone_number or "unknown"
                }),
                attributes={
                    "call_type": "inbound",
                    "platform": "epic-ai",
                    "user_id": user_id or "unknown",
                },
                room_config=room_config,
            )

            request = CreateSIPDispatchRuleRequest(dispatch_rule=dispatch_info)
            result = await lkapi.sip.create_sip_dispatch_rule(request)

            return {
                'success': True,
                'rule_id': result.sip_dispatch_rule_id,
                'error': None
            }

        except Exception as e:
            return {
                'success': False,
                'rule_id': None,
                'error': str(e)
            }
        finally:
            await lkapi.aclose()

    async def list_inbound_trunks(self) -> Dict[str, Any]:
        """List all SIP inbound trunks"""
        error = self._check_credentials()
        if error:
            return {**error, 'trunks': []}

        lkapi = api.LiveKitAPI()

        try:
            request = ListSIPInboundTrunkRequest()
            result = await lkapi.sip.list_sip_inbound_trunk(request)

            trunks = [
                {
                    'trunk_id': trunk.sip_trunk_id,
                    'name': trunk.name,
                    'numbers': list(trunk.numbers),
                    'krisp_enabled': trunk.krisp_enabled
                }
                for trunk in result.items
            ]

            return {
                'success': True,
                'trunks': trunks,
                'error': None
            }

        except Exception as e:
            return {
                'success': False,
                'trunks': [],
                'error': str(e)
            }
        finally:
            await lkapi.aclose()

    async def list_outbound_trunks(self) -> Dict[str, Any]:
        """List all SIP outbound trunks"""
        error = self._check_credentials()
        if error:
            return {**error, 'trunks': []}

        lkapi = api.LiveKitAPI()

        try:
            request = ListSIPOutboundTrunkRequest()
            result = await lkapi.sip.list_sip_outbound_trunk(request)

            trunks = [
                {
                    'trunk_id': trunk.sip_trunk_id,
                    'name': trunk.name,
                    'numbers': list(trunk.numbers),
                    'address': trunk.address
                }
                for trunk in result.items
            ]

            return {
                'success': True,
                'trunks': trunks,
                'error': None
            }

        except Exception as e:
            return {
                'success': False,
                'trunks': [],
                'error': str(e)
            }
        finally:
            await lkapi.aclose()

    async def list_dispatch_rules(self) -> Dict[str, Any]:
        """List all SIP dispatch rules"""
        error = self._check_credentials()
        if error:
            return {**error, 'rules': []}

        lkapi = api.LiveKitAPI()

        try:
            request = ListSIPDispatchRuleRequest()
            result = await lkapi.sip.list_sip_dispatch_rule(request)

            rules = [
                {
                    'rule_id': rule.sip_dispatch_rule_id,
                    'name': rule.name,
                    'trunk_ids': list(rule.trunk_ids)
                }
                for rule in result.items
            ]

            return {
                'success': True,
                'rules': rules,
                'error': None
            }

        except Exception as e:
            return {
                'success': False,
                'rules': [],
                'error': str(e)
            }
        finally:
            await lkapi.aclose()

    async def delete_inbound_trunk(self, trunk_id: str) -> Dict[str, Any]:
        """Delete SIP inbound trunk"""
        error = self._check_credentials()
        if error:
            return error

        lkapi = api.LiveKitAPI()

        try:
            request = DeleteSIPTrunkRequest(sip_trunk_id=trunk_id)
            await lkapi.sip.delete_sip_trunk(request)

            return {'success': True, 'error': None}

        except Exception as e:
            return {'success': False, 'error': str(e)}
        finally:
            await lkapi.aclose()

    async def delete_dispatch_rule(self, rule_id: str) -> Dict[str, Any]:
        """Delete SIP dispatch rule"""
        error = self._check_credentials()
        if error:
            return error

        lkapi = api.LiveKitAPI()

        try:
            request = DeleteSIPDispatchRuleRequest(sip_dispatch_rule_id=rule_id)
            await lkapi.sip.delete_sip_dispatch_rule(request)

            return {'success': True, 'error': None}

        except Exception as e:
            return {'success': False, 'error': str(e)}
        finally:
            await lkapi.aclose()

    async def create_outbound_call(
        self,
        from_number: str,
        to_number: str,
        trunk_id: str,
        agent_name: str,
        agent_config_id: Optional[str] = None,
        organization_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create an outbound call from a phone number to a destination

        Args:
            from_number: The phone number making the call (caller ID)
            to_number: The destination phone number
            trunk_id: LiveKit outbound trunk ID
            agent_name: Agent name to handle the call
            agent_config_id: Agent configuration ID for dynamic routing
            organization_id: Organization ID for tracking

        Returns:
            dict: {'success': bool, 'room_name': str, 'call_id': str, 'error': str}
        """
        error = self._check_credentials()
        if error:
            return {**error, 'room_name': None, 'call_id': None}

        lkapi = api.LiveKitAPI()

        try:
            call_id = str(uuid.uuid4())[:8]

            if agent_config_id:
                room_name = f"outbound-{call_id}-{agent_config_id}"
            else:
                room_name = f"outbound-{call_id}"

            # Create room
            room_request = CreateRoomRequest(name=room_name)
            await lkapi.room.create_room(room_request)

            # Create agent dispatch with metadata
            if agent_name:
                metadata = {}
                if agent_config_id:
                    metadata['agent_config_id'] = agent_config_id
                if organization_id:
                    metadata['organization_id'] = organization_id

                dispatch_request = CreateAgentDispatchRequest(
                    agent_name=agent_name,
                    room=room_name,
                    metadata=json.dumps(metadata) if metadata else ""
                )
                await lkapi.agent_dispatch.create_dispatch(dispatch_request)

            # Create SIP participant
            sip_request = CreateSIPParticipantRequest(
                sip_trunk_id=trunk_id,
                sip_call_to=to_number,
                sip_number=from_number,
                room_name=room_name,
                participant_identity=f"caller-{call_id}",
                participant_name=f"Outbound Call to {to_number}",
                play_ringtone=True
            )

            sip_participant = await lkapi.sip.create_sip_participant(sip_request)

            return {
                'success': True,
                'room_name': room_name,
                'call_id': call_id,
                'participant_id': sip_participant.participant_id,
                'error': None
            }

        except Exception as e:
            return {
                'success': False,
                'room_name': None,
                'call_id': None,
                'error': str(e)
            }
        finally:
            await lkapi.aclose()


# Singleton instance
telephony_manager = LiveKitTelephonyManager()
