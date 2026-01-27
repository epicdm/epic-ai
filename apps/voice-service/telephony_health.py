"""
Telephony Health Check Client

Calls the Epic AI web app /api/telephony/health-check endpoint to validate
that a DID is properly configured for receiving calls. This is the foundation
of the fail-closed Inbound Call Guard.

Usage:
    from telephony_health import TelephonyHealthClient, TelephonyHealthResult

    client = TelephonyHealthClient()
    result = client.check("+14155551234")

    if result.ok:
        # DID is ready, agent is live
        print(f"Routing to agent: {result.agent_id}")
    else:
        # Block the call
        print(f"Gaps: {result.gaps}")
"""

import os
import time
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


@dataclass
class TelephonyHealthResult:
    """
    Result of a telephony health check.

    Attributes:
        ok: True if all checks passed and agent is ready for calls
        agent_id: The resolved agent ID (if found)
        agent_name: Agent display name
        agent_type: Either "voice_agent" (legacy) or "agent_os" (new)
        agent_status: Current agent status (e.g., TESTING, PUBLISHED)
        checks: Individual check results from the health-check endpoint
        gaps: List of actionable fix steps if not ok
        warnings: Non-blocking issues to log
        raw: Full API response for debugging
    """
    ok: bool = False
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
    agent_type: Optional[str] = None
    agent_status: Optional[str] = None
    checks: Dict[str, bool] = field(default_factory=dict)
    gaps: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    raw: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DidCheckResult:
    """
    Result of a DID resolution check (Inbound Call Guard v1).

    Attributes:
        ok: True if call is allowed (DID mapped, agent live-eligible)
        agent_id: The resolved agent ID (if allowed)
        reason_code: Reason code if not allowed (e.g., DID_NOT_MAPPED, AGENT_NOT_LIVE)
        message: Human-readable fallback message for TTS
        deployment_state: Deployment state (draft, assembling, ready, published, archived)
        raw: Full API response for debugging
    """
    ok: bool = False
    agent_id: Optional[str] = None
    reason_code: Optional[str] = None
    message: Optional[str] = None
    deployment_state: Optional[str] = None
    raw: Dict[str, Any] = field(default_factory=dict)


class TelephonyHealthError(Exception):
    """Base exception for telephony health check errors."""
    pass


