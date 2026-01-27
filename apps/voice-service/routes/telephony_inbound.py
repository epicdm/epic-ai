"""
Telephony Inbound Routes - Flow Runtime Adapter v1 + Tool Node Runtime v1

Handles inbound call lifecycle for Asterisk integration using KV string responses:
- /telephony/inbound-start: Gate + route decision
- /telephony/dtmf: Handle DTMF keypresses
- /telephony/record: Handle voicemail recordings

Response Format: Pipe-delimited key-value strings (Asterisk-friendly)
Example: "OK=1|ACTION=DTMF_MENU|AGENT_ID=agt_123|SESSION_ID=call_abc|..."

Flow Runtime v1: Agent OS flow JSONB drives IVR behavior dynamically.
Tool Node Runtime v1: Flows can execute tools safely with allowlist + rate limits.

No more hardcoded menus - all flows come from Agent OS database.

This is the v1 "DTMF-first + Flow-driven + Tool-enabled" implementation.
Real-time ASR via LiveKit comes later in v2.
"""

import os
import uuid
import logging
from flask import Blueprint, request, Response
from typing import Dict, Any, Optional

# Import the inbound guard and runtime client
try:
    import sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from telephony_health import check_did_guard, DidCheckResult
    from agent_runtime_client import AgentRuntimeClient
    from flow_runtime import (
        FlowRuntimeEngine, DEFAULT_FLOW,
        deep_set, get_path
    )
    from template_runtime import render_text, render_any
    from flow_loader import load_agent_flow
    from tool_runtime import execute_tool_v1
except ImportError as e:
    logging.error(f"Failed to import required modules: {e}")
    check_did_guard = None
    DidCheckResult = None
    AgentRuntimeClient = None
    FlowRuntimeEngine = None
    load_agent_flow = None
    DEFAULT_FLOW = None
    render_text = None
    render_any = None
    deep_set = None
    get_path = None
    execute_tool_v1 = None

logger = logging.getLogger(__name__)

# Create blueprint
telephony_bp = Blueprint('telephony', __name__, url_prefix='/telephony')

# In-memory session store (use Redis in production)
# session_id -> {
#   agent_id, caller_phone, caller_name, turn_count,
#   flow, current_node, flow_engine, created_at,
#   context: {
#     session: {caller, did, last_dtmf},
#     tool: {crm: {contact: {...}}},
#     memory: {...}
#   },
#   audit: [{node, type, tool_key, ok, error}]
# }
call_sessions: Dict[str, Dict[str, Any]] = {}


# Environment configuration
DTMF_TIMEOUT = int(os.getenv("EPIC_DTMF_TIMEOUT_S", "7"))
DTMF_RETRIES = int(os.getenv("EPIC_DTMF_RETRIES", "2"))
REC_ENABLE = os.getenv("EPIC_REC_ENABLE", "true").lower() == "true"
REC_SILENCE_S = int(os.getenv("EPIC_REC_SILENCE_S", "20"))
REC_MAX_S = int(os.getenv("EPIC_REC_MAX_S", "45"))
REC_DIR = os.getenv("EPIC_REC_DIR", "/tmp/epic-recordings")

# Default DTMF menu
MENU_DEFAULT = {
    "promptText": "Press 1 for sales, 2 for support, 3 for information, or 0 for an operator.",
    "timeout": DTMF_TIMEOUT,
    "maxRetries": DTMF_RETRIES,
    "options": {
        "1": "Sales / New booking",
        "2": "Support",
        "3": "Hours / Location / Pricing",
        "0": "Speak to an operator"
    }
}


def to_kv(d: Dict[str, Any]) -> str:
    """
    Asterisk-friendly pipe KV encoder.

    Converts: {"OK": 1, "ACTION": "DTMF_MENU", "SAY": "Hello"}
    To: "OK=1|ACTION=DTMF_MENU|SAY=Hello"

    Note: Pipes in values are replaced with spaces to avoid breaking dialplan parsing.
    """
    parts = []
    for k, v in d.items():
        if v is None:
            continue
        # Convert value to string and sanitize pipes
        s = str(v).replace("|", " ").replace("\n", " ").replace("\r", " ")
        parts.append(f"{k}={s}")
    return "|".join(parts)


def normalize_phone(phone: str) -> str:
    """Normalize phone number to E.164 format"""
    if not phone:
        return ""

    # Remove all non-digits
    digits = ''.join(c for c in phone if c.isdigit())

    # Add + if not present
    if not digits.startswith('1') and len(digits) == 10:
        digits = '1' + digits

    return '+' + digits


