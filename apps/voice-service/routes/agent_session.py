"""
Agent Session Runtime v1 - Session Endpoints

DTMF-driven, TTS-only loop (no ASR yet) that integrates with:
- Flow Runtime v1 (flow JSONB execution)
- Tool Node Runtime v1 (tool execution)
- Asterisk AGI (agent_session.py)

Endpoints:
- POST /telephony/session/start - Start agent session
- POST /telephony/session/continue - Continue session with DTMF/recording input

Actions returned:
- speak_and_collect - Play text, collect DTMF digit
- speak_and_record - Play text, record voicemail
- speak_and_end - Play text, hangup
"""

import os
import logging
from flask import Blueprint, request, jsonify
from typing import Dict, Any, Optional, Literal

# Import flow runtime and tool runtime
try:
    import sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from flow_runtime import (
        FlowRuntimeEngine, DEFAULT_FLOW,
        deep_set
    )
    from template_runtime import render_text, render_any
    from flow_loader import load_agent_flow
    from tool_runtime import execute_tool_v1
except ImportError as e:
    logging.error(f"Failed to import required modules: {e}")
    FlowRuntimeEngine = None
    DEFAULT_FLOW = None
    render_text = None
    render_any = None
    deep_set = None
    load_agent_flow = None
    execute_tool_v1 = None

logger = logging.getLogger(__name__)

# Create blueprint
agent_session_bp = Blueprint('agent_session', __name__, url_prefix='/telephony')

# In-memory session store (use Redis in production)
# session_id -> {
#   voiceAgentId, did, caller, callId,
#   flow, current_node, flow_engine,
#   context: {session, tool, memory},
#   audit: [{node, type, tool_key, ok, error, duration_ms}],
#   turn_count, created_at
# }
SESSIONS: Dict[str, Dict[str, Any]] = {}

# Configuration
MAX_TURNS = int(os.getenv("EPIC_MAX_TURNS", "10"))
DTMF_TIMEOUT_MS = int(os.getenv("EPIC_DTMF_TIMEOUT_MS", "7000"))
RECORD_MAX_SECONDS = int(os.getenv("EPIC_RECORD_MAX_SECONDS", "60"))


def _load_agent_tool_config(agent_id: str) -> Dict[str, Any]:
    """
    Load agent tool configuration.

    Args:
        agent_id: VoiceAgent ID

    Returns:
        Tool config dict
    """
    # v1 stub: return enabled tools
    # TODO: Load from Agent OS API
    logger.info(f"[LoadToolConfig] Loading tool config for agent {agent_id}")

    return {
        "enabled_tools": [
            {"id": "crm.lookupContact", "name": "CRM Lookup", "enabled": True},
            {"id": "calendar.createBooking", "name": "Create Booking", "enabled": True},
            {"id": "sms.sendMessage", "name": "Send SMS", "enabled": True},
            {"id": "kb.query", "name": "Knowledge Base", "enabled": True}
        ]
    }


