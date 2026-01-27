"""
Route-to-Agent Routes - Flask Blueprint

Provides HTTP endpoints for Asterisk integration:
- POST /telephony/route_to_agent - Initial call routing
- POST /telephony/continue - Handle DTMF/recording continuation

Uses the RouteToAgentAdapter for business logic.
"""

import logging
from flask import Blueprint, request, jsonify
from typing import Optional

# Import the adapter
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from route_to_agent_adapter import RouteToAgentAdapter

logger = logging.getLogger(__name__)

# Create blueprint
route_to_agent_bp = Blueprint('route_to_agent', __name__, url_prefix='/telephony')

# Initialize adapter (singleton for this process)
adapter = RouteToAgentAdapter()


@route_to_agent_bp.route('/route_to_agent', methods=['POST'])
def route_to_agent():
    """
    Initial call routing endpoint.

    Request body:
    {
        "did": "+17675551234",
        "from": "+14155559876",  // optional
        "callSid": "ast-12345"
    }

    Response (allowed):
    {
        "ok": true,
        "action": "speak_and_collect_dtmf",
        "tts": "Hi! Thanks for calling...",
        "dtmf": { "max_digits": 1, "valid_digits": ["1","2","9"] },
        "voiceAgentId": "va_123",
        "request_id": "rta_..."
    }

    Response (blocked):
    {
        "ok": false,
        "action": "reject",
        "tts": "Sorry, this line is not available right now.",
        "blocked": { "reason_code": "AGENT_NOT_LIVE" },
        "request_id": "rta_..."
    }
    """
    try:
        body = request.get_json()
        if not body:
            return jsonify({
                "ok": False,
                "error": {"code": "INVALID_REQUEST", "message": "Missing request body"}
            }), 400

        did = body.get("did")
        from_number = body.get("from") or body.get("from_number")
        call_sid = body.get("callSid")

        if not did:
            return jsonify({
                "ok": False,
                "error": {"code": "DID_MISSING", "message": "Field 'did' is required"}
            }), 400

        if not call_sid:
            return jsonify({
                "ok": False,
                "error": {"code": "CALL_SID_MISSING", "message": "Field 'callSid' is required"}
            }), 400

        # Call adapter
        result = adapter.route_to_agent(did, from_number, call_sid)

        # Return 200 even for rejected calls (Asterisk expects 200 + action:"reject")
        status_code = 200 if result.get("ok") else 200
        return jsonify(result), status_code

    except Exception as e:
        logger.exception("Error in route_to_agent endpoint")
        return jsonify({
            "ok": False,
            "action": "reject",
            "tts": "Sorry, an error occurred. Please try again later.",
            "error": {"code": "INTERNAL_ERROR", "message": str(e)}
        }), 500


@route_to_agent_bp.route('/continue', methods=['POST'])
def continue_call():
    """
    Continue call after DTMF input or recording completion.

    Request body:
    {
        "callSid": "ast-12345",
        "digit": "1",  // optional (for DTMF)
        "recordingUrl": "http://..."  // optional (for recording)
    }

    Response:
    {
        "ok": true,
        "action": "record_message",
        "tts": "Please leave your message...",
        "record": { "format": "wav", "max_seconds": 120 },
        "request_id": "cont_..."
    }
    """
    try:
        body = request.get_json()
        if not body:
            return jsonify({
                "ok": False,
                "error": {"code": "INVALID_REQUEST", "message": "Missing request body"}
            }), 400

        call_sid = body.get("callSid")
        digit = body.get("digit")
        recording_url = body.get("recordingUrl")

        if not call_sid:
            return jsonify({
                "ok": False,
                "error": {"code": "CALL_SID_MISSING", "message": "Field 'callSid' is required"}
            }), 400

        # Call adapter
        result = adapter.continue_call(call_sid, digit=digit, recording_url=recording_url)

        status_code = 200 if result.get("ok") else 200
        return jsonify(result), status_code

    except Exception as e:
        logger.exception("Error in continue endpoint")
        return jsonify({
            "ok": False,
            "action": "reject",
            "tts": "Sorry, an error occurred.",
            "error": {"code": "INTERNAL_ERROR", "message": str(e)}
        }), 500


# Health check for this module
@route_to_agent_bp.route('/route_to_agent/health', methods=['GET'])
def health():
    """Health check endpoint for route-to-agent adapter"""
    return jsonify({
        "status": "healthy",
        "module": "route_to_agent_adapter",
        "version": "1.0.0"
    }), 200