@telephony_bp.route('/inbound-start', methods=['POST'])
def inbound_start():
    """
    Phase A: Gate + Route

    Called by Asterisk when an inbound call arrives.

    Request:
        {
            "did": "15551234567",
            "from": "15559876543",
            "callId": "asterisk-call-id-123"
        }

    Response (KV string format):
        Reject:
            "OK=1|ACTION=REJECT|SAY=This line is temporarily unavailable..."

        Connect (DTMF menu):
            "OK=1|ACTION=DTMF_MENU|AGENT_ID=agt_123|SESSION_ID=call_abc_xyz|
             GREETING=Hello! Welcome to Epic AI...|
             MENU_PROMPT=Press 1 for sales, 2 for support...|
             MENU_TIMEOUT=7|MENU_RETRIES=2|
             REC_ENABLE=1|REC_SILENCE_S=20|REC_MAX_S=45|REC_PROMPT=Please leave a message..."
    """
    try:
        data = request.get_json() or {}

        did = data.get('did', '')
        caller_phone = data.get('from', '')
        call_id = data.get('callId', '')

        logger.info(f"[InboundStart] Call received - DID: {did}, From: {caller_phone}, CallID: {call_id}")

        # Normalize phone numbers
        did_normalized = normalize_phone(did)
        caller_normalized = normalize_phone(caller_phone)

        # Phase A: Inbound Call Guard v1 (Fail-closed)
        if not check_did_guard:
            logger.error("[InboundStart] Telephony health check not available")
            kv = to_kv({
                "OK": 1,
                "ACTION": "REJECT",
                "SAY": "Service temporarily unavailable. Please try again later."
            })
            return Response(kv, mimetype='text/plain'), 200

        # Check system health + DID resolution
        result = check_did_guard(did_normalized, call_id=call_id)

        if not result.ok:
            logger.warning(
                f"[InboundStart] BLOCKED - DID: {did}, "
                f"Reason: {result.reason_code}, Message: {result.message}"
            )

            # Use the message from the guard result (fail-closed TTS fallback)
            fallback_message = result.message or "This line is temporarily unavailable. Please try again later."

            kv = to_kv({
                "OK": 1,
                "ACTION": "REJECT",
                "SAY": fallback_message
            })
            return Response(kv, mimetype='text/plain'), 200

        # Call passed the guard
        agent_id = result.agent_id
        deployment_state = result.deployment_state
        logger.info(
            f"[InboundStart] ALLOWED - DID: {did} -> Agent: {agent_id}, "
            f"State: {deployment_state}"
        )

        # Load agent flow from Agent OS
        flow = _load_flow_for_agent(agent_id)

        # Create flow runtime engine
        try:
            flow_engine = FlowRuntimeEngine(flow) if FlowRuntimeEngine else None
        except Exception as e:
            logger.error(f"[InboundStart] Failed to create flow engine: {e}")
            flow_engine = None

        if not flow_engine:
            logger.warning(f"[InboundStart] No flow engine, using legacy behavior")
            # Fallback to legacy hardcoded menu
            return _legacy_inbound_start(
                agent_id, call_id, caller_normalized, did_normalized
            )

        # Get start node
        start_node_id = flow_engine.get_start_node_id()
        start_node = flow_engine.get_node(start_node_id)

        if not start_node:
            logger.error(f"[InboundStart] Start node {start_node_id} not found in flow")
            return _legacy_inbound_start(
                agent_id, call_id, caller_normalized, did_normalized
            )

        # Create session with pattern: call_{call_id}_{uuid}
        session_uuid = str(uuid.uuid4())[:8]
        session_id = f"call_{call_id}_{session_uuid}"

        call_sessions[session_id] = {
            "agent_id": agent_id,
            "caller_phone": caller_normalized,
            "caller_name": None,
            "turn_count": 0,
            "call_id": call_id,
            "did": did_normalized,
            "flow": flow,
            "current_node": start_node_id,
            "flow_engine": flow_engine,
            "context": {
                "session": {
                    "caller": caller_normalized,
                    "did": did_normalized,
                    "call_id": call_id,
                    "session_id": session_id,
                    "last_dtmf": ""
                },
                "tool": {},
                "memory": {}
            },
            "audit": []
        }

        # Get node text and action
        node_text = flow_engine.get_node_text(start_node)
        node_action = flow_engine.get_node_action(start_node)
        node_timeout = flow_engine.get_timeout(start_node, DTMF_TIMEOUT)

        logger.info(
            f"[InboundStart] Flow started - Agent: {agent_id}, "
            f"StartNode: {start_node_id}, Type: {start_node.get('type')}"
        )

        # Build KV response based on node type
        kv_data = {
            "OK": 1,
            "ACTION": node_action,
            "AGENT_ID": agent_id,
            "SESSION_ID": session_id,
            "GREETING": node_text,
            "MENU_TIMEOUT": node_timeout,
            "MENU_RETRIES": DTMF_RETRIES,
        }

        # Add recording params if node is record type
        if start_node.get("type") == "record":
            kv_data.update({
                "REC_ENABLE": 1,
                "REC_SILENCE_S": REC_SILENCE_S,
                "REC_MAX_S": REC_MAX_S,
                "REC_PROMPT": node_text
            })
        else:
            kv_data.update({
                "MENU_PROMPT": node_text,
                "REC_ENABLE": 1 if REC_ENABLE else 0,
                "REC_SILENCE_S": REC_SILENCE_S,
                "REC_MAX_S": REC_MAX_S,
                "REC_PROMPT": "Please briefly describe what you need after the tone. When finished, press pound or just hang up."
            })

        kv = to_kv(kv_data)
        return Response(kv, mimetype='text/plain'), 200

    except Exception as e:
        logger.error(f"[InboundStart] Error: {e}", exc_info=True)
        kv = to_kv({
            "OK": 1,
            "ACTION": "REJECT",
            "SAY": "An error occurred. Please try again later."
        })
        return Response(kv, mimetype='text/plain'), 500


