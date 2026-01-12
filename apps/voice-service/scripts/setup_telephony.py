#!/usr/bin/env python3
"""
Setup LiveKit SIP Telephony for Epic AI Voice
Creates inbound trunk, dispatch rule for testing calls with +17678183521
"""

import asyncio
import os
import json
import sys

# Environment variables must be set before running:
# LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET
# Example: export LIVEKIT_URL=wss://your-livekit.cloud

from livekit import api
from livekit.protocol.sip import (
    CreateSIPInboundTrunkRequest,
    CreateSIPDispatchRuleRequest,
    ListSIPInboundTrunkRequest,
    ListSIPDispatchRuleRequest,
    SIPInboundTrunkInfo,
    SIPDispatchRuleInfo,
    SIPDispatchRule,
    SIPDispatchRuleIndividual,
)
from livekit.protocol.room import RoomConfiguration

# Configuration
PHONE_NUMBER = '+17678183521'
AGENT_NAME = 'epic-voice-agent'
ORGANIZATION_ID = 'cmk5o6i340002jo040c7bg7ti'
USER_ID = 'user_36XVMb3CwJy3Il2BxCXJcog7dXB'


async def list_existing_config():
    """List existing SIP trunks and dispatch rules"""
    print("\n" + "="*60)
    print("EXISTING LIVEKIT SIP CONFIGURATION")
    print("="*60)

    lkapi = api.LiveKitAPI()

    try:
        # List inbound trunks
        print("\n📞 Inbound Trunks:")
        inbound_result = await lkapi.sip.list_sip_inbound_trunk(ListSIPInboundTrunkRequest())
        if inbound_result.items:
            for trunk in inbound_result.items:
                print(f"  - ID: {trunk.sip_trunk_id}")
                print(f"    Name: {trunk.name}")
                print(f"    Numbers: {list(trunk.numbers)}")
                print()
        else:
            print("  (none)")

        # List dispatch rules
        print("\n📋 Dispatch Rules:")
        rules_result = await lkapi.sip.list_sip_dispatch_rule(ListSIPDispatchRuleRequest())
        if rules_result.items:
            for rule in rules_result.items:
                print(f"  - ID: {rule.sip_dispatch_rule_id}")
                print(f"    Name: {rule.name}")
                print(f"    Trunk IDs: {list(rule.trunk_ids)}")
                print()
        else:
            print("  (none)")

    finally:
        await lkapi.aclose()


async def create_inbound_trunk():
    """Create SIP inbound trunk for receiving calls"""
    print("\n" + "="*60)
    print(f"CREATING INBOUND TRUNK FOR {PHONE_NUMBER}")
    print("="*60)

    lkapi = api.LiveKitAPI()

    try:
        trunk = SIPInboundTrunkInfo(
            name=f"Epic AI Inbound - {PHONE_NUMBER}",
            numbers=[PHONE_NUMBER],
            allowed_addresses=[],
            allowed_numbers=[],
            krisp_enabled=True,
            headers={
                "X-Platform": "Epic-AI",
                "X-User-ID": USER_ID,
                "X-Org-ID": ORGANIZATION_ID
            },
            headers_to_attributes={
                "X-Customer-ID": "customer_id",
            },
        )

        request = CreateSIPInboundTrunkRequest(trunk=trunk)
        result = await lkapi.sip.create_sip_inbound_trunk(request)

        print(f"\n✅ Inbound trunk created successfully!")
        print(f"   Trunk ID: {result.sip_trunk_id}")
        print(f"   Numbers: {list(result.numbers)}")

        return result.sip_trunk_id

    except Exception as e:
        print(f"\n❌ Error creating inbound trunk: {e}")
        return None
    finally:
        await lkapi.aclose()


async def create_dispatch_rule(trunk_id: str):
    """Create dispatch rule to route calls to AI agent"""
    print("\n" + "="*60)
    print(f"CREATING DISPATCH RULE FOR AGENT: {AGENT_NAME}")
    print("="*60)

    lkapi = api.LiveKitAPI()

    try:
        phone_digits = PHONE_NUMBER.replace('+', '').replace('-', '').replace(' ', '')
        room_prefix = f"sip-{phone_digits}__"

        rule = SIPDispatchRule(
            dispatch_rule_individual=SIPDispatchRuleIndividual(
                room_prefix=room_prefix,
            )
        )

        room_config = RoomConfiguration()
        dispatch = room_config.agents.add()
        dispatch.agent_name = AGENT_NAME
        dispatch.metadata = json.dumps({
            "source": "inbound_call",
            "user_id": USER_ID,
            "org_id": ORGANIZATION_ID,
            "phone_number": PHONE_NUMBER
        })

        dispatch_info = SIPDispatchRuleInfo(
            rule=rule,
            name=f"Route {PHONE_NUMBER} -> {AGENT_NAME}",
            trunk_ids=[trunk_id] if trunk_id else [],
            hide_phone_number=False,
            metadata=json.dumps({
                "user_id": USER_ID,
                "org_id": ORGANIZATION_ID,
                "agent": AGENT_NAME,
                "phone_number": PHONE_NUMBER
            }),
            attributes={
                "call_type": "inbound",
                "platform": "epic-ai",
                "user_id": USER_ID,
            },
            room_config=room_config,
        )

        request = CreateSIPDispatchRuleRequest(dispatch_rule=dispatch_info)
        result = await lkapi.sip.create_sip_dispatch_rule(request)

        print(f"\n✅ Dispatch rule created successfully!")
        print(f"   Rule ID: {result.sip_dispatch_rule_id}")
        print(f"   Room Prefix: {room_prefix}")
        print(f"   Agent: {AGENT_NAME}")

        return result.sip_dispatch_rule_id

    except Exception as e:
        print(f"\n❌ Error creating dispatch rule: {e}")
        return None
    finally:
        await lkapi.aclose()


async def main():
    """Main setup function"""
    print("\n" + "="*60)
    print("EPIC AI VOICE TELEPHONY SETUP")
    print("="*60)
    print(f"\nPhone Number: {PHONE_NUMBER}")
    print(f"Agent: {AGENT_NAME}")
    print(f"Organization: {ORGANIZATION_ID}")
    print(f"LiveKit URL: {os.environ['LIVEKIT_URL']}")

    # First list existing config
    await list_existing_config()

    # Check if user wants to proceed
    if len(sys.argv) > 1 and sys.argv[1] == '--create':
        # Create inbound trunk
        trunk_id = await create_inbound_trunk()

        if trunk_id:
            # Create dispatch rule
            rule_id = await create_dispatch_rule(trunk_id)

            if rule_id:
                print("\n" + "="*60)
                print("SETUP COMPLETE!")
                print("="*60)
                print(f"\n🎉 Your phone number {PHONE_NUMBER} is now ready to receive calls!")
                print(f"\n📞 To test inbound calls:")
                print(f"   Call {PHONE_NUMBER} from any phone")
                print(f"   The call will be routed to agent: {AGENT_NAME}")
                print(f"\n📤 For outbound calls:")
                print(f"   An outbound trunk needs to be configured with Magnus SIP credentials")
            else:
                print("\n⚠️ Trunk created but dispatch rule failed")
        else:
            print("\n⚠️ Failed to create inbound trunk")
    else:
        print("\n" + "="*60)
        print("RUN WITH --create TO SET UP TELEPHONY")
        print("="*60)
        print(f"\nUsage: python {sys.argv[0]} --create")


if __name__ == '__main__':
    asyncio.run(main())
