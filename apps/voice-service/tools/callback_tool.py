"""
Callback Tool Adapter v1

Schedules callbacks via BullMQ by calling the Epic AI web app API.
Used by Tool Node Runtime to enqueue callback jobs.

Tool: callback.enqueue
Arguments:
  - voiceAgentId (required): Voice agent ID
  - sessionId (required): Session ID
  - caller (required): Caller phone number
  - callbackTimeIso (optional): ISO timestamp for callback
  - callbackWindow (optional): Window key (asap_15min, today, etc.)
  - callbackLabel (optional): Human-readable label
  - answers (optional): Dict of question answers
  - leadId (optional): Created lead ID

Returns:
  - ok: true/false
  - jobId: BullMQ job ID (if ok=true)
  - scheduledFor: ISO timestamp (if ok=true)
  - error: Error message (if ok=false)
"""

import os
import requests
from typing import Dict, Any

# Epic AI web app base URL
EPIC_WEB_BASE_URL = os.getenv("EPIC_WEB_BASE_URL", "http://localhost:3000")

# API key for authentication (optional)
EPIC_RUNTIME_API_KEY = os.getenv("EPIC_RUNTIME_API_KEY", "")

# Timeout for API calls (seconds)
CALLBACK_ENQUEUE_TIMEOUT = float(os.getenv("CALLBACK_ENQUEUE_TIMEOUT", "5.0"))


def enqueue_callback(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enqueues a callback job via the Epic AI web app API.

    Args:
        args: Tool arguments containing callback details

    Returns:
        Dict with ok, jobId, scheduledFor, or error
    """
    # Required fields
    voice_agent_id = args.get("voiceAgentId")
    session_id = args.get("sessionId")
    caller = args.get("caller")

    if not voice_agent_id:
        return {"ok": False, "error": "Missing required field: voiceAgentId"}

    if not session_id:
        return {"ok": False, "error": "Missing required field: sessionId"}

    if not caller:
        return {"ok": False, "error": "Missing required field: caller"}

    # Build payload
    payload: Dict[str, Any] = {
        "voiceAgentId": voice_agent_id,
        "sessionId": session_id,
        "caller": caller,
    }

    # Optional fields
    if args.get("callbackTimeIso"):
        payload["callbackTimeIso"] = args["callbackTimeIso"]

    if args.get("callbackWindow"):
        payload["callbackWindow"] = args["callbackWindow"]

    if args.get("callbackLabel"):
        payload["callbackLabel"] = args["callbackLabel"]

    if args.get("callId"):
        payload["callId"] = args["callId"]

    if args.get("did"):
        payload["did"] = args["did"]

    if args.get("timezone"):
        payload["timezone"] = args["timezone"]

    if args.get("answers"):
        payload["answers"] = args["answers"]

    if args.get("leadId"):
        payload["leadId"] = args["leadId"]

    # Prepare headers
    headers = {
        "Content-Type": "application/json",
    }

    if EPIC_RUNTIME_API_KEY:
        headers["Authorization"] = f"Bearer {EPIC_RUNTIME_API_KEY}"

    # Call API
    url = f"{EPIC_WEB_BASE_URL}/api/telephony/callback/enqueue"

    try:
        response = requests.post(
            url,
            json=payload,
            headers=headers,
            timeout=CALLBACK_ENQUEUE_TIMEOUT
        )

        if response.status_code == 200:
            result = response.json()
            data = result.get("data", {})
            warnings = result.get("warnings", [])

            return {
                "ok": True,
                "jobId": data.get("jobId"),
                "scheduledInMs": data.get("scheduledInMs"),
                "warnings": warnings,
            }
        else:
            error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
            warnings = error_data.get("warnings", [])
            error_msg = warnings[0].get("message") if warnings else f"HTTP {response.status_code}"

            return {
                "ok": False,
                "error": error_msg,
                "warnings": warnings,
            }

    except requests.exceptions.Timeout:
        return {
            "ok": False,
            "error": "API request timeout",
        }

    except requests.exceptions.RequestException as e:
        return {
            "ok": False,
            "error": f"API request failed: {str(e)}",
        }

    except Exception as e:
        return {
            "ok": False,
            "error": f"Unexpected error: {str(e)}",
        }