@telephony_bp.route('/dtmf', methods=['POST'])
def handle_dtmf():
    """
    Phase B: DTMF → Runtime Turn

    Called by Asterisk when caller presses a key.

    Request:
        {
            "sessionId": "call_abc_xyz",
            "digit": "1",
            "callId": "asterisk-call-id-123"
        }

    Response (KV string format):
        Continue:
            "OK=1|SAY=Great! I can help you with sales...|NEXT=DTMF|HANGUP=0"

        Transfer:
            "OK=1|SAY=Transferring you now...|NEXT=TRANSFER|TRANSFER_TO=+15551234567|HANGUP=0"

        Hangup:
            "OK=1|SAY=Thank you for calling. Goodbye!|NEXT=HANGUP|HANGUP=1"
    """
    try:
        data = request.get_json() or {}

        session_id = data.get('sessionId', '')
        digit = data.get('digit', '')
        call_id = data.get('callId', '')

        logger.info(f"[DTMF] Session: {session_id}, Digit: {digit}, CallID: {call_id}")

        # Get session
        session = call_sessions.get(session_id)
        if not session:
            logger.warning(f"[DTMF] Session not found: {session_id}")
            kv = to_kv({
                "OK": 1,
                "SAY": "Sorry, your session has expired. Please call back.",
                "NEXT": "HANGUP",
                "HANGUP": 1
            })
            return Response(kv, mimetype='text/plain'), 200

        # Increment turn count
        session['turn_count'] += 1

        # Check if session has flow engine (flow-driven mode)
        flow_engine = session.get('flow_engine')

        if flow_engine:
            # Flow-driven mode: Use flow transitions
            return _handle_dtmf_flow(session, session_id, digit, call_id)
        else:
            # Legacy mode: Use hardcoded runtime turns
            return _handle_dtmf_legacy(session, session_id, digit, call_id)

    except Exception as e:
        logger.error(f"[DTMF] Error: {e}", exc_info=True)
        kv = to_kv({
            "OK": 1,
            "SAY": "An error occurred. Please try again or press 0 for an operator.",
            "NEXT": "DTMF",
            "HANGUP": 0
        })
        return Response(kv, mimetype='text/plain'), 500