class TelephonyHealthClient:
    """
    Client for the /api/telephony/health-check endpoint.

    Implements retry logic and timeout handling for reliable health checks.
    Designed for synchronous use (from Flask/sync code paths).
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout_s: Optional[float] = None,
        retries: Optional[int] = None,
    ):
        """
        Initialize the health check client.

        Args:
            base_url: Base URL of the Epic AI web app.
                     Default: EPIC_WEB_BASE_URL env or http://localhost:3000
            api_key: Optional API key for authentication.
                     Default: EPIC_RUNTIME_API_KEY env
            timeout_s: HTTP request timeout in seconds.
                       Default: EPIC_HEALTHCHECK_TIMEOUT_S env or 3.0
            retries: Number of retry attempts on failure.
                     Default: EPIC_HEALTHCHECK_RETRIES env or 1
        """
        self.base_url = (
            base_url
            or os.getenv("EPIC_WEB_BASE_URL")
            or os.getenv("EPIC_AI_API_URL")
            or os.getenv("WEB_API_URL")
            or "http://localhost:3000"
        ).rstrip("/")

        self.api_key = api_key or os.getenv("EPIC_RUNTIME_API_KEY", "").strip()

        self.timeout_s = timeout_s or float(
            os.getenv("EPIC_HEALTHCHECK_TIMEOUT_S", "3.0")
        )

        self.retries = retries or int(
            os.getenv("EPIC_HEALTHCHECK_RETRIES", "1")
        )

        self.debug = os.getenv("EPIC_HEALTHCHECK_DEBUG", "false").lower() == "true"

        logger.info(
            f"[TelephonyHealth] Initialized: base_url={self.base_url}, "
            f"timeout={self.timeout_s}s, retries={self.retries}"
        )

    def check(self, did: str) -> TelephonyHealthResult:
        """
        Check if a DID is ready for inbound calls.

        This is a synchronous method for use in Flask/sync contexts.
        Returns a fail-closed result on any error (ok=False).

        Args:
            did: The phone number (DID) to check, in any format.

        Returns:
            TelephonyHealthResult indicating whether the DID is ready.
        """
        if not did:
            logger.warning("[TelephonyHealth] Empty DID provided")
            return TelephonyHealthResult(
                ok=False,
                gaps=["No DID provided to health check"],
            )

        normalized = self._normalize_phone(did)
        endpoint = f"{self.base_url}/api/telephony/health-check"

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["x-api-key"] = self.api_key

        last_error: Optional[Exception] = None

        for attempt in range(self.retries + 1):
            try:
                start_time = time.monotonic()

                with httpx.Client(timeout=self.timeout_s) as client:
                    response = client.get(
                        endpoint,
                        params={"did": normalized},
                        headers=headers,
                    )

                elapsed_ms = int((time.monotonic() - start_time) * 1000)

                if self.debug:
                    logger.debug(
                        f"[TelephonyHealth] Response in {elapsed_ms}ms: "
                        f"status={response.status_code}"
                    )

                if response.status_code != 200:
                    error_data = response.json() if response.content else {}
                    error_msg = error_data.get("error", {}).get(
                        "message", f"HTTP {response.status_code}"
                    )
                    logger.warning(
                        f"[TelephonyHealth] Health check failed for {did}: {error_msg}"
                    )
                    return TelephonyHealthResult(
                        ok=False,
                        gaps=[f"Health check API error: {error_msg}"],
                        raw=error_data,
                    )

                return self._parse_response(did, response.json())

            except httpx.TimeoutException as e:
                last_error = e
                logger.warning(
                    f"[TelephonyHealth] Timeout checking {did} "
                    f"(attempt {attempt + 1}/{self.retries + 1})"
                )

            except httpx.RequestError as e:
                last_error = e
                logger.warning(
                    f"[TelephonyHealth] Request error checking {did}: {e} "
                    f"(attempt {attempt + 1}/{self.retries + 1})"
                )

            except Exception as e:
                last_error = e
                logger.error(
                    f"[TelephonyHealth] Unexpected error checking {did}: {e}"
                )
                break

        # All retries exhausted or unexpected error - fail closed
        logger.error(
            f"[TelephonyHealth] All retries failed for {did}: {last_error}"
        )
        return TelephonyHealthResult(
            ok=False,
            gaps=["Health check service unavailable"],
            warnings=[f"Error: {last_error}"],
        )

    def _parse_response(
        self, did: str, data: Dict[str, Any]
    ) -> TelephonyHealthResult:
        """Parse the health-check API response into a TelephonyHealthResult."""
        result_data = data.get("data")

        if not result_data:
            return TelephonyHealthResult(
                ok=False,
                gaps=["Empty response from health check"],
                raw=data,
            )

        status = result_data.get("status", "fail")
        checks = result_data.get("checks", {})
        agent_info = result_data.get("agent", {})
        fix_steps = result_data.get("fixSteps", [])

        ok = status == "pass"

        result = TelephonyHealthResult(
            ok=ok,
            agent_id=agent_info.get("id"),
            agent_name=agent_info.get("name"),
            agent_type=result_data.get("agentType"),
            agent_status=agent_info.get("status"),
            checks=checks,
            gaps=fix_steps if not ok else [],
            raw=data,
        )

        if ok:
            logger.info(
                f"[TelephonyHealth] DID {did} -> PASS "
                f"(agent={result.agent_id}, status={result.agent_status})"
            )
        else:
            logger.warning(
                f"[TelephonyHealth] DID {did} -> FAIL: {fix_steps}"
            )

        return result

    def health_check(self) -> bool:
        """
        Check system health (database connectivity).

        This is a simple health check without DID validation.
        Returns True if system is healthy, False otherwise.

        Returns:
            bool: True if system is healthy, False if fail-closed.
        """
        endpoint = f"{self.base_url}/api/telephony/health-check"

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["x-api-key"] = self.api_key

        try:
            with httpx.Client(timeout=self.timeout_s) as client:
                response = client.get(endpoint, headers=headers)

                if response.status_code != 200:
                    logger.warning(
                        f"[TelephonyHealth] System health check failed: HTTP {response.status_code}"
                    )
                    return False

                data = response.json()
                health_data = data.get("data", {})
                is_healthy = health_data.get("ok", False)

                if self.debug:
                    logger.debug(
                        f"[TelephonyHealth] System health: ok={is_healthy}, checks={health_data.get('checks', {})}"
                    )

                return is_healthy

        except Exception as e:
            logger.error(f"[TelephonyHealth] Health check error: {e}")
            return False

    def resolve_did(self, did: str, call_id: Optional[str] = None) -> DidCheckResult:
        """
        Resolve a DID to an agent and check if call is allowed (Inbound Call Guard v1).

        This enforces:
        - DID must be mapped to an agent (PhoneMapping table)
        - Agent must have live-eligible status (PUBLISHED or READY)
        - Fail-closed: reject if anything is ambiguous

        Args:
            did: The phone number (DID) to resolve.
            call_id: Optional call ID for logging/tracing.

        Returns:
            DidCheckResult indicating whether call is allowed.
        """
        if not did:
            logger.warning("[TelephonyHealth] Empty DID provided to resolve_did")
            return DidCheckResult(
                ok=False,
                reason_code="UNKNOWN",
                message="No DID provided",
            )

        normalized = self._normalize_phone(did)
        endpoint = f"{self.base_url}/api/telephony/resolve-did"

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["x-api-key"] = self.api_key

        payload = {"did": normalized}
        if call_id:
            payload["callId"] = call_id

        try:
            start_time = time.monotonic()

            with httpx.Client(timeout=self.timeout_s) as client:
                response = client.post(
                    endpoint,
                    json=payload,
                    headers=headers,
                )

            elapsed_ms = int((time.monotonic() - start_time) * 1000)

            if self.debug:
                logger.debug(
                    f"[TelephonyHealth] Resolve DID response in {elapsed_ms}ms: "
                    f"status={response.status_code}"
                )

            # Parse response (both success and failure use 200 with allowed flag)
            if response.status_code == 200:
                data = response.json()
                return self._parse_resolve_did_response(did, data)

            # Non-200 status - treat as system error
            error_data = response.json() if response.content else {}
            error_msg = error_data.get("error", {}).get(
                "message", f"HTTP {response.status_code}"
            )

            logger.error(
                f"[TelephonyHealth] Resolve DID failed for {did}: {error_msg}"
            )

            return DidCheckResult(
                ok=False,
                reason_code="SYSTEM_UNHEALTHY",
                message="This line is temporarily unavailable. Please try again shortly.",
                raw=error_data,
            )

        except httpx.TimeoutException as e:
            logger.error(f"[TelephonyHealth] Timeout resolving DID {did}: {e}")
            return DidCheckResult(
                ok=False,
                reason_code="SYSTEM_UNHEALTHY",
                message="This line is temporarily unavailable. Please try again shortly.",
            )

        except Exception as e:
            logger.error(f"[TelephonyHealth] Error resolving DID {did}: {e}")
            return DidCheckResult(
                ok=False,
                reason_code="UNKNOWN",
                message="This line is temporarily unavailable. Please try again shortly.",
            )

    def check_did(self, did: str, call_id: Optional[str] = None) -> DidCheckResult:
        """
        Full Inbound Call Guard check: system health + DID resolution.

        This is the main entry point for call gating. It:
        1. Checks system health (database connectivity)
        2. Resolves DID to agent and checks live-eligibility

        Args:
            did: The phone number (DID) to check.
            call_id: Optional call ID for logging/tracing.

        Returns:
            DidCheckResult indicating whether call is allowed.
        """
        # Step 1: Check system health
        if not self.health_check():
            logger.error(
                f"[TelephonyHealth] System unhealthy, rejecting call for {did}"
            )
            return DidCheckResult(
                ok=False,
                reason_code="SYSTEM_UNHEALTHY",
                message="This line is temporarily unavailable due to system maintenance. Please try again shortly.",
            )

        # Step 2: Resolve DID
        return self.resolve_did(did, call_id=call_id)

    def _parse_resolve_did_response(
        self, did: str, data: Dict[str, Any]
    ) -> DidCheckResult:
        """Parse the resolve-did API response into a DidCheckResult."""
        result_data = data.get("data")

        if not result_data:
            logger.warning(f"[TelephonyHealth] Empty data in resolve-did response for {did}")
            return DidCheckResult(
                ok=False,
                reason_code="UNKNOWN",
                message="This line is temporarily unavailable. Please try again shortly.",
                raw=data,
            )

        allowed = result_data.get("allowed", False)
        agent_id = result_data.get("agentId")
        deployment_state = result_data.get("deploymentState")
        reason_code = result_data.get("reason_code")
        message = result_data.get("message")

        result = DidCheckResult(
            ok=allowed,
            agent_id=agent_id,
            reason_code=reason_code,
            message=message,
            deployment_state=deployment_state,
            raw=data,
        )

        if allowed:
            logger.info(
                f"[TelephonyHealth] DID {did} -> ALLOWED "
                f"(agent={agent_id}, state={deployment_state})"
            )
        else:
            logger.warning(
                f"[TelephonyHealth] DID {did} -> REJECTED "
                f"(reason={reason_code}, message={message})"
            )

        return result

    @staticmethod
    def _normalize_phone(phone: str) -> str:
        """Normalize a phone number to E.164 format."""
        if not phone:
            return phone

        has_plus = phone.startswith("+")
        digits = "".join(c for c in phone if c.isdigit())

        if has_plus:
            return f"+{digits}"

        # Assume US number if 10 digits
        if len(digits) == 10:
            return f"+1{digits}"

        # If 11 digits starting with 1, treat as US
        if len(digits) == 11 and digits.startswith("1"):
            return f"+{digits}"

        return f"+{digits}"


# Module-level singleton
_default_client: Optional[TelephonyHealthClient] = None


def get_client() -> TelephonyHealthClient:
    """Get the default TelephonyHealthClient singleton."""
    global _default_client
    if _default_client is None:
        _default_client = TelephonyHealthClient()
    return _default_client


def check_did_health(did: str) -> TelephonyHealthResult:
    """
    Legacy convenience function to check a DID's health status (diagnostic).

    Args:
        did: The phone number to check.

    Returns:
        TelephonyHealthResult
    """
    return get_client().check(did)


def check_did_guard(did: str, call_id: Optional[str] = None) -> DidCheckResult:
    """
    Convenience function for Inbound Call Guard (v1).

    This is the main entry point for call gating.

    Args:
        did: The phone number to check.
        call_id: Optional call ID for logging/tracing.

    Returns:
        DidCheckResult
    """
    return get_client().check_did(did, call_id=call_id)
