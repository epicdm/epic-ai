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
# Main Entry Point
# ============================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'

    logger.info(f"Starting Epic AI Voice Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
