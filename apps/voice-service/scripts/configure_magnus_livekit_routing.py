#!/usr/bin/env python3
"""
Configure Magnus Billing to route DID +17678183521 to LiveKit SIP.

This script:
1. Creates a SIP trunk in Magnus pointing to LiveKit SIP domain
2. Sets the inbound route for the DID to forward to LiveKit
"""

import os
import sys
import hmac
import hashlib
import time
import requests
import urllib3
from urllib.parse import urlencode

# Suppress SSL warnings for Magnus server (self-signed certificate)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuration
MAGNUS_PUBLIC_URL = "https://voice00.epic.dm"
MAGNUS_API_KEY = os.environ.get("MAGNUS_API_KEY", "8c0f89a45a4e485ab75babad914d33d0")
MAGNUS_API_SECRET = os.environ.get("MAGNUS_API_SECRET", "dc59cbbf25ab420ea9e6bff05479dc68")

# LiveKit SIP Configuration
LIVEKIT_SIP_DOMAIN = "3m4yki5jezn.sip.livekit.cloud"
DID_NUMBER = "+17678183521"
DID_CLEAN = "17678183521"


def make_magnus_request(action: str, module: str, data: dict = None) -> dict:
    """
    Make an API request to Magnus Billing using HMAC-SHA512 authentication.
    """
    url = f"{MAGNUS_PUBLIC_URL}/mbilling/index.php/{module}/{action}"

    # Build form data
    form_data = {
        "module": module,
        "action": action,
        "nonce": str(int(time.time() * 1000000)),
    }
    if data:
        form_data.update(data)

    # URL-encode the POST data
    post_data = urlencode(form_data)

    # Compute HMAC-SHA512 signature
    signature = hmac.new(
        MAGNUS_API_SECRET.encode('utf-8'),
        post_data.encode('utf-8'),
        hashlib.sha512
    ).hexdigest()

    # Set authentication headers
    headers = {
        "Key": MAGNUS_API_KEY,
        "Sign": signature,
        "Content-Type": "application/x-www-form-urlencoded",
    }

    print(f"  Request: {action} {module}")

    try:
        response = requests.post(
            url,
            data=post_data,
            headers=headers,
            timeout=30,
            verify=False
        )

        try:
            result = response.json()
        except ValueError:
            result = {"raw": response.text}

        print(f"  Response ({response.status_code}): {result}")
        return result

    except Exception as e:
        print(f"  Error: {e}")
        return {"success": False, "error": str(e)}


def list_trunks():
    """List existing trunks in Magnus."""
    print("\n" + "="*60)
    print("LISTING EXISTING TRUNKS")
    print("="*60)

    result = make_magnus_request("read", "trunk")

    if result.get("rows"):
        print(f"\nFound {len(result['rows'])} trunks:")
        for trunk in result["rows"]:
            print(f"  - ID: {trunk.get('id')}, Name: {trunk.get('trunkcode')}, Host: {trunk.get('host')}")
    else:
        print("No trunks found")

    return result


def create_livekit_trunk():
    """Create a SIP trunk to LiveKit."""
    print("\n" + "="*60)
    print(f"CREATING LIVEKIT SIP TRUNK")
    print(f"Host: {LIVEKIT_SIP_DOMAIN}")
    print("="*60)

    trunk_data = {
        "id": "0",  # 0 = create new
        "trunkcode": "livekit_sip",
        "host": LIVEKIT_SIP_DOMAIN,
        "fromuser": "",  # No auth needed for LiveKit inbound
        "fromdomain": LIVEKIT_SIP_DOMAIN,
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
        "transport": "udp,tcp",
        "directmedia": "no",
        "port": "5060",
    }

    result = make_magnus_request("save", "trunk", trunk_data)

    if result.get("success"):
        trunk_id = result.get("rows", [{}])[0].get("id") if result.get("rows") else result.get("id")
        print(f"\n✅ LiveKit trunk created! ID: {trunk_id}")
        return trunk_id
    else:
        print(f"\n❌ Failed to create trunk: {result.get('msg', result)}")
        return None


def find_did():
    """Find the DID in Magnus."""
    print("\n" + "="*60)
    print(f"FINDING DID: {DID_NUMBER}")
    print("="*60)

    result = make_magnus_request("read", "did", {
        "filter": f'[{{"field":"did","value":"{DID_CLEAN}"}}]'
    })

    if result.get("rows") and len(result["rows"]) > 0:
        did = result["rows"][0]
        print(f"\n✅ Found DID!")
        print(f"  ID: {did.get('id')}")
        print(f"  Number: {did.get('did')}")
        print(f"  User ID: {did.get('id_user')}")
        return did
    else:
        print(f"\n❌ DID not found")
        return None