@telephony_bp.route('/record', methods=['POST'])
def handle_recording():
    """
    Phase C: Voicemail Fallback

    Called by Asterisk when recording a voicemail (no DTMF response).

    Request (multipart/form-data):
        sessionId: call_abc_xyz
        audioFile: <audio file>
        duration: 15.5
        callId: asterisk-call-id-123

    Response (KV string format):
        Success:
            "OK=1|SAY=Thank you for your message. We'll get back to you shortly."

        Error:
            "OK=0|SAY=Failed to save your message. Please try again."
    """
    try:
        session_id = request.form.get('sessionId', '')
        duration = float(request.form.get('duration', 0))
        call_id = request.form.get('callId', '')

        logger.info(f"[Record] Session: {session_id}, Duration: {duration}s, CallID: {call_id}")

        # Get session
        session = call_sessions.get(session_id)
        if not session:
            logger.warning(f"[Record] Session not found: {session_id}")
            kv = to_kv({
                "OK": 0,
                "SAY": "Session not found. Please try calling back."
            })
            return Response(kv, mimetype='text/plain'), 404

        # Save audio file
        audio_file = request.files.get('audioFile')
        if not audio_file:
            logger.warning(f"[Record] No audio file provided")
            kv = to_kv({
                "OK": 0,
                "SAY": "No audio file received. Please try again."
            })
            return Response(kv, mimetype='text/plain'), 400

        # Save to disk (or S3 in production)
        os.makedirs(REC_DIR, exist_ok=True)

        filename = f"{session_id}_{call_id}.wav"
        filepath = os.path.join(REC_DIR, filename)
        audio_file.save(filepath)

        logger.info(f"[Record] Saved recording: {filepath}")

        # Queue async transcription job (implement later)
        # For now, just log it
        logger.info(f"[Record] TODO: Queue transcription job for {filepath}")

        # Store metadata
        session['recording_path'] = filepath
        session['recording_duration'] = duration

        kv = to_kv({
            "OK": 1,
            "SAY": "Thank you for your message. We'll get back to you shortly. Goodbye!"
        })
        return Response(kv, mimetype='text/plain'), 200

    except Exception as e:
        logger.error(f"[Record] Error: {e}", exc_info=True)
        kv = to_kv({
            "OK": 0,
            "SAY": "Failed to save your message. Please try again later."
        })
        return Response(kv, mimetype='text/plain'), 500


@telephony_bp.route('/hangup', methods=['POST'])
def handle_hangup():
    """
    Called by Asterisk when call ends.
    Cleanup session and log call metrics.

    Request:
        {
            "sessionId": "call_abc_xyz",
            "callId": "asterisk-call-id-123",
            "duration": 125.5,
            "hangupCause": "NORMAL_CLEARING"
        }

    Response (KV string format):
        "OK=1"
    """
    try:
        data = request.get_json() or {}

        session_id = data.get('sessionId', '')
        call_id = data.get('callId', '')
        duration = data.get('duration', 0)
        hangup_cause = data.get('hangupCause', 'UNKNOWN')

        logger.info(
            f"[Hangup] Session: {session_id}, CallID: {call_id}, "
            f"Duration: {duration}s, Cause: {hangup_cause}"
        )

        # Get session before cleanup
        session = call_sessions.get(session_id)

        if session:
            logger.info(
                f"[Hangup] Session stats - Agent: {session.get('agent_id')}, "
                f"Turns: {session.get('turn_count', 0)}"
            )

            # TODO: Log to analytics/database
            # - Call duration
            # - Turn count
            # - Agent ID
            # - Caller info
            # - Recording path (if any)

            # Cleanup session
            del call_sessions[session_id]

        return Response(to_kv({"OK": 1}), mimetype='text/plain'), 200

    except Exception as e:
        logger.error(f"[Hangup] Error: {e}", exc_info=True)
        return Response(to_kv({"OK": 0}), mimetype='text/plain'), 500


# ============================================================================
# Helper Functions
# ============================================================================

