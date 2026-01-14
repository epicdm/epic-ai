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
            "magnus": "/api/magnus/*",
            "test": "/api/test/*"
        },
        "diagnostic_endpoints": {
            "magnus_diagnostics": "/api/magnus/diagnostics",
            "did_usage": "/api/magnus/check-did-usage",
            "did_check": "/api/magnus/test-did-check/<did>",
            "magnus_health": "/api/magnus/health"
        },
        "test_endpoints": {
            "setup_status": "GET /api/test/setup-status - Check test prerequisites",
            "outbound_call": "POST /api/test/outbound-call - Make test outbound call (requires: to_number)",
            "list_calls": "GET /api/test/calls - List active test calls",
            "get_call": "GET /api/test/calls/<call_id> - Get call status",
            "end_call": "DELETE /api/test/calls/<call_id> - End a test call"
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


@app.route('/api/telephony/trunks/inbound/<trunk_id>', methods=['PATCH'])
def update_inbound_trunk(trunk_id):
    """Update an inbound SIP trunk's allowed_addresses"""
    import asyncio
    from livekit_telephony import telephony_manager

    try:
        data = request.get_json() or {}
        allowed_addresses = data.get('allowed_addresses')
        name = data.get('name')

        result = asyncio.run(telephony_manager.update_inbound_trunk(
            trunk_id=trunk_id,
            allowed_addresses=allowed_addresses,
            name=name
        ))
        return jsonify(result), 200 if result['success'] else 500
    except Exception as e:
        logger.error(f"Error updating inbound trunk: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/telephony/trunks/inbound/fix-allowed-addresses', methods=['POST'])
def fix_all_inbound_trunks():
    """Fix all inbound trunks by adding Magnus SIP server IP to allowed_addresses"""
    import asyncio
    from livekit_telephony import telephony_manager

    try:
        # Get Magnus SIP IP from environment or use default
        magnus_sip_ip = os.getenv("MAGNUS_SIP_IP", "157.245.83.64")

        # List all inbound trunks
        list_result = asyncio.run(telephony_manager.list_inbound_trunks())
        if not list_result['success']:
            return jsonify({"error": "Failed to list trunks", "details": list_result}), 500

        trunks = list_result.get('trunks', [])
        results = []

        for trunk in trunks:
            trunk_id = trunk['trunk_id']
            # Update each trunk with the Magnus SIP IP
            update_result = asyncio.run(telephony_manager.update_inbound_trunk(
                trunk_id=trunk_id,
                allowed_addresses=[magnus_sip_ip]
            ))
            results.append({
                'trunk_id': trunk_id,
                'name': trunk.get('name'),
                'success': update_result['success'],
                'error': update_result.get('error'),
                'allowed_addresses': update_result.get('allowed_addresses', [])
            })

        success_count = sum(1 for r in results if r['success'])
        return jsonify({
            "success": True,
            "message": f"Updated {success_count}/{len(trunks)} trunks with allowed_addresses=[{magnus_sip_ip}]",
            "magnus_sip_ip": magnus_sip_ip,
            "results": results
        }), 200

    except Exception as e:
        logger.error(f"Error fixing inbound trunks: {e}")
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
            organization_id=data.get('organization_id'),
            agent_id=data.get('agent_id')  # Pass agent_id for per-agent config
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


@app.route('/api/telephony/dispatch-rules/migrate', methods=['POST'])
def migrate_dispatch_rules():
    """
    Migrate dispatch rules to use the correct agent_name.

    This fixes rules that were created with the voice agent's display name
    instead of the LiveKit worker's registered agent name (epic-voice-agent).
    """
    import asyncio
    from livekit_telephony import telephony_manager

    try:
        data = request.get_json() or {}
        target_agent_name = data.get('target_agent_name', 'epic-voice-agent')

        logger.info(f"Starting dispatch rule migration to agent_name: {target_agent_name}")
        result = asyncio.run(telephony_manager.migrate_dispatch_rules(target_agent_name))

        if result['success']:
            logger.info(f"Migration complete: {result['migrated']} migrated, {result['skipped']} skipped")
            if result['errors']:
                logger.warning(f"Migration errors: {result['errors']}")

        return jsonify(result), 200 if result['success'] else 500
    except Exception as e:
        logger.error(f"Error migrating dispatch rules: {e}")
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


@app.route('/api/magnus/debug-create-user', methods=['POST'])
def debug_create_user():
    """
    Debug endpoint to show what data would be sent to Magnus create_user.
    Does NOT actually call Magnus - just shows the prepared data.
    """
    try:
        from magnus_sdk import get_magnus_sdk
        import random

        data = request.get_json() or {}
        sdk = get_magnus_sdk()

        # Simulate what create_user would prepare
        username = data.get('username', 'test_user')
        email = data.get('email', 'test@example.com')

        # Get the provider ID like create_user does
        provider_id = sdk.get_default_provider_id()
        logger.info(f"Debug: provider_id = {provider_id}, type = {type(provider_id)}")

        callingcard_pin = str(random.randint(10000000, 99999999))

        prepared_data = {
            "id": "0",
            "username": username,
            "password": "test_password",
            "active": "1",
            "firstname": username,
            "lastname": "Agent",
            "email": email,
            "typepaid": "0",
            "prefix_local": sdk.DEFAULT_PREFIX_LOCAL,
            "id_group": sdk.DEFAULT_ID_GROUP,
            "id_plan": sdk.DEFAULT_ID_PLAN,
            "description": "Debug test",
            "phone": "",
            "mobile": "",
            "id_offer": sdk.DEFAULT_ID_OFFER,
            "callingcard_pin": callingcard_pin,
            "id_provider": provider_id,
            "transport": "udp",
        }

        return jsonify({
            "success": True,
            "debug_info": {
                "provider_id_value": provider_id,
                "provider_id_type": str(type(provider_id)),
                "provider_id_is_empty": provider_id == "" or provider_id is None,
                "provider_id_repr": repr(provider_id),
            },
            "prepared_data": prepared_data,
            "note": "This data was NOT sent to Magnus - debug only"
        }), 200

    except Exception as e:
        logger.error(f"Error in debug-create-user: {e}")
        import traceback
        return jsonify({
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


@app.route('/api/magnus/test-user-create', methods=['POST'])
def test_user_create():
    """
    Test endpoint that actually calls Magnus API to create a user.
    Tests both WITH and WITHOUT id_provider to identify the issue.

    WARNING: This creates actual records in Magnus. Use unique test usernames.
    """
    try:
        from magnus_sdk import get_magnus_sdk, MagnusSDKError
        import random
        import time

        data = request.get_json() or {}
        sdk = get_magnus_sdk()

        # Generate unique test username
        timestamp = int(time.time())
        username = data.get('username', f'test_{timestamp}')
        email = data.get('email', f'test_{timestamp}@test.com')
        include_id_provider = data.get('include_id_provider', False)

        provider_id = sdk.get_default_provider_id()
        callingcard_pin = str(random.randint(10000000, 99999999))

        # Base user data (without SIP fields)
        user_data = {
            "id": "0",
            "username": username,
            "password": "TestPass123!",
            "active": "1",
            "firstname": "Test",
            "lastname": "User",
            "email": email,
            "typepaid": "0",
            "prefix_local": sdk.DEFAULT_PREFIX_LOCAL,
            "id_group": sdk.DEFAULT_ID_GROUP,
            "id_plan": sdk.DEFAULT_ID_PLAN,
            "description": "API Test User",
            "phone": "",
            "mobile": "",
            "id_offer": sdk.DEFAULT_ID_OFFER,
            "callingcard_pin": callingcard_pin,
        }

        # Optionally add id_provider for comparison testing
        if include_id_provider:
            user_data["id_provider"] = provider_id
            user_data["transport"] = "udp"

        logger.info(f"TEST: Creating user with data: {user_data}")
        logger.info(f"TEST: include_id_provider={include_id_provider}, provider_id={provider_id}")

        # Actually call Magnus API
        try:
            result = sdk._make_request("save", "user", user_data)
            return jsonify({
                "success": True,
                "test_config": {
                    "include_id_provider": include_id_provider,
                    "provider_id": provider_id,
                },
                "user_data_sent": user_data,
                "magnus_response": result
            }), 200
        except MagnusSDKError as e:
            return jsonify({
                "success": False,
                "test_config": {
                    "include_id_provider": include_id_provider,
                    "provider_id": provider_id,
                },
                "user_data_sent": user_data,
                "error": e.message,
                "error_response": e.response
            }), 400

    except Exception as e:
        logger.error(f"Error in test-user-create: {e}")
        import traceback
        return jsonify({
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


@app.route('/api/magnus/test-sip-create', methods=['POST'])
def test_sip_create():
    """
    Test endpoint that creates a SIP account under an existing user.
    This tests the SIP creation step to identify id_provider issues.

    Request body:
    {
        "user_id": "1271"  // Magnus user ID to create SIP under
    }
    """
    try:
        from magnus_sdk import get_magnus_sdk, MagnusSDKError
        import random
        import time

        data = request.get_json() or {}
        sdk = get_magnus_sdk()

        # Get required user_id
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({"error": "user_id required - use ID from test-user-create"}), 400

        timestamp = int(time.time())
        sip_username = f'sip_test_{timestamp}'

        # Get provider ID
        provider_id = sdk.get_default_provider_id()
        logger.info(f"TEST SIP: provider_id={provider_id}, type={type(provider_id)}, repr={repr(provider_id)}")

        # Create SIP account data (matching _provision_with_did)
        sip_data = {
            "id": "0",           # 0 = create new
            "id_user": user_id,  # Foreign key to Magnus user table
            "id_provider": provider_id,  # Use valid provider ID from Magnus
            "user": sip_username,
            "name": sip_username,
            "accountcode": sip_username,
            "secret": "TestPass123!",
            "callerid": sip_username,
            "host": "dynamic",
            "transport": "udp",  # Required field - max 3 chars
            "allow": "ulaw,alaw,g729,gsm",
            "dtmfmode": "rfc2833",
            "nat": "force_rport,comedia",
            "qualify": "yes",
            "context": "billing",
            "insecure": "invite,port",
            "status": "1"
        }

        logger.info(f"TEST SIP: Creating SIP with data: {sip_data}")

        try:
            result = sdk.create("sip", sip_data)
            return jsonify({
                "success": True,
                "provider_id_used": provider_id,
                "sip_data_sent": sip_data,
                "magnus_response": result
            }), 200
        except MagnusSDKError as e:
            return jsonify({
                "success": False,
                "provider_id_used": provider_id,
                "sip_data_sent": sip_data,
                "error": e.message,
                "error_response": e.response
            }), 400

    except Exception as e:
        logger.error(f"Error in test-sip-create: {e}")
        import traceback
        return jsonify({
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


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

        # Provider information (important for SIP creation)
        try:
            providers = sdk.list_providers()
            trunks = sdk.list_trunks()
            default_provider_id = sdk.get_default_provider_id()

            diagnostics["providers"] = {
                "count": len(providers),
                "providers": [
                    {
                        "id": p.get("id"),
                        "name": p.get("provider_name", p.get("name", "unknown")),
                        "status": p.get("status"),
                    }
                    for p in providers[:10]  # Limit to first 10
                ],
                "default_provider_id": default_provider_id,
            }
            diagnostics["trunks"] = {
                "count": len(trunks),
                "trunks": [
                    {
                        "id": t.get("id"),
                        "trunkcode": t.get("trunkcode"),
                        "host": t.get("host"),
                        "status": t.get("status"),
                    }
                    for t in trunks[:10]  # Limit to first 10
                ],
            }
        except Exception as e:
            diagnostics["errors"].append({
                "component": "provider_analysis",
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
# Magnus Setup Endpoints
# ============================================

@app.route('/api/magnus/setup', methods=['POST'])
def magnus_setup():
    """
    Initial Magnus setup - creates provider and LiveKit trunk.

    This must be run ONCE before DIDs can be provisioned.
    Idempotent: safe to call multiple times.

    Returns:
        {
            "success": true/false,
            "provider": { "id": "1", "name": "EpicAI_Internal" },
            "trunk": { "id": "1", "code": "livekit_sip" },
            "message": "Setup complete"
        }
    """
    try:
        from magnus_sdk import get_magnus_sdk

        sdk = get_magnus_sdk()
        result = {
            "success": False,
            "provider": None,
            "trunk": None,
            "steps": []
        }

        # Step 1: Check existing providers
        providers = sdk.list_providers()
        result["steps"].append({
            "step": "list_providers",
            "count": len(providers),
            "providers": [{"id": p.get("id"), "name": p.get("provider_name")} for p in providers]
        })

        if providers:
            provider_id = str(providers[0].get("id"))
            result["provider"] = {"id": provider_id, "name": providers[0].get("provider_name"), "existing": True}
        else:
            # Create default provider
            provider_data = {
                "id": "0",
                "provider_name": "EpicAI_Internal",
                "description": "Default provider for internal SIP routing",
                "credit": "1000",
                "credit_control": "0",
                "status": "1"
            }
            create_result = sdk._make_request("save", "provider", provider_data)
            result["steps"].append({"step": "create_provider", "result": create_result})

            if create_result.get("success"):
                rows = create_result.get("rows", [])
                provider_id = str(rows[0].get("id")) if rows else None
                result["provider"] = {"id": provider_id, "name": "EpicAI_Internal", "existing": False}
            else:
                result["error"] = f"Failed to create provider: {create_result}"
                return jsonify(result), 500

        # Step 2: Check existing trunks
        trunks = sdk.list_trunks()
        result["steps"].append({
            "step": "list_trunks",
            "count": len(trunks),
            "trunks": [{"id": t.get("id"), "code": t.get("trunkcode"), "host": t.get("host")} for t in trunks]
        })

        livekit_trunk = None
        for t in trunks:
            if t.get("trunkcode") == "livekit_sip":
                livekit_trunk = t
                break

        if livekit_trunk:
            result["trunk"] = {"id": str(livekit_trunk.get("id")), "code": "livekit_sip", "existing": True}
        else:
            # Create LiveKit trunk with all required fields matching existing trunks
            livekit_sip_domain = os.environ.get("LIVEKIT_SIP_DOMAIN", "3m4yki5jezn.sip.livekit.cloud")
            trunk_data = {
                "id": "0",
                "id_provider": provider_id,
                "trunkcode": "livekit_sip",
                "host": livekit_sip_domain,
                "fromuser": "",
                "fromdomain": livekit_sip_domain,
                "user": "",  # Required field
                "secret": "",
                "providertech": "sip",
                "providerip": "livekit_sip",  # Required - usually matches trunkcode
                "status": "1",
                "context": "billing",
                "qualify": "yes",
                "type": "peer",
                "insecure": "port,invite",
                "nat": "force_rport,comedia",
                "dtmfmode": "RFC2833",
                "allow": "opus,alaw,ulaw",
                "disallow": "all",
                "directmedia": "no",
                "port": "5060",
                "transport": "",
                "encryption": "",
                "register": "0",
                "register_string": "",
                "sendrpid": "no",
                "language": "",
                "sip_config": "",
                "trunkprefix": "",
                "removeprefix": "",
                "addparameter": "",
                "allow_error": "0",
                "short_time_call": "0",
                "cnl": "0",
                "cid_add": "",
                "cid_remove": "",
                "block_cid": "",
                "link_sms": "",
                "sms_res": "",
                "failover_trunk": "",
                "maxuse": "-1",
                "if_max_use": ""
            }
            create_result = sdk._make_request("save", "trunk", trunk_data)
            result["steps"].append({"step": "create_trunk", "result": create_result})

            if create_result.get("success"):
                rows = create_result.get("rows", [])
                trunk_id = str(rows[0].get("id")) if rows else None
                result["trunk"] = {"id": trunk_id, "code": "livekit_sip", "existing": False}
            else:
                result["error"] = f"Failed to create trunk: {create_result}"
                return jsonify(result), 500

        result["success"] = True
        result["message"] = "Magnus setup complete"
        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error in Magnus setup: {e}")
        import traceback
        return jsonify({
            "error": str(e),
            "traceback": traceback.format_exc()
        }), 500


# ============================================
# Outbound Test Endpoints
# ============================================

# In-memory test call registry
_test_calls: dict = {}

@app.route('/api/test/setup-status', methods=['GET'])
def test_setup_status():
    """
    Check if test prerequisites are ready.
    Returns status of outbound trunks, DIDs, and agents.
    """
    import asyncio
    from livekit_telephony import telephony_manager

    try:
        status = {
            "ready": False,
            "outbound_trunks": [],
            "available_dids": [],
            "agents": [],
            "issues": []
        }

        # Check outbound trunks
        trunks_result = asyncio.run(telephony_manager.list_outbound_trunks())
        if trunks_result.get("success"):
            status["outbound_trunks"] = trunks_result.get("trunks", [])
        else:
            status["issues"].append(f"Failed to get outbound trunks: {trunks_result.get('error')}")

        # Check available DIDs from Magnus
        try:
            from magnus_sdk import MagnusSDK
            magnus = MagnusSDK()
            dids = magnus.get_all_dids()  # Returns a set of DID strings
            # Convert set to list and limit to 10 for display
            did_list = list(dids)[:10]
            status["available_dids"] = [{"did": d} for d in did_list]
            status["total_dids"] = len(dids)
        except Exception as e:
            status["issues"].append(f"Failed to get DIDs from Magnus: {str(e)}")

        # Check agents
        try:
            agents = agent_creator.list_agents()
            status["agents"] = agents[:10]  # Limit to 10
        except Exception as e:
            status["issues"].append(f"Failed to list agents: {str(e)}")

        # Determine if ready
        if status["outbound_trunks"] and status["available_dids"]:
            status["ready"] = True
        else:
            if not status["outbound_trunks"]:
                status["issues"].append("No outbound trunks configured - create one first")
            if not status["available_dids"]:
                status["issues"].append("No DIDs available - provision DIDs first")

        return jsonify({
            "success": True,
            "status": status
        }), 200

    except Exception as e:
        logger.error(f"Error checking test setup: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/test/outbound-call', methods=['POST'])
def test_outbound_call():
    """
    Simplified outbound test call endpoint.
    Auto-selects trunk and DID if not provided.

    Required:
        - to_number: Destination phone number (E.164 format, e.g. +17671234567)

    Optional:
        - from_number: Caller ID (auto-selected from available DIDs if not provided)
        - trunk_id: LiveKit outbound trunk ID (auto-selected if not provided)
        - agent_name: Agent to handle the call (default: epic-voice-agent)
        - agent_config_id: Agent configuration ID
        - organization_id: Organization ID for tracking
    """
    import asyncio
    from livekit_telephony import telephony_manager
    from datetime import datetime

    try:
        data = request.get_json() or {}

        # Validate to_number
        to_number = data.get('to_number')
        if not to_number:
            return jsonify({
                "success": False,
                "error": "to_number is required (E.164 format, e.g. +17671234567)"
            }), 400

        # Normalize to_number to E.164
        if not to_number.startswith('+'):
            to_number = '+' + to_number

        # Auto-select trunk if not provided
        trunk_id = data.get('trunk_id')
        if not trunk_id:
            trunks_result = asyncio.run(telephony_manager.list_outbound_trunks())
            if trunks_result.get("success") and trunks_result.get("trunks"):
                trunk_id = trunks_result["trunks"][0]["trunk_id"]
                logger.info(f"Auto-selected outbound trunk: {trunk_id}")
            else:
                return jsonify({
                    "success": False,
                    "error": "No outbound trunks available. Create one first via /api/telephony/trunks/outbound"
                }), 400

        # Auto-select DID/from_number if not provided
        from_number = data.get('from_number')
        if not from_number:
            try:
                from magnus_sdk import MagnusSDK
                magnus = MagnusSDK()
                dids = magnus.get_all_dids()
                if dids:
                    from_number = '+' + dids[0].did if not dids[0].did.startswith('+') else dids[0].did
                    logger.info(f"Auto-selected DID for caller ID: {from_number}")
                else:
                    return jsonify({
                        "success": False,
                        "error": "No DIDs available for caller ID. Provision DIDs first."
                    }), 400
            except Exception as e:
                return jsonify({
                    "success": False,
                    "error": f"Failed to get DIDs: {str(e)}"
                }), 500

        # Normalize from_number to E.164
        if not from_number.startswith('+'):
            from_number = '+' + from_number

        # Get agent name (default to epic-voice-agent - our deployed agent)
        agent_name = data.get('agent_name', 'epic-voice-agent')

        # Make the outbound call
        result = asyncio.run(telephony_manager.create_outbound_call(
            from_number=from_number,
            to_number=to_number,
            trunk_id=trunk_id,
            agent_name=agent_name,
            agent_config_id=data.get('agent_config_id'),
            organization_id=data.get('organization_id')
        ))

        if result.get("success"):
            # Track the call
            call_id = result.get("call_id")
            _test_calls[call_id] = {
                "call_id": call_id,
                "room_name": result.get("room_name"),
                "participant_id": result.get("participant_id"),
                "from_number": from_number,
                "to_number": to_number,
                "trunk_id": trunk_id,
                "agent_name": agent_name,
                "status": "initiated",
                "started_at": datetime.utcnow().isoformat(),
                "ended_at": None
            }

            return jsonify({
                "success": True,
                "call_id": call_id,
                "room_name": result.get("room_name"),
                "from_number": from_number,
                "to_number": to_number,
                "agent_name": agent_name,
                "message": f"Outbound call initiated to {to_number}"
            }), 201
        else:
            return jsonify({
                "success": False,
                "error": result.get("error", "Unknown error creating outbound call")
            }), 500

    except Exception as e:
        logger.error(f"Error making test outbound call: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/test/calls', methods=['GET'])
def list_test_calls():
    """List all tracked test calls"""
    try:
        calls = list(_test_calls.values())
        return jsonify({
            "success": True,
            "calls": calls,
            "total": len(calls)
        }), 200
    except Exception as e:
        logger.error(f"Error listing test calls: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/test/calls/<call_id>', methods=['GET'])
def get_test_call(call_id):
    """Get status of a specific test call"""
    try:
        if call_id not in _test_calls:
            return jsonify({
                "success": False,
                "error": f"Call {call_id} not found"
            }), 404

        call = _test_calls[call_id]

        # Try to get room info from LiveKit
        try:
            from livekit_manager import livekit_manager_instance
            if hasattr(livekit_manager_instance, 'get_room_info'):
                room_info = livekit_manager_instance.get_room_info(call["room_name"])
                if room_info:
                    call["room_info"] = room_info
        except Exception:
            pass  # Room info is optional

        return jsonify({
            "success": True,
            "call": call
        }), 200

    except Exception as e:
        logger.error(f"Error getting test call {call_id}: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route('/api/test/calls/<call_id>', methods=['DELETE'])
def end_test_call(call_id):
    """End/cleanup a test call"""
    import asyncio
    from datetime import datetime

    try:
        if call_id not in _test_calls:
            return jsonify({
                "success": False,
                "error": f"Call {call_id} not found"
            }), 404

        call = _test_calls[call_id]
        room_name = call.get("room_name")

        # Try to delete the room to end the call
        if room_name:
            try:
                from livekit import api
                lkapi = api.LiveKitAPI()
                asyncio.run(lkapi.room.delete_room(api.DeleteRoomRequest(room=room_name)))
                asyncio.run(lkapi.aclose())
            except Exception as e:
                logger.warning(f"Could not delete room {room_name}: {e}")

        # Update call status
        call["status"] = "ended"
        call["ended_at"] = datetime.utcnow().isoformat()

        return jsonify({
            "success": True,
            "message": f"Call {call_id} ended",
            "call": call
        }), 200

    except Exception as e:
        logger.error(f"Error ending test call {call_id}: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# ============================================
# Main Entry Point
# ============================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'

    logger.info(f"Starting Epic AI Voice Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