def find_livekit_trunk():
    """Find or get the LiveKit trunk."""
    print("\n" + "="*60)
    print("FINDING LIVEKIT TRUNK")
    print("="*60)

    result = make_magnus_request("read", "trunk", {
        "filter": f'[{{"field":"trunkcode","value":"livekit_sip"}}]'
    })

    if result.get("rows") and len(result["rows"]) > 0:
        trunk = result["rows"][0]
        print(f"\n✅ Found LiveKit trunk!")
        print(f"  ID: {trunk.get('id')}")
        print(f"  Host: {trunk.get('host')}")
        return trunk.get("id")
    else:
        print("\n⚠️ LiveKit trunk not found, will create it")
        return None


def create_did_destination(did_id: str, trunk_id: str):
    """Create DID destination to route to LiveKit trunk."""
    print("\n" + "="*60)
    print(f"CREATING DID DESTINATION")
    print(f"DID ID: {did_id} -> Trunk ID: {trunk_id}")
    print("="*60)

    # First, check if there's an existing destination
    existing = make_magnus_request("read", "diddestination", {
        "filter": f'[{{"field":"id_did","value":"{did_id}"}}]'
    })

    if existing.get("rows") and len(existing["rows"]) > 0:
        # Update existing destination
        dest = existing["rows"][0]
        dest_id = dest.get("id")
        print(f"\nUpdating existing destination ID: {dest_id}")

        dest_data = {
            "id": dest_id,
            "id_did": did_id,
            "id_trunk": trunk_id,
            "voip_call": "0",  # Not routing to local SIP
            "id_sip": "",
            "destination": f"SIP/{DID_CLEAN}@{LIVEKIT_SIP_DOMAIN}",
            "priority": "1",
        }
    else:
        # Create new destination
        print("\nCreating new destination")
        dest_data = {
            "id": "0",
            "id_did": did_id,
            "id_trunk": trunk_id,
            "voip_call": "0",
            "id_sip": "",
            "destination": f"SIP/{DID_CLEAN}@{LIVEKIT_SIP_DOMAIN}",
            "priority": "1",
        }

    result = make_magnus_request("save", "diddestination", dest_data)

    if result.get("success"):
        print(f"\n✅ DID destination configured!")
        print(f"  Calls to {DID_NUMBER} will be routed to {LIVEKIT_SIP_DOMAIN}")
        return True
    else:
        print(f"\n❌ Failed to configure destination: {result.get('msg', result)}")
        return False


def main():
    """Main configuration flow."""
    print("\n" + "="*60)
    print("MAGNUS BILLING -> LIVEKIT ROUTING CONFIGURATION")
    print("="*60)
    print(f"\nMagnus URL: {MAGNUS_PUBLIC_URL}")
    print(f"DID: {DID_NUMBER}")
    print(f"LiveKit SIP: {LIVEKIT_SIP_DOMAIN}")

    # Step 1: List existing trunks
    list_trunks()

    # Step 2: Find or create LiveKit trunk
    trunk_id = find_livekit_trunk()
    if not trunk_id:
        trunk_id = create_livekit_trunk()
        if not trunk_id:
            print("\n❌ Cannot proceed without trunk")
            return False

    # Step 3: Find the DID
    did = find_did()
    if not did:
        print("\n❌ Cannot proceed without DID")
        return False

    did_id = did.get("id")

    # Step 4: Configure DID destination to route to LiveKit
    success = create_did_destination(did_id, trunk_id)

    if success:
        print("\n" + "="*60)
        print("CONFIGURATION COMPLETE!")
        print("="*60)
        print(f"\n🎉 Calls to {DID_NUMBER} will now be routed to LiveKit!")
        print(f"\nCall Flow:")
        print(f"  1. Incoming call to {DID_NUMBER}")
        print(f"  2. Magnus Billing receives call")
        print(f"  3. Routes to trunk: {LIVEKIT_SIP_DOMAIN}")
        print(f"  4. LiveKit inbound trunk receives call")
        print(f"  5. Dispatch rule routes to voice agent")
        print(f"\n📞 Test by calling {DID_NUMBER}!")
        return True

    return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
