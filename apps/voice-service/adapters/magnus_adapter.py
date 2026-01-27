"""
Magnus Tool Adapter v1

Thin adapter around the existing Magnus SDK integration.
Provides 3 tool functions for Tool Node Runtime v1:
- magnus.lookupCustomer
- magnus.createLead
- magnus.createCallLog
"""

import os
import time
from typing import Any, Dict, Optional

MAGNUS_TIMEOUT_SECS = int(os.getenv("MAGNUS_TIMEOUT_SECS", "8"))

def _norm_phone(phone: Optional[str]) -> Optional[str]:
    """Normalize phone number to keep only + and digits."""
    if not phone:
        return None
    p = phone.strip()
    # keep + and digits only
    out = []
    for ch in p:
        if ch.isdigit() or ch == "+":
            out.append(ch)
    return "".join(out) or None

def _now_iso() -> str:
    """Return current timestamp in ISO format."""
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

class MagnusAdapter:
    """
    Thin adapter around your existing magnus SDK integration.

    REQUIRED: implement 3 underlying calls in ONE place:
      - lookup_customer_by_phone(phone)
      - create_lead(payload)
      - create_call_log(payload)

    Everything else stays stable.
    """

    def __init__(self):
        # If your magnus_sdk.py already reads env internally, you can remove these.
        self.base_url = os.getenv("MAGNUS_BASE_URL")
        self.api_key = os.getenv("MAGNUS_API_KEY")
        self.api_secret = os.getenv("MAGNUS_API_SECRET")

        # Import your existing SDK lazily so boot doesn't fail in tests
        try:
            from magnus_sdk import MagnusSDK  # adjust if needed
            self.sdk = MagnusSDK(
                base_url=self.base_url,
                api_key=self.api_key,
                api_secret=self.api_secret,
                timeout_secs=MAGNUS_TIMEOUT_SECS,
            )
        except ImportError:
            # Fallback to stub mode if magnus_sdk doesn't exist yet
            self.sdk = None

    # --------------------------
    # REQUIRED SDK call surfaces
    # --------------------------
    def lookup_customer_by_phone(self, phone: str) -> Dict[str, Any]:
        """
        Return:
          { found: bool, customer?: {...}, raw?: {...} }
        """
        phone = _norm_phone(phone) or phone

        # Stub mode if SDK not available
        if self.sdk is None:
            return {
                "found": False,
                "customer": None,
                "phone": phone,
                "raw": {"error": "Magnus SDK not configured"},
            }

        # >>> EDIT HERE if your SDK uses different call names
        raw = self.sdk.lookup_customer(phone=phone)
        # <<<

        customer = None
        found = False

        if raw and isinstance(raw, dict):
            # common normalization patterns; adjust if needed
            # raw might be {data:[...]} or {customer:{...}} etc.
            if "customer" in raw and isinstance(raw["customer"], dict):
                customer = raw["customer"]
                found = True
            elif "data" in raw and isinstance(raw["data"], list) and len(raw["data"]) > 0:
                customer = raw["data"][0]
                found = True
            elif "result" in raw and raw["result"]:
                customer = raw["result"]
                found = True

        return {
            "found": found,
            "customer": customer,
            "phone": phone,
            "raw": raw,
        }

    def create_lead(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        payload expects:
          { phone, name?, email?, source?, notes?, tags? }
        Returns:
          { leadId?, status, raw }
        """
        # Stub mode if SDK not available
        if self.sdk is None:
            return {
                "status": "submitted",
                "leadId": None,
                "raw": {"error": "Magnus SDK not configured"},
            }

        # >>> EDIT HERE if your SDK uses different call names
        raw = self.sdk.create_lead(payload=payload)
        # <<<

        lead_id = None
        if isinstance(raw, dict):
            lead_id = raw.get("id") or raw.get("leadId") or raw.get("lead_id")

        return {
            "status": "created" if lead_id else "submitted",
            "leadId": lead_id,
            "raw": raw,
        }

    def create_call_log(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        payload expects:
          { phone, did?, voiceAgentId?, sessionId?, callId?, outcome?, notes? }
        """
        payload = dict(payload or {})
        payload.setdefault("timestamp", _now_iso())

        # Stub mode if SDK not available
        if self.sdk is None:
            return {
                "status": "submitted",
                "callLogId": None,
                "raw": {"error": "Magnus SDK not configured"},
            }

        # >>> EDIT HERE if your SDK uses different call names
        raw = self.sdk.create_call_log(payload=payload)
        # <<<

        log_id = None
        if isinstance(raw, dict):
            log_id = raw.get("id") or raw.get("logId") or raw.get("callLogId")

        return {
            "status": "created" if log_id else "submitted",
            "callLogId": log_id,
            "raw": raw,
        }
