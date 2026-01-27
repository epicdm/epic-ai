"""
Tool Node Runtime v1

Executes tools safely during flow execution with:
- Strict allowlist (TOOL_ADAPTERS)
- Enabled check (tool_config.enabled_tools)
- Simple rate limits (session-level)
- Minimal audit trail

Tool Node Example:
{
  "type": "tool",
  "tool_key": "crm.lookupContact",
  "input": {
    "phone": "{{session.caller}}"
  },
  "save_output_as": "tool.crm.contact",
  "on_success": "support_menu",
  "on_error": "fallback_no_record"
}
"""

from typing import Dict, Any, Callable
import time
import logging

logger = logging.getLogger(__name__)

# Import Magnus adapter
try:
    from adapters.magnus_adapter import MagnusAdapter
    MAGNUS_AVAILABLE = True
except ImportError:
    logger.warning("Magnus adapter not available")
    MAGNUS_AVAILABLE = False
    MagnusAdapter = None

# Import callback tool
try:
    from tools.callback_tool import enqueue_callback
    CALLBACK_TOOL_AVAILABLE = True
except ImportError:
    logger.warning("Callback tool not available")
    CALLBACK_TOOL_AVAILABLE = False
    enqueue_callback = None

# Initialize Magnus adapter singleton
_magnus = None

def _get_magnus() -> MagnusAdapter:
    """Get or create Magnus adapter instance."""
    global _magnus
    if _magnus is None and MAGNUS_AVAILABLE:
        _magnus = MagnusAdapter()
    return _magnus


# ============================================================================
# Tool Adapters (v1 in-process stubs)
# ============================================================================