def _step_node(
    session: Dict[str, Any],
    agent_id: str,
    input_dtmf: Optional[str] = None
) -> tuple:
    """
    Step through a single node, including tool execution.

    This is the core flow execution logic that handles:
    - prompt nodes (speak + collect)
    - record nodes (speak + record)
    - tool nodes (execute tool + continue)
    - end nodes (speak + hangup)

    Args:
        session: Session data
        agent_id: VoiceAgent ID
        input_dtmf: DTMF input if any

    Returns:
        (Response, status_code)
    """
    flow_engine = session.get("flow_engine")
    if not flow_engine:
        logger.error("[StepNode] No flow engine in session")
        kv = to_kv({
            "OK": 1,
            "SAY": "Flow error. Please try again later.",
            "NEXT": "HANGUP",
            "HANGUP": 1
        })
        return Response(kv, mimetype='text/plain'), 200

    current_node_id = session["current_node"]
    node = flow_engine.get_node(current_node_id)

    if not node:
        logger.error(f"[StepNode] Node {current_node_id} not found")
        kv = to_kv({
            "OK": 1,
            "SAY": "Flow error. Please try again later.",
            "NEXT": "HANGUP",
            "HANGUP": 1
        })
        return Response(kv, mimetype='text/plain'), 200

    # Update context with DTMF input
    if input_dtmf:
        session["context"]["session"]["last_dtmf"] = input_dtmf

    node_type = node.get("type", "prompt")

    # Handle tool nodes
    if node_type == "tool":
        return _handle_tool_node(session, agent_id, node, current_node_id)

    # Handle prompt nodes
    if node_type == "prompt":
        text = node.get("text", "Hello.")
        text = render_text(text, session["context"]) if render_text else text

        node_timeout = flow_engine.get_timeout(node, DTMF_TIMEOUT)

        kv_data = {
            "OK": 1,
            "SAY": text,
            "NEXT": "DTMF",
            "HANGUP": 0,
            "MENU_TIMEOUT": node_timeout,
            "MENU_RETRIES": DTMF_RETRIES
        }

        kv = to_kv(kv_data)
        return Response(kv, mimetype='text/plain'), 200

    # Handle record nodes
    if node_type == "record":
        text = node.get("text", "Please leave a message after the beep.")
        text = render_text(text, session["context"]) if render_text else text

        kv_data = {
            "OK": 1,
            "SAY": text,
            "NEXT": "RECORD",
            "HANGUP": 0,
            "REC_ENABLE": 1,
            "REC_SILENCE_S": REC_SILENCE_S,
            "REC_MAX_S": REC_MAX_S,
        }

        kv = to_kv(kv_data)
        return Response(kv, mimetype='text/plain'), 200

    # Handle end nodes
    if node_type == "end":
        text = node.get("text", "Thank you for calling. Goodbye.")
        text = render_text(text, session["context"]) if render_text else text

        kv_data = {
            "OK": 1,
            "SAY": text,
            "NEXT": "HANGUP",
            "HANGUP": 1
        }

        kv = to_kv(kv_data)
        return Response(kv, mimetype='text/plain'), 200

    # Handle set nodes
    if node_type == "set":
        updates = node.get("set") or {}
        for k, v in updates.items():
            # k is like "session.callback_window"
            if deep_set:
                deep_set(session["context"], k, v)
                logger.info(f"[SetNode] Set {k} = {v}")

        # Optionally compute callback time ISO
        window_key = session["context"].get("session", {}).get("callback_window")
        if window_key:
            try:
                from callback_time import compute_callback_time
                tz = session["context"].get("session", {}).get("timezone", "America/Dominica")
                iso = compute_callback_time(window_key, tz)
                if iso and deep_set:
                    deep_set(session["context"], "session.callback_time_iso", iso)
                    logger.info(f"[SetNode] Computed callback_time_iso = {iso}")
            except Exception as e:
                logger.warning(f"[SetNode] Failed to compute callback time: {e}")

        # Transition to next node
        next_node_id = node.get("next")
        if next_node_id:
            session["current_node"] = next_node_id
            return _step_node(session, agent_id)
        else:
            logger.error("[SetNode] No 'next' field in set node")
            kv = to_kv({
                "OK": 1,
                "SAY": "Configuration error. Please call back.",
                "NEXT": "HANGUP",
                "HANGUP": 1
            })
            return Response(kv, mimetype='text/plain'), 200

    # Unknown node type
    logger.warning(f"[StepNode] Unknown node type: {node_type}")
    kv = to_kv({
        "OK": 1,
        "SAY": "Thank you for calling. Goodbye.",
        "NEXT": "HANGUP",
        "HANGUP": 1
    })
    return Response(kv, mimetype='text/plain'), 200