def _step_node(
    session: Dict[str, Any],
    agent_id: str,
    input_dtmf: Optional[str] = None,
    input_recording: Optional[str] = None
) -> Dict[str, Any]:
    """
    Step through a single node in the flow.

    This integrates Flow Runtime v1 + Tool Node Runtime v1.

    Args:
        session: Session data
        agent_id: VoiceAgent ID
        input_dtmf: DTMF input if any
        input_recording: Recording path if any

    Returns:
        Session state dict with action, text, timeoutMs, maxSeconds
    """
    flow_engine = session.get("flow_engine")
    if not flow_engine:
        logger.error("[StepNode] No flow engine in session")
        return {
            "action": "speak_and_end",
            "text": "Flow error. Please call back later."
        }

    current_node_id = session["current_node"]
    node = flow_engine.get_node(current_node_id)

    if not node:
        logger.error(f"[StepNode] Node {current_node_id} not found")
        return {
            "action": "speak_and_end",
            "text": "Flow error. Please call back later."
        }

    # Update context with input
    if input_dtmf is not None:
        session["context"]["session"]["last_dtmf"] = input_dtmf
    if input_recording is not None:
        session["context"]["session"]["last_recording_path"] = input_recording

    node_type = node.get("type", "prompt")

    # Handle tool nodes
    if node_type == "tool":
        return _handle_tool_node(session, agent_id, node, current_node_id)

    # Handle prompt nodes
    if node_type == "prompt":
        text = node.get("text", "Hello.")
        text = render_text(text, session["context"]) if render_text else text

        collect_type = node.get("collect", "dtmf")

        if collect_type == "record":
            # This is a record prompt
            return {
                "action": "speak_and_record",
                "text": text,
                "maxSeconds": node.get("maxSeconds", RECORD_MAX_SECONDS)
            }
        else:
            # Default: collect DTMF
            return {
                "action": "speak_and_collect",
                "text": text,
                "timeoutMs": node.get("timeout", DTMF_TIMEOUT_MS) * 1000 if node.get("timeout") else DTMF_TIMEOUT_MS
            }

    # Handle record nodes
    if node_type == "record":
        text = node.get("text", "Please leave a message after the beep.")
        text = render_text(text, session["context"]) if render_text else text

        return {
            "action": "speak_and_record",
            "text": text,
            "maxSeconds": node.get("maxSeconds", RECORD_MAX_SECONDS)
        }

    # Handle transfer nodes
    if node_type == "transfer":
        text = node.get("text", "Transferring you now. Please hold.")
        text = render_text(text, session["context"]) if render_text else text

        # v1: We don't support transfer in AGI script yet
        # For now, just announce and end
        return {
            "action": "speak_and_end",
            "text": text
        }

    # Handle end nodes
    if node_type == "end":
        text = node.get("text", "Thank you for calling. Goodbye.")
        text = render_text(text, session["context"]) if render_text else text

        return {
            "action": "speak_and_end",
            "text": text
        }

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
            return {
                "action": "speak_and_end",
                "text": "Configuration error. Please call back."
            }

    # Unknown node type
    logger.warning(f"[StepNode] Unknown node type: {node_type}")
    return {
        "action": "speak_and_end",
        "text": "Thank you for calling. Goodbye."
    }


def _handle_tool_node(
    session: Dict[str, Any],
    agent_id: str,
    node: Dict[str, Any],
    node_id: str
) -> Dict[str, Any]:
    """
    Handle tool node execution.

    Tool nodes execute immediately and transition to next node.

    Args:
        session: Session data
        agent_id: VoiceAgent ID
        node: Tool node definition
        node_id: Node ID

    Returns:
        Session state dict
    """
    tool_key = node.get("tool_key")
    if not tool_key:
        logger.error(f"[ToolNode] No tool_key in node {node_id}")
        return _transition_to_error_node(session, agent_id, node)

    # Load agent tool config
    tool_config = _load_agent_tool_config(agent_id)

    # Render tool arguments from templates
    raw_args = node.get("input", {})
    args = render_any(raw_args, session["context"]) if render_any else raw_args

    # Execute tool
    if not execute_tool_v1:
        logger.error("[ToolNode] execute_tool_v1 not available")
        return _transition_to_error_node(session, agent_id, node)

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
        return {
            "action": "speak_and_end",
            "text": "Thank you for calling. Goodbye."
        }

    # Update session to next node
    session["current_node"] = next_node_id

    # Immediately step into next node (tool nodes don't speak themselves)
    return _step_node(session, agent_id, input_dtmf=None)


