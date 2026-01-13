"""
Epic AI Voice Service
Full-featured voice backend with LiveKit, Magnus Billing, and campaign management
"""
import os
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app)

# Import blueprints
from livekit_manager import livekit_manager
from agent_creator import agent_creator

# Register blueprints
app.register_blueprint(livekit_manager)

# ============================================
# Health & Status Endpoints
# ============================================

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "voice-service",
        "version": "2.0.0"
    }), 200


@app.route('/')
def home():
    """Home endpoint"""
    return jsonify({
        "service": "Epic AI Voice Service",
        "version": "2.0.0",
        "endpoints": {
            "health": "/health",
            "livekit": "/api/livekit/*",
            "agents": "/api/agents/*",
            "telephony": "/api/telephony/*",
            "magnus": "/api/magnus/*"
        },
        "diagnostic_endpoints": {
            "magnus_diagnostics": "/api/magnus/diagnostics",
            "did_usage": "/api/magnus/check-did-usage",
            "did_check": "/api/magnus/test-did-check/<did>",
            "magnus_health": "/api/magnus/health"
        }
    }), 200


# ============================================
# Agent Management Endpoints
# ============================================

@app.route('/api/agents', methods=['GET'])
def list_agents():
    """List all agents"""
    try:
        agents = agent_creator.list_agents()
        return jsonify({
            "success": True,
            "data": agents
        }), 200
    except Exception as e:
        logger.error(f"Error listing agents: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/agents', methods=['POST'])
def create_agent():
    """Create a new agent from configuration"""
    try:
        config = request.get_json()
        if not config:
            return jsonify({"error": "Configuration required"}), 400

        if 'name' not in config:
            return jsonify({"error": "Agent name required"}), 400

        result = agent_creator.create_agent(config)
        return jsonify({
            "success": True,
            "data": result
        }), 201
    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/agents/<agent_id>', methods=['GET'])
def get_agent(agent_id):
    """Get agent details"""
    try:
        agent = agent_creator.get_agent(agent_id)
        return jsonify({
            "success": True,
            "data": agent
        }), 200
    except FileNotFoundError:
        return jsonify({"error": "Agent not found"}), 404
    except Exception as e:
        logger.error(f"Error getting agent: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/agents/<agent_id>', methods=['PUT'])
def update_agent(agent_id):
    """Update agent configuration"""
    try:
        config = request.get_json()
        if not config:
            return jsonify({"error": "Configuration required"}), 400

        result = agent_creator.update_agent(agent_id, config)
        return jsonify({
            "success": True,
            "data": result
        }), 200
    except FileNotFoundError:
        return jsonify({"error": "Agent not found"}), 404
    except Exception as e:
        logger.error(f"Error updating agent: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/agents/<agent_id>', methods=['DELETE'])
def delete_agent(agent_id):
    """Delete an agent"""
    try:
        result = agent_creator.delete_agent(agent_id)
        return jsonify({
            "success": True,
            "data": result
        }), 200
    except FileNotFoundError:
        return jsonify({"error": "Agent not found"}), 404
    except Exception as e:
        logger.error(f"Error deleting agent: {e}")
        return jsonify({"error": str(e)}), 500


# ============================================
# Telephony Endpoints (LiveKit SIP)
# ============================================

@app.route('/api/telephony/trunks/inbound', methods=['GET'])
def list_inbound_trunks():
    """List all inbound SIP trunks"""
    import asyncio
    from livekit_telephony import telephony_manager

    try:
        result = asyncio.run(telephony_manager.list_inbound_trunks())
        return jsonify(result), 200 if result['success'] else 500
    except Exception as e:
        logger.error(f"Error listing inbound trunks: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/telephony/trunks/inbound', methods=['POST'])
def create_inbound_trunk():
    """Create an inbound SIP trunk"""
    import asyncio
    from livekit_telephony import telephony_manager

    try:
        data = request.get_json() or {}
        phone_numbers = data.get('phone_numbers', [])
        user_id = data.get('user_id')
        organization_id = data.get('organization_id')

        if not phone_numbers:
            return jsonify({"error": "phone_numbers required"}), 400

        result = asyncio.run(telephony_manager.create_inbound_trunk(
            phone_numbers=phone_numbers,
            user_id=user_id,
            organization_id=organization_id
        ))
        return jsonify(result), 201 if result['success'] else 500
    except Exception as e:
        logger.error(f"Error creating inbound trunk: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/telephony/trunks/outbound', methods=['GET'])
def list_outbound_trunks():
    """List all outbound SIP trunks"""
    import asyncio
    from livekit_telephony import telephony_manager

    try:
        result = asyncio.run(telephony_manager.list_outbound_trunks())
        return jsonify(result), 200 if result['success'] else 500
    except Exception as e:
        logger.error(f"Error listing outbound trunks: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/telephony/trunks/outbound', methods=['POST'])
def create_outbound_trunk():
    """Create an outbound SIP trunk using Magnus Billing credentials"""
    import asyncio
    from livekit_telephony import telephony_manager

    try:
        data = request.get_json() or {}

        required = ['username', 'password', 'sip_domain', 'phone_numbers']
        for field in required:
            if field not in data:
                return jsonify({"error": f"{field} required"}), 400

        result = asyncio.run(telephony_manager.create_outbound_trunk(
            username=data['username'],
            password=data['password'],
            sip_domain=data['sip_domain'],
            phone_numbers=data['phone_numbers'],
            user_id=data.get('user_id'),
            organization_id=data.get('organization_id'),
            port=data.get('port', 5060)
        ))
        return jsonify(result), 201 if result['success'] else 500
    except Exception as e:
        logger.error(f"Error creating outbound trunk: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/telephony/trunks/<trunk_id>', methods=['DELETE'])
def delete_trunk(trunk_id):
    """Delete a SIP trunk"""
    import asyncio
    from livekit_telephony import telephony_manager

    try:
        result = asyncio.run(telephony_manager.delete_inbound_trunk(trunk_id))
        return jsonify(result), 200 if result['success'] else 500
    except Exception as e:
        logger.error(f"Error deleting trunk: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/telephony/dispatch-rules', methods=['GET'])
def list_dispatch_rules():
    """List all dispatch rules"""
    import asyncio
    from livekit_telephony import telephony_manager

    try:
        result = asyncio.run(telephony_manager.list_dispatch_rules())
        return jsonify(result), 200 if result['success'] else 500
    except Exception as e:
        logger.error(f"Error listing dispatch rules: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/telephony/dispatch-rules', methods=['POST'])
def create_dispatch_rule():
    """Create a dispatch rule"""
    import asyncio
    from livekit_telephony import telephony_manager

    try:
        data = request.get_json() or {}

        if 'agent_name' not in data:
            return jsonify({"error": "agent_name required"}), 400

        result = asyncio.run(telephony_manager.create_dispatch_rule(
            agent_name=data['agent_name'],
            trunk_ids=data.get('trunk_ids'),
            phone_numbers=data.get('phone_numbers'),
            user_id=data.get('user_id'),
            organization_id=data.get('organization_id')
        ))
        return jsonify(result), 201 if result['success'] else 500
    except Exception as e:
        logger.error(f"Error creating dispatch rule: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/telephony/dispatch-rules/<rule_id>', methods=['DELETE'])
def delete_dispatch_rule(rule_id):
    """Delete a dispatch rule"""
    import asyncio
    from livekit_telephony import telephony_manager

    try:
        result = asyncio.run(telephony_manager.delete_dispatch_rule(rule_id))
        return jsonify(result), 200 if result['success'] else 500
    except Exception as e:
        logger.error(f"Error deleting dispatch rule: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/telephony/call', methods=['POST'])
def make_outbound_call():
    """Initiate an outbound call"""
    import asyncio
    from livekit_telephony import telephony_manager

    try:
        data = request.get_json() or {}

        required = ['from_number', 'to_number', 'trunk_id', 'agent_name']
        for field in required:
            if field not in data:
                return jsonify({"error": f"{field} required"}), 400

        result = asyncio.run(telephony_manager.create_outbound_call(
            from_number=data['from_number'],
            to_number=data['to_number'],
            trunk_id=data['trunk_id'],
            agent_name=data['agent_name'],
            agent_config_id=data.get('agent_config_id'),
            organization_id=data.get('organization_id')
        ))
        return jsonify(result), 201 if result['success'] else 500
    except Exception as e:
        logger.error(f"Error making outbound call: {e}")
        return jsonify({"error": str(e)}), 500


# ============================================
# Magnus Billing Endpoints
# ============================================

@app.route('/api/magnus/health', methods=['GET'])
def magnus_health():
    """Check Magnus Billing API health"""
    try:
        from magnus_billing import get_magnus_client
        client = get_magnus_client()
        result = client.health_check()
        return jsonify({
            "success": True,
            "data": result
        }), 200
    except Exception as e:
        logger.error(f"Magnus health check failed: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/magnus/balance', methods=['GET'])
def magnus_balance():
    """Get Magnus Billing account balance"""
    try:
        from magnus_billing import get_magnus_client
        client = get_magnus_client()
        result = client.get_current_balance()
        return jsonify({
            "success": True,
            "data": result
        }), 200
    except Exception as e:
        logger.error(f"Error getting balance: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/magnus/dids', methods=['GET'])
def magnus_list_dids():
    """List owned DIDs"""
    try:
        from magnus_billing import get_magnus_client
        client = get_magnus_client()
        dids = client.list_owned_dids()
        return jsonify({
            "success": True,
            "data": [
                {
                    "id": did.id,
                    "number": did.number,
                    "country_code": did.country_code,
                    "monthly_cost": did.monthly_cost,
                    "status": did.status,
                    "trunk_id": did.trunk_id
                }
                for did in dids
            ]
        }), 200
    except Exception as e:
        logger.error(f"Error listing DIDs: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/magnus/dids/available', methods=['GET'])
def magnus_available_dids():
    """List available DIDs for purchase"""
    try:
        from magnus_billing import get_magnus_client
        client = get_magnus_client()

        country_code = request.args.get('country_code')
        area_code = request.args.get('area_code')

        dids = client.list_available_dids(
            country_code=country_code,
            area_code=area_code
        )
        return jsonify({
            "success": True,
            "data": [
                {
                    "id": did.id,
                    "number": did.number,
                    "country_code": did.country_code,
                    "monthly_cost": did.monthly_cost,
                    "status": did.status
                }
                for did in dids
            ]
        }), 200
    except Exception as e:
        logger.error(f"Error listing available DIDs: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/magnus/dids/purchase', methods=['POST'])
def magnus_purchase_did():
    """Purchase a DID"""
    try:
        from magnus_billing import get_magnus_client
        client = get_magnus_client()

        data = request.get_json() or {}
        if 'number' not in data:
            return jsonify({"error": "number required"}), 400

        did = client.purchase_did(data['number'])
        return jsonify({
            "success": True,
            "data": {
                "id": did.id,
                "number": did.number,
                "country_code": did.country_code,
                "monthly_cost": did.monthly_cost,
                "status": did.status
            }
        }), 201
    except Exception as e:
        logger.error(f"Error purchasing DID: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/magnus/dids/<did_number>', methods=['DELETE'])
def magnus_release_did(did_number):
    """Release a DID"""
    try:
        from magnus_billing import get_magnus_client
        client = get_magnus_client()
        client.release_did(did_number)
        return jsonify({
            "success": True,
            "message": f"DID {did_number} released"
        }), 200
    except Exception as e:
        logger.error(f"Error releasing DID: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/magnus/trunks', methods=['GET'])
def magnus_list_trunks():
    """List SIP trunks from Magnus"""
    try:
        from magnus_billing import get_magnus_client
        client = get_magnus_client()
        trunks = client.list_sip_trunks()
        return jsonify({
            "success": True,
            "data": [
                {
                    "id": trunk.id,
                    "name": trunk.name,
                    "host": trunk.host,
                    "port": trunk.port,
                    "username": trunk.username,
                    "status": trunk.status.value,
                    "max_channels": trunk.max_channels
                }
                for trunk in trunks
            ]
        }), 200
    except Exception as e:
        logger.error(f"Error listing trunks: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/magnus/trunks', methods=['POST'])
def magnus_create_trunk():
    """Create a SIP trunk in Magnus"""
    try:
        from magnus_billing import get_magnus_client
        client = get_magnus_client()

        data = request.get_json() or {}
        if 'name' not in data:
            return jsonify({"error": "name required"}), 400

        trunk = client.create_sip_trunk(
            name=data['name'],
            config=data.get('config', {})
        )
        return jsonify({
            "success": True,
            "data": {
                "id": trunk.id,
                "name": trunk.name,
                "host": trunk.host,
                "username": trunk.username,
                "status": trunk.status.value
            }
        }), 201
    except Exception as e:
        logger.error(f"Error creating trunk: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/magnus/trunks/<trunk_id>/credentials', methods=['GET'])
def magnus_trunk_credentials(trunk_id):
    """Get SIP credentials for a trunk"""
    try:
        from magnus_billing import get_magnus_client
        client = get_magnus_client()
        credentials = client.get_trunk_credentials(trunk_id)
        return jsonify({
            "success": True,
            "data": credentials
        }), 200
    except Exception as e:
        logger.error(f"Error getting trunk credentials: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/magnus/rates/<destination>', methods=['GET'])
def magnus_get_rate(destination):
    """Get call rate for a destination"""
    try:
        from magnus_billing import get_magnus_client
        client = get_magnus_client()
        rate = client.get_rate_for_destination(destination)
        return jsonify({
            "success": True,
            "data": rate
        }), 200
    except Exception as e:
        logger.error(f"Error getting rate: {e}")
        return jsonify({"error": str(e)}), 500


# ============================================
# Voice Agent Provisioning (Magnus SDK)
# ============================================

@app.route('/api/magnus/provision-agent', methods=['POST'])
def provision_agent():
    """
    Provision a complete SIP/DID setup for a voice agent.

    This creates:
    1. Magnus user (which auto-creates SIP user)
    2. DID (phone number)
    3. DID destination (links DID to SIP)
    4. Configures SIP settings

    Request body:
    {
        "agent_id": "agent-123",
        "agent_name": "Sales Assistant",
        "email": "agent@example.com",
        "phone": "1234567890" (optional),
        "did_number": "17678189000" (optional, auto-generated if not provided)
    }
    """
    try:
        from magnus_sdk import get_magnus_sdk

        data = request.get_json() or {}

        required = ['agent_id', 'agent_name', 'email']
        for field in required:
            if field not in data:
                return jsonify({"error": f"{field} required"}), 400

        sdk = get_magnus_sdk()
        result = sdk.provision_voice_agent(
            agent_id=data['agent_id'],
            agent_name=data['agent_name'],
            email=data['email'],
            phone=data.get('phone', ''),
            did_number=data.get('did_number')
        )

        if result.success:
            return jsonify({
                "success": True,
                "magnus_user_id": result.magnus_user_id,
                "magnus_sip_id": result.magnus_sip_id,
                "magnus_did_id": result.magnus_did_id,
                "did_number": result.did_number,
                "sip_username": result.sip_username,
                "sip_password": result.sip_password,
                "sip_server": result.sip_server,
                "sip_url": f"sip:{result.sip_username}@{result.sip_server}"
            }), 201
        else:
            return jsonify({
                "success": False,
                "error": result.error or "Provisioning failed"
            }), 500

    except Exception as e:
        logger.error(f"Error provisioning agent: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/magnus/deprovision-agent', methods=['POST'])
def deprovision_agent():
    """
    Remove Magnus resources for a voice agent.

    Request body:
    {
        "magnus_user_id": "123" (optional),
        "magnus_did_id": "456" (optional),
        "username": "agentname_17678189000" (optional, used if user_id not provided)
    }
    """
    try:
        from magnus_sdk import get_magnus_sdk

        data = request.get_json() or {}

        sdk = get_magnus_sdk()
        success = sdk.deprovision_voice_agent(
            magnus_user_id=data.get('magnus_user_id'),
            magnus_did_id=data.get('magnus_did_id'),
            username=data.get('username')
        )

        return jsonify({
            "success": success,
            "message": "Agent deprovisioned" if success else "Deprovisioning may have partially failed"
        }), 200

    except Exception as e:
        logger.error(f"Error deprovisioning agent: {e}")
        return jsonify({"error": str(e)}), 500


# ============================================
# Organization-Level Magnus User Management
# ============================================

@app.route('/api/magnus/create-org-user', methods=['POST'])
def create_organization_user():
    """
    Create a Magnus user for an organization (for billing purposes).
    This should be called ONCE per organization, not per agent.

    Request body:
    {
        "org_id": "org-123",
        "org_name": "ACME Corp",
        "email": "billing@acme.com",
        "phone": "1234567890" (optional)
    }

    Returns:
    {
        "success": true,
        "magnus_user_id": "123",
        "magnus_username": "org_acme_123456"
    }
    """
    try:
        from magnus_sdk import get_magnus_sdk

        data = request.get_json() or {}

        required = ['org_id', 'org_name', 'email']
        for field in required:
            if field not in data:
                return jsonify({"error": f"{field} required"}), 400

        sdk = get_magnus_sdk()
        result = sdk.create_organization_user(
            org_id=data['org_id'],
            org_name=data['org_name'],
            email=data['email'],
            phone=data.get('phone', '')
        )

        if result['success']:
            return jsonify({
                "success": True,
                "magnus_user_id": result['magnus_user_id'],
                "magnus_username": result['magnus_username']
            }), 201
        else:
            return jsonify({
                "success": False,
                "error": result.get('error', 'Failed to create organization user')
            }), 500

    except Exception as e:
        logger.error(f"Error creating organization user: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/magnus/provision-sip-did', methods=['POST'])
def provision_sip_and_did():
    """
    Provision a SIP account and DID for a voice agent under an EXISTING Magnus user.
    This is the correct flow: organization has ONE user, each agent gets SIP + DID.

    Request body:
    {
        "magnus_user_id": "123",        // The org's Magnus user ID (REQUIRED)
        "agent_id": "agent-456",
        "agent_name": "Sales Bot",
        "email": "notifications@acme.com",
        "did_number": "17678189000"     // Optional, auto-generated if not provided
    }

    Returns:
    {
        "success": true,
        "magnus_user_id": "123",        // Same as input (org's user)
        "magnus_sip_id": "456",         // NEW SIP account for this agent
        "magnus_did_id": "789",         // NEW DID for this agent
        "did_number": "17678189000",
        "sip_username": "salesbot_9000",
        "sip_password": "generated123",
        "sip_server": "voice00.epic.dm",
        "sip_url": "sip:salesbot_9000@voice00.epic.dm"
    }
    """
    try:
        from magnus_sdk import get_magnus_sdk

        data = request.get_json() or {}

        required = ['magnus_user_id', 'agent_id', 'agent_name', 'email']
        for field in required:
            if field not in data:
                return jsonify({"error": f"{field} required"}), 400

        sdk = get_magnus_sdk()
        result = sdk.provision_sip_and_did(
            magnus_user_id=data['magnus_user_id'],
            agent_id=data['agent_id'],
            agent_name=data['agent_name'],
            email=data['email'],
            did_number=data.get('did_number')
        )

        if result.success:
            return jsonify({
                "success": True,
                "magnus_user_id": result.magnus_user_id,
                "magnus_sip_id": result.magnus_sip_id,
                "magnus_did_id": result.magnus_did_id,
                "did_number": result.did_number,
                "sip_username": result.sip_username,
                "sip_password": result.sip_password,
                "sip_server": result.sip_server,
                "sip_url": f"sip:{result.sip_username}@{result.sip_server}"
            }), 201
        else:
            return jsonify({
                "success": False,
                "error": result.error or "SIP/DID provisioning failed"
            }), 500

    except Exception as e:
        logger.error(f"Error provisioning SIP/DID: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/magnus/deprovision-sip-did', methods=['POST'])
def deprovision_sip_and_did():
    """
    Remove SIP account and DID for a voice agent WITHOUT deleting the org user.
    Use this when removing a single agent under an organization.

    Request body:
    {
        "magnus_sip_id": "456",
        "magnus_did_id": "789"
    }
    """
    try:
        from magnus_sdk import get_magnus_sdk

        data = request.get_json() or {}

        sdk = get_magnus_sdk()
        success = sdk.deprovision_sip_and_did(
            magnus_sip_id=data.get('magnus_sip_id'),
            magnus_did_id=data.get('magnus_did_id')
        )

        return jsonify({
            "success": success,
            "message": "SIP/DID deprovisioned" if success else "Deprovisioning may have partially failed"
        }), 200

    except Exception as e:
        logger.error(f"Error deprovisioning SIP/DID: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/magnus/check-did-usage', methods=['GET'])
def check_did_usage():
    """
    Check how many DIDs in the 9xxx range are currently in use.

    Returns accurate statistics about DID usage in the 17678189xxx range
    by fetching all DIDs from Magnus and filtering locally.

    Query Parameters:
        include_available_list: If 'true', includes list of first 50 available DIDs
        include_used_list: If 'true', includes list of first 50 used DIDs
    """
    try:
        from magnus_sdk import get_magnus_sdk

        sdk = get_magnus_sdk()

        logger.info("Fetching accurate DID usage statistics...")

        # Fetch all DIDs from Magnus (single API call)
        existing_dids = sdk.get_all_dids()
        logger.info(f"Retrieved {len(existing_dids)} total DIDs from Magnus")

        # Get detailed range status using accurate counting
        range_status = sdk.get_did_range_status(existing_dids)

        # Get usage stats for additional details
        usage_stats = sdk.get_did_usage_stats()

        # Build response
        response = {
            "success": True,
            "range": f"{range_status.range_start}-{range_status.range_end}",
            "total_in_range": range_status.total_in_range,
            "used_in_range": range_status.used_in_range,
            "available_in_range": range_status.available_in_range,
            "utilization_percent": range_status.utilization_percent,
            "all_dids_in_magnus": usage_stats["all_dids_count"],
            "status": range_status.status_message,
            "is_exhausted": range_status.is_exhausted,
            "is_nearly_exhausted": range_status.is_nearly_exhausted,
            "warning_threshold_percent": range_status.warning_threshold_percent,
        }

        # Optionally include list of available DIDs
        include_available = request.args.get('include_available_list', '').lower() == 'true'
        if include_available:
            available_dids = sdk.get_available_dids_in_range(existing_dids)
            response["available_dids_sample"] = available_dids[:50]  # First 50
            response["available_dids_count"] = len(available_dids)

        # Optionally include list of used DIDs in range
        include_used = request.args.get('include_used_list', '').lower() == 'true'
        if include_used:
            range_prefix = f"{sdk.DID_PREFIX}9"  # 17678189xxx
            used_in_range = sorted([did for did in existing_dids if did.startswith(range_prefix)])
            response["used_dids_sample"] = used_in_range[:50]  # First 50
            response["used_dids_count"] = len(used_in_range)

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error checking DID usage: {e}")
        import traceback
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


@app.route('/api/magnus/test-did-check/<did>', methods=['GET'])
def test_did_check(did):
    """Test if a specific DID exists in Magnus - shows full API response for debugging."""
    try:
        from magnus_sdk import get_magnus_sdk

        sdk = get_magnus_sdk()

        # Get the ID using normal method
        existing_id = sdk.get_id("did", "did", did)

        # Also get the full record to see what Magnus actually returns
        data = {
            "filter": f'[{{"field":"did","value":"{did}"}}]'
        }
        full_response = sdk._make_request("read", "did", data)

        return jsonify({
            "success": True,
            "did": did,
            "exists": existing_id is not None,
            "existing_id": existing_id,
            "full_magnus_response": full_response,
            "filter_used": data["filter"],
            "message": f"DID {did} {'exists' if existing_id else 'does not exist'} in Magnus"
        }), 200

    except Exception as e:
        logger.error(f"Error checking DID: {e}")
        import traceback
        return jsonify({
            "success": False,
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


@app.route('/api/magnus/generate-did', methods=['GET'])
def generate_did():
    """Generate a random DID number in the configured range."""
    try:
        from magnus_sdk import get_magnus_sdk

        sdk = get_magnus_sdk()
        did = sdk.generate_did()

        return jsonify({
            "success": True,
            "data": {
                "did_number": did
            }
        }), 200

    except Exception as e:
        logger.error(f"Error generating DID: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/magnus/diagnostics', methods=['GET'])
def magnus_diagnostics():
    """
    Comprehensive diagnostic endpoint for Magnus Billing integration.

    Returns detailed information about:
    - Magnus API connectivity and health
    - DID range utilization with accurate counts
    - SIP configuration status
    - Configuration settings

    This endpoint is useful for troubleshooting provisioning issues.
    """
    import time

    diagnostics = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "service": "voice-service",
        "magnus_integration": {},
        "did_usage": {},
        "configuration": {},
        "errors": []
    }

    try:
        from magnus_sdk import get_magnus_sdk, MagnusSDKError

        sdk = get_magnus_sdk()

        # Configuration info (sanitized - no secrets)
        diagnostics["configuration"] = {
            "magnus_url": sdk.public_url,
            "sip_server": sdk.sip_server,
            "did_prefix": sdk.DID_PREFIX,
            "did_range": f"{sdk.DID_PREFIX}9000-{sdk.DID_PREFIX}9999",
            "api_key_configured": bool(sdk.api_key),
            "api_secret_configured": bool(sdk.api_secret),
            "timeout_seconds": sdk.timeout
        }

        # Test Magnus API connectivity
        connectivity_start = time.time()
        try:
            existing_dids = sdk.get_all_dids()
            connectivity_time = round((time.time() - connectivity_start) * 1000, 2)

            diagnostics["magnus_integration"] = {
                "status": "connected",
                "api_response_time_ms": connectivity_time,
                "total_dids_in_magnus": len(existing_dids)
            }
        except MagnusSDKError as e:
            connectivity_time = round((time.time() - connectivity_start) * 1000, 2)
            diagnostics["magnus_integration"] = {
                "status": "error",
                "api_response_time_ms": connectivity_time,
                "error": str(e)
            }
            diagnostics["errors"].append({
                "component": "magnus_api",
                "error": str(e)
            })
            existing_dids = set()

        # DID usage analysis
        if existing_dids or diagnostics["magnus_integration"]["status"] == "connected":
            try:
                range_status = sdk.get_did_range_status(existing_dids)

                # Calculate health score (0-100)
                # 100 = empty, 0 = full
                health_score = max(0, min(100, 100 - range_status.utilization_percent))

                diagnostics["did_usage"] = {
                    "range_start": range_status.range_start,
                    "range_end": range_status.range_end,
                    "total_capacity": range_status.total_in_range,
                    "currently_used": range_status.used_in_range,
                    "currently_available": range_status.available_in_range,
                    "utilization_percent": range_status.utilization_percent,
                    "health_score": round(health_score, 1),
                    "status": "critical" if range_status.is_exhausted else ("warning" if range_status.is_nearly_exhausted else "healthy"),
                    "status_message": range_status.status_message,
                    "is_exhausted": range_status.is_exhausted,
                    "is_nearly_exhausted": range_status.is_nearly_exhausted,
                    "warning_threshold_percent": range_status.warning_threshold_percent
                }

                # Add recommendations based on status
                recommendations = []
                if range_status.is_exhausted:
                    recommendations.append("CRITICAL: DID range is exhausted. No new phone numbers can be provisioned.")
                    recommendations.append("Contact administrator to release unused DIDs or expand the DID range.")
                elif range_status.is_nearly_exhausted:
                    recommendations.append(f"WARNING: Only {range_status.available_in_range} DIDs remaining.")
                    recommendations.append("Consider expanding the DID range or cleaning up unused DIDs.")
                elif range_status.utilization_percent > 75:
                    recommendations.append(f"DID range is at {range_status.utilization_percent}% capacity.")
                    recommendations.append("Monitor usage and plan for expansion if growth continues.")
                else:
                    recommendations.append("DID range is healthy with sufficient capacity.")

                diagnostics["did_usage"]["recommendations"] = recommendations

            except Exception as e:
                diagnostics["errors"].append({
                    "component": "did_analysis",
                    "error": str(e)
                })

        # Overall status
        if diagnostics["errors"]:
            diagnostics["overall_status"] = "degraded"
        elif diagnostics.get("did_usage", {}).get("is_exhausted"):
            diagnostics["overall_status"] = "critical"
        elif diagnostics.get("did_usage", {}).get("is_nearly_exhausted"):
            diagnostics["overall_status"] = "warning"
        else:
            diagnostics["overall_status"] = "healthy"

        return jsonify({
            "success": True,
            "diagnostics": diagnostics
        }), 200

    except Exception as e:
        logger.error(f"Error running diagnostics: {e}")
        import traceback
        diagnostics["errors"].append({
            "component": "diagnostics",
            "error": str(e),
            "traceback": traceback.format_exc()
        })
        diagnostics["overall_status"] = "error"
        return jsonify({
            "success": False,
            "diagnostics": diagnostics
        }), 500


# ============================================
# Main Entry Point
# ============================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'

    logger.info(f"Starting Epic AI Voice Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
