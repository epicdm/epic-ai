"""
Route-to-Agent Runtime Adapter v1

Provides runtime glue between:
Asterisk inbound call → Inbound Call Guard → DID resolve → Agent OS snapshot → (TTS/DTMF/Record plan)

Features:
- Fail-closed call-time enforcement via inbound-call-guard
- Fetches Agent OS wizard snapshot for VoiceAgent configuration
- Returns action plans for Asterisk: speak + DTMF collect + record
- ASR-free (DTMF + recording only for v1)
- In-memory session state (can move to Redis later)
"""

import os
import time
import json
import hashlib
from typing import Any, Dict, Optional, Tuple

import requests


def _now_ms() -> int:
    """Current timestamp in milliseconds"""
    return int(time.time() * 1000)


def _sha1(s: str) -> str:
    """SHA-1 hash for generating request IDs"""
    return hashlib.sha1(s.encode("utf-8")).hexdigest()


def _norm_phone(s: Optional[str]) -> Optional[str]:
    """Normalize phone number to E.164 format"""
    if not s:
        return None
    s = s.strip()
    plus = "+" if s.startswith("+") else ""
    digits = "".join([c for c in s if c.isdigit()])
    return f"{plus}{digits}" if digits else None


class RouteToAgentAdapter:
    """
    v1 Runtime Adapter:
    - Call-time enforcement via inbound-call-guard
    - Fetches Agent OS wizard snapshot (config) for the resolved VoiceAgent.id
    - Returns a simple "next action plan" for Asterisk:
        speak + (optional) dtmf_collect + (optional) record
    """

    def __init__(self):
        self.app_base_url = (
            os.getenv("EPIC_APP_BASE_URL")
            or os.getenv("NEXT_PUBLIC_APP_URL")
            or os.getenv("APP_URL")
            or "http://localhost:3000"
        ).rstrip("/")

        self.internal_token = os.getenv("TELEPHONY_INTERNAL_TOKEN", "").strip() or None

        # In-memory call session state (fine for v1; can move to Redis later)
        # key: callSid
        self.sessions: Dict[str, Dict[str, Any]] = {}

    # -----------------------------
    # Upstream API calls (web app)
    # -----------------------------
    def _headers(self, request_id: str) -> Dict[str, str]:
        """Build headers for internal API calls"""
        h = {"content-type": "application/json", "x-request-id": request_id}
        if self.internal_token:
            h["x-epic-internal-token"] = self.internal_token
        return h

    def inbound_call_guard(self, did: str, from_number: Optional[str], call_sid: str, request_id: str) -> Dict[str, Any]:
        """Call the inbound-call-guard endpoint for call-time enforcement"""
        url = f"{self.app_base_url}/api/telephony/inbound-call-guard"
        params = {"did": did, "from": from_number or "", "callSid": call_sid}
        res = requests.get(url, params=params, headers=self._headers(request_id), timeout=10)
        res.raise_for_status()
        return res.json()

    def fetch_wizard_snapshot(self, voice_agent_id: str, request_id: str) -> Dict[str, Any]:
        """
        Fetch Agent OS wizard snapshot for the voice agent.
        This hits: GET /api/agent-os/agents/:id/wizard-snapshot
        """
        url = f"{self.app_base_url}/api/agent-os/agents/{voice_agent_id}/wizard-snapshot"
        res = requests.get(url, headers=self._headers(request_id), timeout=15)
        res.raise_for_status()
        return res.json()

    # -----------------------------
    # Decision logic (v1)
    # -----------------------------
    def _template_key(self, snapshot_envelope: Dict[str, Any]) -> Optional[str]:
        """Extract templateKey from wizard snapshot response"""
        # Wizard snapshot response includes templateKey at the top-level
        # { data: WizardSnapshot, templateKey: string|null, ... }
        return snapshot_envelope.get("templateKey") or None

    def _agent_display_name(self, snapshot_envelope: Dict[str, Any]) -> str:
        """Extract agent display name from snapshot"""
        data = snapshot_envelope.get("data") or {}
        role = (data.get("role_card") or {}) if isinstance(data, dict) else {}
        name = role.get("name") or "your assistant"
        return str(name)

    def _company_name(self, snapshot_envelope: Dict[str, Any]) -> str:
        """Extract company name from snapshot"""
        data = snapshot_envelope.get("data") or {}
        role = (data.get("role_card") or {}) if isinstance(data, dict) else {}
        company = role.get("company") or "our team"
        return str(company)

    def _initial_prompt_sales_qualifier(self, snapshot_envelope: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """
        ASR-free voice UX for sales_qualifier template:
        - speak greeting
        - collect DTMF choice (1 Sales / 2 Support / 9 Leave message)
        """
        company = self._company_name(snapshot_envelope)
        agent_name = self._agent_display_name(snapshot_envelope)

        tts = (
            f"Hi! Thanks for calling {company}. "
            f"You're speaking with {agent_name}. "
            "Press 1 for Sales. Press 2 for Support. Press 9 to leave a message."
        )

        dtmf = {
            "mode": "collect",
            "max_digits": 1,
            "timeout_ms": 8000,
            "retries": 1,
            "valid_digits": ["1", "2", "9"],
            "prompt_on_retry_tts": "Sorry, I didn't get that. Press 1 for Sales, 2 for Support, or 9 to leave a message.",
        }

        plan = {"action": "speak_and_collect_dtmf", "tts": tts, "dtmf": dtmf}
        return tts, plan

    def _initial_prompt_default(self, snapshot_envelope: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """
        Default ASR-free voice UX:
        - speak greeting
        - collect DTMF (9 to leave message)
        """
        company = self._company_name(snapshot_envelope)
        agent_name = self._agent_display_name(snapshot_envelope)
        tts = (
            f"Hi! Thanks for calling {company}. "
            f"This is {agent_name}. "
            "Press 9 to leave a message."
        )
        dtmf = {
            "mode": "collect",
            "max_digits": 1,
            "timeout_ms": 8000,
            "retries": 0,
            "valid_digits": ["9"],
            "prompt_on_retry_tts": "Press 9 to leave a message.",
        }
        plan = {"action": "speak_and_collect_dtmf", "tts": tts, "dtmf": dtmf}
        return tts, plan

    def build_initial_plan(self, snapshot_envelope: Dict[str, Any]) -> Dict[str, Any]:
        """Build initial action plan based on agent template"""
        template_key = (self._template_key(snapshot_envelope) or "").strip().lower()

        if template_key == "sales_qualifier":
            _, plan = self._initial_prompt_sales_qualifier(snapshot_envelope)
            return plan

        # fallback
        _, plan = self._initial_prompt_default(snapshot_envelope)
        return plan

    def build_followup_plan(self, call_sid: str, digit: str, request_id: str) -> Dict[str, Any]:
        """
        v1 follow-up after DTMF selection.
        - 1 -> Sales flow placeholder (can later start LiveKit session or book demo flow)
        - 2 -> Support flow placeholder
        - 9 -> Record voicemail
        """
        sess = self.sessions.get(call_sid) or {}
        company = sess.get("companyName") or "our team"

        digit = (digit or "").strip()

        if digit == "9":
            return {
                "action": "record_message",
                "tts": f"Please leave your message after the beep. When you're done, you can hang up.",
                "record": {
                    "format": "wav",
                    "max_seconds": 120,
                    "beep": True,
                },
            }

        if digit == "1":
            # v1: no ASR, so we can either:
            # - handoff to a live person
            # - collect via DTMF (zip code, budget, etc.)
            # - or record a short sales request
            return {
                "action": "speak_and_collect_dtmf",
                "tts": f"Sales. Press 1 if you want a call back today. Press 2 for tomorrow. Press 9 to leave a message.",
                "dtmf": {
                    "mode": "collect",
                    "max_digits": 1,
                    "timeout_ms": 8000,
                    "retries": 1,
                    "valid_digits": ["1", "2", "9"],
                    "prompt_on_retry_tts": "Press 1 for today, 2 for tomorrow, or 9 to leave a message.",
                },
            }

        if digit == "2":
            return {
                "action": "record_message",
                "tts": f"Support. Please describe the issue after the beep. When you're done, you can hang up.",
                "record": {
                    "format": "wav",
                    "max_seconds": 180,
                    "beep": True,
                },
            }

        # unknown digit
        return {
            "action": "speak_and_collect_dtmf",
            "tts": f"Sorry, I didn't get that. Press 1 for Sales, 2 for Support, or 9 to leave a message.",
            "dtmf": {
                "mode": "collect",
                "max_digits": 1,
                "timeout_ms": 8000,
                "retries": 1,
                "valid_digits": ["1", "2", "9"],
                "prompt_on_retry_tts": "Press 1 for Sales, 2 for Support, or 9 to leave a message.",
            },
        }

    # -----------------------------
    # Public entry points
    # -----------------------------
    def route_to_agent(self, did_raw: str, from_raw: Optional[str], call_sid: str) -> Dict[str, Any]:
        """
        Main entry point for inbound call routing.

        1. Check inbound-call-guard (fail-closed enforcement)
        2. Fetch wizard snapshot for resolved VoiceAgent
        3. Build initial action plan based on template
        4. Store session state

        Returns action plan for Asterisk.
        """
        request_id = f"rta_{_sha1(call_sid)[:10]}_{_now_ms()}"

        did = _norm_phone(did_raw)
        from_number = _norm_phone(from_raw)

        if not did:
            return {
                "ok": False,
                "error": {"code": "DID_MISSING", "message": "Missing/invalid DID"},
                "request_id": request_id,
            }

        # 1) Gate - call inbound-call-guard
        try:
            guard = self.inbound_call_guard(did, from_number, call_sid, request_id)
        except Exception as e:
            return {
                "ok": False,
                "action": "reject",
                "tts": "Sorry, we are unable to route your call at the moment. Please try again later.",
                "error": {"code": "GUARD_ERROR", "message": str(e)},
                "request_id": request_id,
            }

        if not (guard.get("data") or {}).get("allow"):
            reason = (guard.get("data") or {}).get("reason_code") or "BLOCKED"
            detail = (guard.get("data") or {}).get("reason_detail") or "Call not eligible"
            return {
                "ok": False,
                "action": "reject",
                "tts": "Sorry, this line is not available right now.",
                "blocked": {"reason_code": reason, "reason_detail": detail},
                "request_id": request_id,
            }

        voice_agent_id = (guard.get("data") or {}).get("voiceAgentId")
        if not voice_agent_id:
            return {
                "ok": False,
                "action": "reject",
                "tts": "Sorry, we are unable to route your call right now.",
                "error": {"code": "NO_AGENT", "message": "Guard allowed but no voiceAgentId"},
                "request_id": request_id,
            }

        # 2) Load snapshot
        try:
            snapshot = self.fetch_wizard_snapshot(voice_agent_id, request_id)
        except Exception as e:
            return {
                "ok": False,
                "action": "reject",
                "tts": "Sorry, the assistant is not ready yet. Please try again later.",
                "error": {"code": "SNAPSHOT_ERROR", "message": str(e)},
                "request_id": request_id,
            }

        # 3) Build initial plan
        plan = self.build_initial_plan(snapshot)

        # Store minimal session context
        self.sessions[call_sid] = {
            "voiceAgentId": voice_agent_id,
            "companyId": (guard.get("data") or {}).get("companyId"),
            "companyName": self._company_name(snapshot),
            "agentName": self._agent_display_name(snapshot),
            "templateKey": self._template_key(snapshot),
            "did": did,
            "from": from_number,
            "startedAt": _now_ms(),
        }

        return {
            "ok": True,
            "action": plan.get("action"),
            "tts": plan.get("tts"),
            "dtmf": plan.get("dtmf"),
            "record": plan.get("record"),
            "voiceAgentId": voice_agent_id,
            "request_id": request_id,
        }

    def continue_call(self, call_sid: str, digit: Optional[str] = None, recording_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Continue call after DTMF input or recording completion.

        Args:
            call_sid: Unique call identifier
            digit: DTMF digit pressed (if any)
            recording_url: URL of recorded message (if any)

        Returns action plan for next step.
        """
        request_id = f"cont_{_sha1(call_sid)[:10]}_{_now_ms()}"

        if call_sid not in self.sessions:
            return {
                "ok": False,
                "action": "reject",
                "tts": "Session not found. Please call back.",
                "error": {"code": "SESSION_NOT_FOUND", "message": "No session for callSid"},
                "request_id": request_id,
            }

        # If recording completed, acknowledge and end (v1)
        if recording_url:
            return {
                "ok": True,
                "action": "speak_and_end",
                "tts": "Thanks. Your message has been saved. Goodbye.",
                "request_id": request_id,
            }

        # DTMF follow-up
        plan = self.build_followup_plan(call_sid, digit or "", request_id)
        return {
            "ok": True,
            "action": plan.get("action"),
            "tts": plan.get("tts"),
            "dtmf": plan.get("dtmf"),
            "record": plan.get("record"),
            "request_id": request_id,
        }