def _transition_to_error_node(
    session: Dict[str, Any],
    agent_id: str,
    node: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Transition to error node or fallback.

    Args:
        session: Session data
        agent_id: VoiceAgent ID
        node: Current node

    Returns:
        Session state dict
    """
    next_node_id = node.get("on_error") or node.get("fallback") or node.get("next")

    if next_node_id:
        session["current_node"] = next_node_id
        return _step_node(session, agent_id, input_dtmf=None)
    else:
        return {
            "action": "speak_and_end",
            "text": "We're experiencing technical difficulties. Please try again later."
        }


@agent_session_bp.route('/session/start', methods=['POST'])
def session_start():
    """
    Start agent session.

    Request:
    {
        "sessionId": "call_123:va_abc",
        "voiceAgentId": "va_abc",
        "did": "+17675551234",
        "caller": "+18005550000",
        "callId": "ast-123"
    }

    Response:
    {
        "action": "speak_and_collect",
        "text": "Welcome. Press 1 for sales...",
        "timeoutMs": 7000
    }
    """
    try:
        data = request.get_json() or {}

        session_id = data.get("sessionId")
        voice_agent_id = data.get("voiceAgentId")
        did = data.get("did")
        caller = data.get("caller")
        call_id = data.get("callId")

        if not session_id or not voice_agent_id:
            logger.error("[SessionStart] Missing required fields")
            return jsonify({
                "action": "speak_and_end",
                "text": "System error. Please call back later."
            }), 400

        logger.info(
            f"[SessionStart] Starting session - ID: {session_id}, "
            f"Agent: {voice_agent_id}, DID: {did}, Caller: {caller}"
        )

        # Load agent flow
        if load_agent_flow:
            flow = load_agent_flow(voice_agent_id)
        else:
            flow = DEFAULT_FLOW or {
                "start_node": "welcome",
                "nodes": {
                    "welcome": {
                        "type": "prompt",
                        "text": "Welcome. Press 1 to continue.",
                        "transitions": {"1": "end"}
                    },
                    "end": {"type": "end", "text": "Goodbye."}
                }
            }

        # Create flow engine
        try:
            if FlowRuntimeEngine:
                flow_engine = FlowRuntimeEngine(flow)
            else:
                logger.error("[SessionStart] FlowRuntimeEngine not available")
                return jsonify({
                    "action": "speak_and_end",
                    "text": "System error. Please call back later."
                }), 500
        except Exception as e:
            logger.error(f"[SessionStart] Failed to create flow engine: {e}")
            return jsonify({
                "action": "speak_and_end",
                "text": "System error. Please call back later."
            }), 500

        # Get start node
        start_node_id = flow_engine.get_start_node_id()

        # Create session
        SESSIONS[session_id] = {
            "voiceAgentId": voice_agent_id,
            "did": did,
            "caller": caller,
            "callId": call_id,
            "flow": flow,
            "current_node": start_node_id,
            "flow_engine": flow_engine,
            "context": {
                "session": {
                    "caller": caller or "",
                    "did": did or "",
                    "call_id": call_id or "",
                    "session_id": session_id,
                    "last_dtmf": ""
                },
                "tool": {},
                "memory": {}
            },
            "audit": [],
            "turn_count": 0
        }

        # Step into start node
        state = _step_node(SESSIONS[session_id], voice_agent_id)

        logger.info(f"[SessionStart] Session started - Action: {state.get('action')}")

        return jsonify(state), 200

    except Exception as e:
        logger.error(f"[SessionStart] Error: {e}", exc_info=True)
        return jsonify({
            "action": "speak_and_end",
            "text": "An error occurred. Please call back later."
        }), 500


@agent_session_bp.route('/session/continue', methods=['POST'])
def session_continue():
    """
    Continue agent session with DTMF or recording input.

    Request:
    {
        "sessionId": "call_123:va_abc",
        "voiceAgentId": "va_abc",
        "input": {
            "type": "dtmf",
            "value": "1"
        }
    }

    OR

    {
        "sessionId": "call_123:va_abc",
        "voiceAgentId": "va_abc",
        "input": {
            "type": "recording",
            "path": "/var/spool/asterisk/epic-recordings/va_abc-ast-123-1234567890.wav"
        }
    }

    Response:
    {
        "action": "speak_and_collect",
        "text": "Great! Press 1 to continue...",
        "timeoutMs": 7000
    }
    """
    try:
        data = request.get_json() or {}

        session_id = data.get("sessionId")
        voice_agent_id = data.get("voiceAgentId")
        input_data = data.get("input", {})

        if not session_id:
            logger.error("[SessionContinue] Missing sessionId")
            return jsonify({
                "action": "speak_and_end",
                "text": "Session error. Please call back."
            }), 400

        # Get session
        session = SESSIONS.get(session_id)
        if not session:
            logger.warning(f"[SessionContinue] Session not found: {session_id}")
            return jsonify({
                "action": "speak_and_end",
                "text": "Session expired. Please call back."
            }), 200

        # Increment turn count
        session["turn_count"] += 1

        # Check max turns
        if session["turn_count"] > MAX_TURNS:
            logger.warning(f"[SessionContinue] Max turns exceeded: {session_id}")
            return jsonify({
                "action": "speak_and_end",
                "text": "Thank you for calling. Goodbye."
            }), 200

        input_type = input_data.get("type")
        input_value = input_data.get("value", "")
        input_path = input_data.get("path")

        logger.info(
            f"[SessionContinue] Session: {session_id}, "
            f"Turn: {session['turn_count']}, Input: {input_type} = {input_value or input_path}"
        )

        # Get current node
        flow_engine = session.get("flow_engine")
        current_node_id = session["current_node"]
        current_node = flow_engine.get_node(current_node_id) if flow_engine else None

        # Handle DTMF input
        if input_type == "dtmf":
            digit = input_value.strip()

            # Update last_dtmf in session context
            session["context"]["session"]["last_dtmf"] = digit

            # If current node has save_dtmf_as, save the digit to that session field
            if current_node and current_node.get("save_dtmf_as"):
                save_key = current_node.get("save_dtmf_as")
                session["context"]["session"][save_key] = digit
                logger.info(f"[SessionContinue] Saved DTMF '{digit}' to session.{save_key}")

            # If current node is prompt with transitions, resolve next node
            if current_node and current_node.get("type") == "prompt":
                next_node_id = flow_engine.resolve_next(current_node, digit)

                if next_node_id:
                    session["current_node"] = next_node_id
                    logger.info(
                        f"[SessionContinue] DTMF transition: "
                        f"{current_node_id} --[{digit}]--> {next_node_id}"
                    )
                else:
                    logger.warning(
                        f"[SessionContinue] No transition for digit '{digit}' "
                        f"in node {current_node_id}"
                    )
                    # Use timeout transition or stay on current node
                    timeout_node = flow_engine.resolve_next(current_node, "timeout")
                    if timeout_node:
                        session["current_node"] = timeout_node
                    # else stay on current node

            # Step into next node
            state = _step_node(session, voice_agent_id, input_dtmf=digit)

        # Handle recording input
        elif input_type == "recording":
            # Store recording path
            session["context"]["session"]["last_recording_path"] = input_path

            # If current node has a next field, transition to it
            if current_node and current_node.get("next"):
                next_node_id = current_node.get("next")
                session["current_node"] = next_node_id
                logger.info(
                    f"[SessionContinue] Recording transition: "
                    f"{current_node_id} --> {next_node_id}"
                )

            # Step into next node
            state = _step_node(session, voice_agent_id, input_recording=input_path)

        else:
            logger.warning(f"[SessionContinue] Unknown input type: {input_type}")
            state = _step_node(session, voice_agent_id)

        logger.info(f"[SessionContinue] Next action: {state.get('action')}")

        return jsonify(state), 200

    except Exception as e:
        logger.error(f"[SessionContinue] Error: {e}", exc_info=True)
        return jsonify({
            "action": "speak_and_end",
            "text": "An error occurred. Please call back later."
        }), 500


@agent_session_bp.route('/session/status', methods=['GET'])
def session_status():
    """
    Get session count and health status.

    Response:
    {
        "status": "healthy",
        "sessions_active": 5,
        "max_turns": 10
    }
    """
    return jsonify({
        "status": "healthy",
        "sessions_active": len(SESSIONS),
        "max_turns": MAX_TURNS
    }), 200


# ============================================================================
# FastAGI Integration Functions
# ============================================================================

def create_agi_session(
    voice_agent_id: str,
    session_id: str,
    call_id: str,
    did: str,
    caller: str,
    agi_env: Dict[str, str],
    agi_io: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Create AGI session for outbound callback.

    This creates a session similar to /session/start endpoint but for
    AGI (Asterisk Gateway Interface) connections.

    Args:
        voice_agent_id: Voice agent ID
        session_id: Session ID (from callback job)
        call_id: Call ID
        did: DID number
        caller: Caller phone number
        agi_env: AGI environment from Asterisk
        agi_io: AGI IO wrapper (rfile, wfile)

    Returns:
        Session dict with flow engine and context
    """
    logger.info(
        f"[CreateAGISession] Creating session - "
        f"voiceAgentId={voice_agent_id}, sessionId={session_id}"
    )

    # Load agent flow
    try:
        flow = load_agent_flow(voice_agent_id)
        logger.info(f"[CreateAGISession] Loaded flow: {flow.get('name')}")
    except Exception as e:
        logger.warning(f"[CreateAGISession] Failed to load flow: {e}")
        flow = DEFAULT_FLOW

    # Initialize flow engine
    flow_engine = FlowRuntimeEngine(flow)
    start_node = flow_engine.get_start_node_id()

    # Initialize session context
    session = {
        "sessionId": session_id,
        "voiceAgentId": voice_agent_id,
        "callId": call_id,
        "did": did,
        "caller": caller,
        "flow": flow,
        "current_node": start_node,
        "flow_engine": flow_engine,
        "context": {
            "session": {
                "sessionId": session_id,
                "voiceAgentId": voice_agent_id,
                "callId": call_id,
                "did": did,
                "caller": caller,
                "last_dtmf": "",
                "timezone": agi_env.get("agi_timezone", "America/Dominica"),
            },
            "tool": {},
            "memory": {},
        },
        "audit": [],
        "turn_count": 0,
        "agi_env": agi_env,
        "agi_io": agi_io,
    }

    # Store in SESSIONS dict
    SESSIONS[session_id] = session

    logger.info(
        f"[CreateAGISession] Session created - "
        f"startNode={start_node}, flowName={flow.get('name')}"
    )

    return session


def run_agi_session_loop(session: Dict[str, Any], agi_io: Dict[str, Any]) -> None:
    """
    Run AGI session loop until flow completes or hangs up.

    This is the main loop for AGI-based DTMF flows. It:
    1. Steps through flow nodes
    2. Plays prompts via AGI STREAM FILE
    3. Collects DTMF via AGI WAIT FOR DIGIT
    4. Executes tool nodes
    5. Continues until end node or hangup

    Args:
        session: Session dict from create_agi_session
        agi_io: AGI IO wrapper
    """
    voice_agent_id = session["voiceAgentId"]
    session_id = session["sessionId"]

    logger.info(f"[AGISessionLoop] Starting - sessionId={session_id}")

    try:
        # Initial step (start node)
        state = _step_node(session, voice_agent_id)

        while True:
            action = state.get("action")
            logger.info(f"[AGISessionLoop] Action: {action}")

            if action == "speak_and_end":
                # Play final message and hangup
                text = state.get("text", "Goodbye")
                _agi_speak(agi_io, text)
                _agi_hangup(agi_io)
                break

            elif action == "speak_and_collect":
                # Play prompt and collect DTMF
                text = state.get("text", "")
                timeout = state.get("timeout", DTMF_TIMEOUT_MS // 1000)

                _agi_speak(agi_io, text)
                digit = _agi_get_digit(agi_io, timeout)

                if digit:
                    logger.info(f"[AGISessionLoop] DTMF digit: {digit}")
                    # Continue with DTMF input
                    state = _step_node(session, voice_agent_id, input_dtmf=digit)
                else:
                    logger.info("[AGISessionLoop] DTMF timeout")
                    # Continue with timeout transition
                    state = _step_node(session, voice_agent_id, input_dtmf="timeout")

            elif action == "speak_and_record":
                # Play prompt and record
                text = state.get("text", "")
                max_seconds = state.get("maxSeconds", RECORD_MAX_SECONDS)

                _agi_speak(agi_io, text)
                recording_path = _agi_record(agi_io, max_seconds)

                logger.info(f"[AGISessionLoop] Recording: {recording_path}")
                # Continue with recording input
                state = _step_node(session, voice_agent_id, input_recording=recording_path)

            else:
                logger.warning(f"[AGISessionLoop] Unknown action: {action}")
                _agi_speak(agi_io, "An error occurred. Goodbye.")
                _agi_hangup(agi_io)
                break

            # Check turn limit
            if session["turn_count"] >= MAX_TURNS:
                logger.warning(f"[AGISessionLoop] Max turns ({MAX_TURNS}) reached")
                _agi_speak(agi_io, "Maximum interaction limit reached. Goodbye.")
                _agi_hangup(agi_io)
                break

    except Exception as e:
        logger.error(f"[AGISessionLoop] Error: {e}", exc_info=True)
        try:
            _agi_speak(agi_io, "An error occurred. Please call back.")
            _agi_hangup(agi_io)
        except Exception:
            pass
    finally:
        # Clean up session
        if session_id in SESSIONS:
            del SESSIONS[session_id]
            logger.info(f"[AGISessionLoop] Session cleaned up - sessionId={session_id}")


# ============================================================================
# AGI Helper Functions
# ============================================================================

def _agi_send(agi_io: Dict[str, Any], command: str) -> str:
    """Send AGI command and read response."""
    wfile = agi_io["wfile"]
    rfile = agi_io.get("rfile")

    wfile.write(f"{command}\n".encode("utf-8"))
    wfile.flush()

    if rfile:
        response = rfile.readline().decode("utf-8", errors="ignore").strip()
        return response

    return ""


def _agi_speak(agi_io: Dict[str, Any], text: str) -> None:
    """
    Speak text via TTS or pre-recorded audio.

    For v1, uses STREAM FILE with a generic audio file.
    For v2, integrate with TTS engine (ElevenLabs, Cartesia, etc.)

    Args:
        agi_io: AGI IO wrapper
        text: Text to speak
    """
    # v1: Log text and play generic beep
    logger.info(f"[AGI:Speak] {text}")

    # TODO v2: Generate TTS audio file and use STREAM FILE
    # For now, just use VERBOSE to log the text
    _agi_send(agi_io, f'VERBOSE "{text}" 1')


def _agi_get_digit(agi_io: Dict[str, Any], timeout: int = 7) -> str:
    """
    Wait for DTMF digit.

    Args:
        agi_io: AGI IO wrapper
        timeout: Timeout in seconds

    Returns:
        Digit pressed (0-9, *, #) or empty string on timeout
    """
    timeout_ms = timeout * 1000
    response = _agi_send(agi_io, f"WAIT FOR DIGIT {timeout_ms}")

    # Response format: "200 result=<ascii_code>"
    # ascii_code = 0 means timeout
    # ascii_code = 48-57 for 0-9, 42 for *, 35 for #
    if "result=" in response:
        try:
            ascii_code = int(response.split("result=")[1].split()[0])
            if ascii_code == 0:
                return ""  # Timeout
            return chr(ascii_code)
        except (ValueError, IndexError):
            return ""

    return ""


def _agi_record(agi_io: Dict[str, Any], max_seconds: int = 60) -> str:
    """
    Record caller audio.

    Args:
        agi_io: AGI IO wrapper
        max_seconds: Maximum recording duration

    Returns:
        Path to recorded file
    """
    # Generate unique filename
    import time
    filename = f"/tmp/recording_{int(time.time())}"

    # RECORD FILE <filename> <format> <escape_digits> <timeout> [offset] [BEEP] [silence]
    # Format: wav
    # Escape: # (pound key ends recording)
    # Timeout: max_seconds * 1000
    _agi_send(agi_io, f"RECORD FILE {filename} wav # {max_seconds * 1000} BEEP")

    return f"{filename}.wav"


def _agi_hangup(agi_io: Dict[str, Any]) -> None:
    """Hangup the call."""
    _agi_send(agi_io, "HANGUP")