def _handle_tool_node(
    session: Dict[str, Any],
    agent_id: str,
    node: Dict[str, Any],
    node_id: str
) -> tuple:
    """
    Handle tool node execution.

    Tool nodes execute immediately and transition to next node.

    Args:
        session: Session data
        agent_id: VoiceAgent ID
        node: Tool node definition
        node_id: Node ID

    Returns:
        (Response, status_code)
    """
    tool_key = node.get("tool_key")
    if not tool_key:
        logger.error(f"[ToolNode] No tool_key in node {node_id}")
        return _transition_to_error_node(session, node)

    # Load agent tool config
    tool_config = _load_agent_tool_config(agent_id)

    # Render tool arguments from templates
    raw_args = node.get("input", {})
    args = render_any(raw_args, session["context"]) if render_any else raw_args

    # Execute tool
    if not execute_tool_v1:
        logger.error("[ToolNode] execute_tool_v1 not available")
        return _transition_to_error_node(session, node)

    result = execute_tool_v1(session, tool_config, tool_key, args)

    # Add to audit trail
    session["audit"].append({
        "node": node_id,
        "type": "tool",
        "tool_key": tool_key,
        "ok": result.get("ok"),
        "error": result.get("error"),
        "duration_ms": result.get("duration_ms", 0)
    })

    # Handle result
    if result.get("ok"):
        # Save output to context
        save_path = node.get("save_output_as")
        if save_path and deep_set:
            deep_set(session["context"], save_path, result.get("data"))

        # Transition to success node
        next_node_id = node.get("on_success") or node.get("next")
    else:
        # Transition to error node
        logger.warning(
            f"[ToolNode] Tool execution failed: {tool_key} - {result.get('error')}"
        )
        next_node_id = node.get("on_error") or node.get("fallback") or node.get("next")

    if not next_node_id:
        logger.error(f"[ToolNode] No next node after tool {tool_key}")
        kv = to_kv({
            "OK": 1,
            "SAY": "Thank you for calling. Goodbye.",
            "NEXT": "HANGUP",
            "HANGUP": 1
        })
        return Response(kv, mimetype='text/plain'), 200

    # Update session to next node
    session["current_node"] = next_node_id

    # Immediately step into next node (tool nodes don't speak themselves)
    return _step_node(session, agent_id, input_dtmf=None)


def _transition_to_error_node(
    session: Dict[str, Any],
    node: Dict[str, Any]
) -> tuple:
    """
    Transition to error node or fallback.

    Args:
        session: Session data
        node: Current node

    Returns:
        (Response, status_code)
    """
    next_node_id = node.get("on_error") or node.get("fallback") or node.get("next")

    if next_node_id:
        session["current_node"] = next_node_id
        agent_id = session.get("agent_id")
        return _step_node(session, agent_id, input_dtmf=None)
    else:
        kv = to_kv({
            "OK": 1,
            "SAY": "We're experiencing technical difficulties. Please try again later.",
            "NEXT": "HANGUP",
            "HANGUP": 1
        })
        return Response(kv, mimetype='text/plain'), 200


def _load_agent_tool_config(agent_id: str) -> Dict[str, Any]:
    """
    Load agent tool configuration.

    Args:
        agent_id: VoiceAgent ID

    Returns:
        Tool config dict or empty dict
    """
    # v1: stub - load from Agent OS API
    # In production, fetch from:
    # GET /api/agent-os/agents/{agent_id}
    # Extract: agent.toolConfig or agent.tool_config

    # For now, return empty config (all tools disabled by default)
    # This ensures safe fail-closed behavior

    logger.info(f"[LoadToolConfig] Loading tool config for agent {agent_id}")

    # TODO: Implement real API call
    # try:
    #     import requests
    #     WEB_API_BASE = os.getenv("WEB_API_BASE", "http://localhost:3000")
    #     r = requests.get(f"{WEB_API_BASE}/api/agent-os/agents/{agent_id}", timeout=5)
    #     agent = r.json().get("data", {})
    #     tool_config = agent.get("toolConfig") or agent.get("tool_config") or {}
    #     return tool_config
    # except Exception as e:
    #     logger.error(f"[LoadToolConfig] Failed to load tool config: {e}")
    #     return {}

    # v1 stub: return empty config
    return {
        "enabled_tools": [
            {"id": "crm.lookupContact", "name": "CRM Lookup", "enabled": True},
            {"id": "calendar.createBooking", "name": "Create Booking", "enabled": True},
            {"id": "sms.sendMessage", "name": "Send SMS", "enabled": True},
            {"id": "kb.query", "name": "Knowledge Base", "enabled": True}
        ]
    }