def crm_lookup_contact(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    CRM contact lookup stub.

    Args:
        args: {"phone": "+1767..."}

    Returns:
        Contact data or not found
    """
    phone = args.get("phone")
    logger.info(f"[Tool:CRM] Looking up contact for {phone}")

    # v1 stub - replace with real CRM integration
    # Example: Salesforce, HubSpot, custom CRM
    if phone and phone.startswith("+1767"):
        return {
            "found": True,
            "id": "contact_123",
            "name": "John Doe",
            "phone": phone,
            "email": "john.doe@example.com",
            "company": "Acme Corp",
            "status": "active"
        }
    else:
        return {
            "found": False,
            "phone": phone
        }


def calendar_create_booking(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calendar booking stub.

    Args:
        args: {"slot": "2026-01-27T10:00:00Z", "duration": 30}

    Returns:
        Booking confirmation
    """
    slot = args.get("slot")
    duration = args.get("duration", 30)

    logger.info(f"[Tool:Calendar] Creating booking for {slot} ({duration}min)")

    # v1 stub - replace with real calendar integration
    # Example: Calendly, Google Calendar, custom booking system
    return {
        "bookingId": f"bk_{int(time.time())}",
        "status": "created",
        "slot": slot,
        "duration": duration,
        "confirmationUrl": "https://example.com/booking/confirm/bk_123"
    }


def sms_send_message(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    SMS send stub.

    Args:
        args: {"to": "+1767...", "message": "Hello"}

    Returns:
        Send confirmation
    """
    to = args.get("to")
    message = args.get("message")

    logger.info(f"[Tool:SMS] Sending message to {to}: {message[:50]}...")

    # v1 stub - replace with real SMS integration
    # Example: Twilio, Vonage, custom SMS gateway
    return {
        "messageId": f"msg_{int(time.time())}",
        "status": "sent",
        "to": to,
        "message": message
    }


def knowledge_base_query(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Knowledge base query stub.

    Args:
        args: {"query": "What are your hours?"}

    Returns:
        Knowledge base result
    """
    query = args.get("query")

    logger.info(f"[Tool:KB] Querying knowledge base: {query}")

    # v1 stub - replace with real knowledge base
    # Example: Elasticsearch, vector DB, custom KB
    return {
        "found": True,
        "answer": "We are open Monday-Friday 9am-5pm EST.",
        "confidence": 0.95,
        "sources": ["FAQ", "Hours Page"]
    }


# ============================================================================
# Magnus CRM/Billing Tool Adapters (v1)
# ============================================================================

def magnus_lookup_customer(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Magnus CRM customer lookup.

    Args:
        args: {"phone": "+1767..."} or {"caller": "+1767..."}

    Returns:
        Customer data from Magnus CRM
    """
    phone = args.get("phone") or args.get("caller") or ""
    logger.info(f"[Tool:Magnus] Looking up customer for {phone}")

    if not MAGNUS_AVAILABLE:
        return {
            "found": False,
            "phone": phone,
            "error": "Magnus adapter not available"
        }

    try:
        return _get_magnus().lookup_customer_by_phone(phone)
    except Exception as e:
        logger.error(f"[Tool:Magnus] Lookup failed: {e}")
        return {
            "found": False,
            "phone": phone,
            "error": str(e)
        }


def magnus_create_lead(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Magnus CRM lead creation.

    Args:
        args: {
            "phone": "+1767...",
            "name": "...",
            "email": "...",
            "source": "voice_agent",
            "notes": "...",
            "tags": [...]
        }

    Returns:
        Lead creation result
    """
    payload = {
        "phone": args.get("phone") or args.get("caller"),
        "name": args.get("name"),
        "email": args.get("email"),
        "source": args.get("source") or "voice_agent",
        "notes": args.get("notes"),
        "tags": args.get("tags") or [],
    }

    logger.info(f"[Tool:Magnus] Creating lead for {payload['phone']}")

    if not MAGNUS_AVAILABLE:
        return {
            "status": "error",
            "leadId": None,
            "error": "Magnus adapter not available"
        }

    try:
        return _get_magnus().create_lead(payload)
    except Exception as e:
        logger.error(f"[Tool:Magnus] Lead creation failed: {e}")
        return {
            "status": "error",
            "leadId": None,
            "error": str(e)
        }


def magnus_create_call_log(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Magnus CRM call log creation.

    Args:
        args: {
            "phone": "+1767...",
            "did": "+1767...",
            "voiceAgentId": "...",
            "sessionId": "...",
            "callId": "...",
            "outcome": "completed",
            "notes": "..."
        }

    Returns:
        Call log creation result
    """
    payload = {
        "phone": args.get("phone") or args.get("caller"),
        "did": args.get("did"),
        "voiceAgentId": args.get("voiceAgentId"),
        "sessionId": args.get("sessionId"),
        "callId": args.get("callId"),
        "outcome": args.get("outcome"),
        "notes": args.get("notes"),
    }

    logger.info(f"[Tool:Magnus] Creating call log for {payload['phone']}")

    if not MAGNUS_AVAILABLE:
        return {
            "status": "error",
            "callLogId": None,
            "error": "Magnus adapter not available"
        }

    try:
        return _get_magnus().create_call_log(payload)
    except Exception as e:
        logger.error(f"[Tool:Magnus] Call log creation failed: {e}")
        return {
            "status": "error",
            "callLogId": None,
            "error": str(e)
        }


# ============================================================================
# Tool Adapter Registry
# ============================================================================

TOOL_ADAPTERS: Dict[str, Callable[[Dict[str, Any]], Dict[str, Any]]] = {
    # Generic stubs (v1)
    "crm.lookupContact": crm_lookup_contact,
    "calendar.createBooking": calendar_create_booking,
    "sms.sendMessage": sms_send_message,
    "kb.query": knowledge_base_query,

    # Magnus CRM/Billing tools (v1)
    "magnus.lookupCustomer": magnus_lookup_customer,
    "magnus.createLead": magnus_create_lead,
    "magnus.createCallLog": magnus_create_call_log,

    # Callback scheduling tool (v1)
    "callback.enqueue": enqueue_callback if CALLBACK_TOOL_AVAILABLE else lambda args: {
        "ok": False,
        "error": "Callback tool not available"
    },
}


# ============================================================================
# Tool Execution Logic
# ============================================================================

def is_tool_enabled(tool_config: Dict[str, Any], tool_key: str) -> bool:
    """
    Check if tool is enabled in agent config.

    Args:
        tool_config: Agent tool configuration
        tool_key: Tool identifier (e.g., "crm.lookupContact")

    Returns:
        True if tool is enabled
    """
    enabled = (tool_config or {}).get("enabled_tools") or []

    # enabled_tools is an array of objects (id/name/enabled)
    for t in enabled:
        if not isinstance(t, dict):
            continue

        # Check by id or name
        if (t.get("id") == tool_key or t.get("name") == tool_key):
            # Check enabled flag (defaults to True if not present)
            return t.get("enabled", True)

    # If not in list, not enabled
    return False


def session_rate_limit(session: Dict[str, Any], tool_key: str) -> bool:
    """
    v1 simple rate limit per session.

    Limits:
    - Max 3 tool calls per session total
    - Max 2 calls per tool_key

    Args:
        session: Session data
        tool_key: Tool identifier

    Returns:
        True if within rate limits
    """
    usage = session.setdefault("tool_usage", {"total": 0, "by_tool": {}})

    # Check total limit
    if usage["total"] >= 3:
        logger.warning(f"[Tool:RateLimit] Session exceeded total tool limit (3)")
        return False

    # Check per-tool limit
    by_tool = usage["by_tool"].setdefault(tool_key, 0)
    if by_tool >= 2:
        logger.warning(f"[Tool:RateLimit] Session exceeded limit for {tool_key} (2)")
        return False

    # Increment counters
    usage["total"] += 1
    usage["by_tool"][tool_key] = by_tool + 1

    return True


def execute_tool_v1(
    session: Dict[str, Any],
    tool_config: Dict[str, Any],
    tool_key: str,
    args: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Execute tool safely with allowlist, enabled check, and rate limits.

    Args:
        session: Session data
        tool_config: Agent tool configuration
        tool_key: Tool identifier (e.g., "crm.lookupContact")
        args: Tool arguments (already rendered from templates)

    Returns:
        {
            "ok": bool,
            "data": Any,  # if ok=True
            "error": str,  # if ok=False
            "duration_ms": int,
            "warnings": List[str]
        }
    """
    # Check allowlist
    if tool_key not in TOOL_ADAPTERS:
        logger.error(f"[Tool:Execute] TOOL_NOT_SUPPORTED: {tool_key}")
        return {
            "ok": False,
            "error": f"TOOL_NOT_SUPPORTED: {tool_key}",
            "warnings": []
        }

    # Check if tool is enabled for this agent
    if not is_tool_enabled(tool_config, tool_key):
        logger.warning(f"[Tool:Execute] TOOL_NOT_ENABLED: {tool_key}")
        return {
            "ok": False,
            "error": f"TOOL_NOT_ENABLED: {tool_key}",
            "warnings": []
        }

    # Check rate limits
    if not session_rate_limit(session, tool_key):
        logger.warning(f"[Tool:Execute] TOOL_RATE_LIMIT: {tool_key}")
        return {
            "ok": False,
            "error": f"TOOL_RATE_LIMIT: {tool_key}",
            "warnings": []
        }

    # Execute tool
    try:
        t0 = time.time()
        logger.info(f"[Tool:Execute] Executing {tool_key} with args: {args}")

        result = TOOL_ADAPTERS[tool_key](args or {})

        dt = int((time.time() - t0) * 1000)

        logger.info(f"[Tool:Execute] Success: {tool_key} completed in {dt}ms")

        return {
            "ok": True,
            "data": result,
            "duration_ms": dt,
            "warnings": []
        }

    except Exception as e:
        logger.error(f"[Tool:Execute] TOOL_EXEC_ERROR: {tool_key} - {str(e)}", exc_info=True)
        return {
            "ok": False,
            "error": f"TOOL_EXEC_ERROR: {str(e)}",
            "warnings": []
        }
