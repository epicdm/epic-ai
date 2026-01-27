"""
Route-to-Agent Runtime Adapter v1 (Guard-Based)

Bridge Telephony → Agent OS safely.

Purpose:
Bridge Asterisk/telephony control to Agent OS via the inbound-guard.
Decides: "For this inbound call, what agent do I run — and what should I do if I can't?"

Flow:
  Asterisk (AGI / HTTP)
      ↓
  voice-service /telephony/route_to_agent
      ↓
  Web API /api/telephony/inbound-guard
      ↓
  If allowed → return Agent Call Plan
  If blocked → return polite fail plan
"""

import os
import logging
import requests
from flask import Blueprint, request, jsonify

logger = logging.getLogger(__name__)

# Create blueprint
route_to_agent_guard_bp = Blueprint('route_to_agent_guard', __name__, url_prefix='/telephony')

# Configuration
WEB_API_BASE = os.getenv("WEB_API_BASE", os.getenv("EPIC_APP_BASE_URL", "http://localhost:3000"))


def check_inbound_guard(did: str):
    """
    Call the web API's inbound-guard endpoint to check if call should be allowed.

    Returns:
        (status_code, response_json)
    """
    url = f"{WEB_API_BASE}/api/telephony/inbound-guard"
    try:
        r = requests.get(url, params={"did": did}, timeout=5)
        return r.status_code, r.json()
    except requests.RequestException as e:
        logger.error(f"Failed to check inbound guard: {e}")
        return 500, {"ok": False, "error": str(e)}


@route_to_agent_guard_bp.route('/route_to_agent', methods=['POST'])
def route_to_agent():
    """
    Main runtime adapter endpoint.

    Request body:
    {
        "did": "+17675551234",
        "caller_id": "18005550000",  // optional
        "call_id": "asterisk_unique_id"  // optional
    }

    Response (success):
    {
        "allowed": true,
        "voiceAgentId": "va_abc123",
        "action": "run_agent",
        "message": null
    }

    Response (failure):
    {
        "allowed": false,
        "voiceAgentId": null,
        "action": "play_message",
        "message": "This service is temporarily unavailable."
    }
    """
    try:
        payload = request.get_json()
        if not payload:
            return jsonify({
                "allowed": False,
                "voiceAgentId": None,
                "action": "play_message",
                "message": "Invalid request format."
            }), 400

        did = payload.get("did")
        caller_id = payload.get("caller_id")
        call_id = payload.get("call_id")

        if not did:
            return jsonify({
                "allowed": False,
                "voiceAgentId": None,
                "action": "play_message",
                "message": "Missing required field: did"
            }), 400

        logger.info(f"[RouteToAgent] DID={did}, CallerID={caller_id}, CallID={call_id}")

        # Check inbound guard
        status, guard = check_inbound_guard(did)

        # If API failed unexpectedly
        if status >= 500 or not guard.get("ok", False):
            logger.error(f"[RouteToAgent] Guard failed: status={status}, response={guard}")
            return jsonify({
                "allowed": False,
                "voiceAgentId": None,
                "action": "play_message",
                "message": "We are experiencing technical difficulties. Please try again later."
            }), 200

        # If inbound guard says NO
        if not guard.get("allowed"):
            reason = guard.get("reason")
            logger.info(f"[RouteToAgent] Guard rejected: reason={reason}")

            if reason == "UNMAPPED":
                msg = "The number you dialed is not in service."
            elif reason == "INACTIVE_MAPPING":
                msg = "This service is temporarily unavailable."
            elif reason == "MISSING_AGENT":
                msg = "This service is not configured. Please contact support."
            elif reason == "INACTIVE_AGENT":
                msg = "This service is temporarily unavailable."
            elif reason == "NOT_LIVE":
                msg = "This service is not yet live."
            elif reason == "BAD_REQUEST":
                msg = "Invalid phone number."
            else:
                msg = "We cannot complete your call at this time."

            return jsonify({
                "allowed": False,
                "voiceAgentId": None,
                "action": "play_message",
                "message": msg
            }), 200

        # Guard passed — route to agent
        voice_agent_id = guard.get("voiceAgentId")
        logger.info(f"[RouteToAgent] Guard allowed: voiceAgentId={voice_agent_id}")

        return jsonify({
            "allowed": True,
            "voiceAgentId": voice_agent_id,
            "action": "run_agent",
            "message": None
        }), 200

    except Exception as e:
        logger.exception(f"[RouteToAgent] Unexpected error: {e}")
        return jsonify({
            "allowed": False,
            "voiceAgentId": None,
            "action": "play_message",
            "message": "An unexpected error occurred. Please try again later."
        }), 500


@route_to_agent_guard_bp.route('/route_to_agent/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "module": "route_to_agent_guard",
        "version": "1.0.0",
        "web_api_base": WEB_API_BASE
    }), 200