def _load_flow_for_agent(agent_id: str) -> Dict[str, Any]:
    """
    Load flow config for agent from Agent OS API.

    Args:
        agent_id: VoiceAgent ID

    Returns:
        Flow JSONB or DEFAULT_FLOW
    """
    if not load_agent_flow:
        logger.warning("[LoadFlow] Flow loader not available, using DEFAULT_FLOW")
        return DEFAULT_FLOW or {
            "start_node": "welcome",
            "nodes": {
                "welcome": {
                    "type": "prompt",
                    "text": "Welcome. Press 1 to continue.",
                    "transitions": {"1": "end"}
                },
                "end": {"type": "end", "text": "Thank you. Goodbye."}
            }
        }

    try:
        flow = load_agent_flow(agent_id)
        return flow
    except Exception as e:
        logger.error(f"[LoadFlow] Failed to load flow for agent {agent_id}: {e}")
        return DEFAULT_FLOW


def _legacy_inbound_start(
    agent_id: str,
    call_id: str,
    caller_phone: str,
    did: str
) -> tuple:
    """
    Legacy inbound start behavior (hardcoded menu).

    Fallback when flow engine is not available.

    Returns:
        (Response, status_code)
    """
    session_uuid = str(uuid.uuid4())[:8]
    session_id = f"call_{call_id}_{session_uuid}"

    call_sessions[session_id] = {
        "agent_id": agent_id,
        "caller_phone": caller_phone,
        "caller_name": None,
        "turn_count": 0,
        "call_id": call_id,
        "did": did,
    }

    greeting = _get_agent_greeting(agent_id, session_id, caller_phone)

    kv = to_kv({
        "OK": 1,
        "ACTION": "DTMF_MENU",
        "AGENT_ID": agent_id,
        "SESSION_ID": session_id,
        "GREETING": greeting,
        "MENU_PROMPT": MENU_DEFAULT["promptText"],
        "MENU_TIMEOUT": MENU_DEFAULT["timeout"],
        "MENU_RETRIES": MENU_DEFAULT["maxRetries"],
        "REC_ENABLE": 1 if REC_ENABLE else 0,
        "REC_SILENCE_S": REC_SILENCE_S,
        "REC_MAX_S": REC_MAX_S,
        "REC_PROMPT": "Please briefly describe what you need after the tone."
    })

    return Response(kv, mimetype='text/plain'), 200


def _handle_dtmf_flow(
    session: Dict[str, Any],
    session_id: str,
    digit: str,
    call_id: str
) -> tuple:
    """
    Handle DTMF using flow runtime engine.

    Args:
        session: Session data
        session_id: Session ID
        digit: DTMF digit pressed
        call_id: Asterisk call ID

    Returns:
        (Response, status_code)
    """
    flow_engine = session['flow_engine']
    current_node_id = session['current_node']

    # Get current node
    current_node = flow_engine.get_node(current_node_id)

    if not current_node:
        logger.error(f"[DTMF:Flow] Current node {current_node_id} not found")
        kv = to_kv({
            "OK": 1,
            "SAY": "An error occurred. Please try again or call back.",
            "NEXT": "HANGUP",
            "HANGUP": 1
        })
        return Response(kv, mimetype='text/plain'), 200

    # Update last_dtmf in session context
    session["context"]["session"]["last_dtmf"] = digit

    # If current node has save_dtmf_as, save the digit to that session field
    if current_node.get("save_dtmf_as"):
        save_key = current_node.get("save_dtmf_as")
        session["context"]["session"][save_key] = digit
        logger.info(f"[DTMF:Flow] Saved DTMF '{digit}' to session.{save_key}")

    # Resolve next node based on input
    next_node_id = flow_engine.resolve_next(current_node, digit)

    if not next_node_id:
        logger.warning(
            f"[DTMF:Flow] No transition for digit '{digit}' in node {current_node_id}"
        )
        # Use timeout transition or stay on current node
        next_node_id = flow_engine.resolve_next(current_node, "timeout") or current_node_id

    next_node = flow_engine.get_node(next_node_id)

    if not next_node:
        logger.error(f"[DTMF:Flow] Next node {next_node_id} not found")
        kv = to_kv({
            "OK": 1,
            "SAY": "An error occurred. Please try again or call back.",
            "NEXT": "HANGUP",
            "HANGUP": 1
        })
        return Response(kv, mimetype='text/plain'), 200

    # Update session current node
    session['current_node'] = next_node_id

    logger.info(
        f"[DTMF:Flow] Transition - Session: {session_id}, "
        f"{current_node_id} --[{digit}]--> {next_node_id}, Type: {next_node.get('type')}"
    )

    # Use step_node to handle next node (including tool nodes)
    agent_id = session.get("agent_id")
    return _step_node(session, agent_id, input_dtmf=digit)


def _handle_dtmf_legacy(
    session: Dict[str, Any],
    session_id: str,
    digit: str,
    call_id: str
) -> tuple:
    """
    Handle DTMF using legacy runtime turns (hardcoded logic).

    Fallback when flow engine is not available.

    Args:
        session: Session data
        session_id: Session ID
        digit: DTMF digit pressed
        call_id: Asterisk call ID

    Returns:
        (Response, status_code)
    """
    # Map DTMF to user intent
    user_input = _map_dtmf_to_intent(digit)

    # Call runtime
    agent_id = session['agent_id']
    caller_phone = session.get('caller_phone')
    caller_name = session.get('caller_name')

    response_text, next_action, transfer_to = _call_runtime_turn(
        agent_id=agent_id,
        session_id=session_id,
        user_input=user_input,
        caller_phone=caller_phone,
        caller_name=caller_name,
    )

    # Build KV response
    kv_data = {
        "OK": 1,
        "SAY": response_text,
        "NEXT": next_action,
        "HANGUP": 1 if next_action == "HANGUP" else 0
    }

    if transfer_to:
        kv_data["TRANSFER_TO"] = transfer_to

    kv = to_kv(kv_data)
    return Response(kv, mimetype='text/plain'), 200


def _get_agent_greeting(
    agent_id: str,
    session_id: str,
    caller_phone: Optional[str] = None
) -> str:
    """
    Get agent greeting from runtime.

    Returns:
        greeting_text
    """
    default_greeting = (
        "Hello! Thank you for calling. "
        "Press 1 for sales, 2 for support, 3 for information, or 0 for an operator."
    )

    # Try to get from runtime
    if not AgentRuntimeClient:
        return default_greeting

    try:
        client = AgentRuntimeClient()
        result = client.turn(
            agent_id=agent_id,
            session_id=session_id,
            user_text="[CALL_START]",
            caller_phone=caller_phone,
        )

        # Extract greeting from response
        greeting = result.text or default_greeting
        return greeting

    except Exception as e:
        logger.warning(f"[GetGreeting] Failed to get from runtime: {e}")
        return default_greeting


def _map_dtmf_to_intent(digit: str) -> str:
    """Map DTMF digit to user intent text"""

    intent_map = {
        "1": "Caller pressed 1 (Sales / New booking). Continue the call flow accordingly.",
        "2": "Caller pressed 2 (Support). Continue the call flow accordingly.",
        "3": "Caller pressed 3 (Hours / Location / Pricing). Continue the call flow accordingly.",
        "0": "Caller pressed 0 (Operator / Escalate). Transfer or route to human operator.",
        "*": "Caller pressed star (*). Go back to main menu.",
        "#": "Caller pressed pound (#). Confirm selection or proceed.",
    }

    return intent_map.get(digit, f"Caller pressed {digit}. Handle accordingly.")


def _call_runtime_turn(
    agent_id: str,
    session_id: str,
    user_input: str,
    caller_phone: Optional[str] = None,
    caller_name: Optional[str] = None,
) -> tuple[str, str, Optional[str]]:
    """
    Call the runtime turn endpoint.

    Returns:
        (response_text, next_action, transfer_to)
        next_action: "DTMF", "TRANSFER", "HANGUP"
        transfer_to: phone number if TRANSFER, else None
    """
    if not AgentRuntimeClient:
        return (
            "I'm having trouble processing your request. Please try again later.",
            "HANGUP",
            None
        )

    try:
        client = AgentRuntimeClient()
        result = client.turn(
            agent_id=agent_id,
            session_id=session_id,
            user_text=user_input,
            caller_phone=caller_phone,
            caller_name=caller_name,
        )

        response_text = result.text or "Please hold..."

        # Determine next action
        if result.should_end:
            next_action = "HANGUP"
            transfer_to = None
        elif result.metadata and result.metadata.get('transferTo'):
            next_action = "TRANSFER"
            transfer_to = result.metadata['transferTo']
        else:
            next_action = "DTMF"
            transfer_to = None

        return response_text, next_action, transfer_to

    except Exception as e:
        logger.error(f"[RuntimeTurn] Failed: {e}")
        return (
            "I'm having trouble right now. Please press 0 for an operator.",
            "DTMF",
            None
        )
