"""
Inbound Call Guard

Fail-closed safety gate for inbound calls. Ensures no call reaches the
agent runtime unless the DID is properly configured and the agent is live.

This module wraps the TelephonyHealthClient and provides:
- Clear pass/block decision
- Fallback message generation for blocked calls
- Logging for debugging and monitoring

Usage:
    from inbound_guard import InboundCallGuard

    guard = InboundCallGuard()

    # In your inbound call handler:
    result = guard.check(did)
    if not result.ok:
        message = guard.get_fallback_text(result)
        await play_tts_and_end_call(ctx, message)
        return

    # Proceed with routing to agent
    await route_to_agent(ctx, result.agent_id, ...)
"""

import os
import logging
from typing import Optional

from telephony_health import (
    TelephonyHealthClient,
    TelephonyHealthResult,
)

logger = logging.getLogger(__name__)

# Default fallback message when calls cannot be connected
DEFAULT_FALLBACK = (
    "Thanks for calling. This line is temporarily unavailable. "
    "Please try again shortly, or contact us through our website."
)

# Agent-specific fallback when agent is not live
AGENT_NOT_LIVE_FALLBACK = (
    "Thank you for calling. The agent you're trying to reach is not "
    "available at this time. Please try again later."
)

# DID not configured fallback
DID_NOT_CONFIGURED_FALLBACK = (
    "Sorry, this phone number is not currently set up to receive calls. "
    "Please check the number and try again."
)


class InboundCallGuard:
    """
    Fail-closed safety gate for inbound voice calls.

    Checks that:
    1. DID exists and is active
    2. DID is mapped to an agent
    3. Agent is in TESTING or PUBLISHED status
    4. Agent has VOICE channel enabled
    5. Agent configuration is complete

    If any check fails or the health service is unavailable,
    the call is blocked with a friendly fallback message.
    """

    def __init__(
        self,
        client: Optional[TelephonyHealthClient] = None,
        fallback_text: Optional[str] = None,
        debug: Optional[bool] = None,
    ):
        """
        Initialize the inbound call guard.

        Args:
            client: TelephonyHealthClient instance. Default: creates new one.
            fallback_text: Custom fallback message for blocked calls.
                          Default: EPIC_CALL_FALLBACK_TEXT env or DEFAULT_FALLBACK.
            debug: Enable debug logging. Default: EPIC_HEALTHCHECK_DEBUG env.
        """
        self.client = client or TelephonyHealthClient()

        self.fallback_text = (
            fallback_text
            or os.getenv("EPIC_CALL_FALLBACK_TEXT")
            or DEFAULT_FALLBACK
        )

        self.debug = debug if debug is not None else (
            os.getenv("EPIC_HEALTHCHECK_DEBUG", "false").lower() == "true"
        )

        logger.info("[InboundGuard] Initialized (fail-closed mode)")

    def check(self, did: str) -> TelephonyHealthResult:
        """
        Check if an inbound call should be allowed.

        This is the main entry point for the guard. Returns a
        TelephonyHealthResult that indicates whether to proceed
        or block the call.

        Args:
            did: The dialed phone number (DID) in any format.

        Returns:
            TelephonyHealthResult with ok=True if call should proceed,
            ok=False if call should be blocked.
        """
        if not did:
            logger.warning("[InboundGuard] No DID provided, blocking call")
            return TelephonyHealthResult(
                ok=False,
                gaps=["No DID provided"],
            )

        if self.debug:
            logger.debug(f"[InboundGuard] Checking DID: {did}")

        result = self.client.check(did)

        # Log the decision
        if result.ok:
            logger.info(
                f"[InboundGuard] ALLOW call to {did} -> "
                f"agent={result.agent_id} ({result.agent_type})"
            )
        else:
            logger.warning(
                f"[InboundGuard] BLOCK call to {did}: {result.gaps}"
            )

        return result

    def get_fallback_text(self, result: TelephonyHealthResult) -> str:
        """
        Get the appropriate fallback message for a blocked call.

        Generates a user-friendly message based on why the call was blocked.

        Args:
            result: The TelephonyHealthResult from check().

        Returns:
            A TTS-friendly fallback message.
        """
        if result.ok:
            # Shouldn't be called for passing results, but handle gracefully
            return ""

        checks = result.checks

        # DID doesn't exist
        if not checks.get("didExists", False):
            return DID_NOT_CONFIGURED_FALLBACK

        # DID exists but agent not mapped or not live
        if not checks.get("agentLive", False):
            return AGENT_NOT_LIVE_FALLBACK

        # Generic fallback for other cases
        return self.fallback_text

    def should_allow(self, did: str) -> bool:
        """
        Simple boolean check for whether to allow a call.

        For cases where you just need a yes/no decision.

        Args:
            did: The dialed phone number.

        Returns:
            True if call should proceed, False if blocked.
        """
        return self.check(did).ok


# Module-level singleton
_default_guard: Optional[InboundCallGuard] = None


def get_guard() -> InboundCallGuard:
    """Get the default InboundCallGuard singleton."""
    global _default_guard
    if _default_guard is None:
        _default_guard = InboundCallGuard()
    return _default_guard


def check_inbound_call(did: str) -> TelephonyHealthResult:
    """
    Convenience function to check an inbound call.

    Args:
        did: The dialed phone number.

    Returns:
        TelephonyHealthResult
    """
    return get_guard().check(did)


def get_block_message(result: TelephonyHealthResult) -> str:
    """
    Get the fallback message for a blocked call.

    Args:
        result: The TelephonyHealthResult from check_inbound_call().

    Returns:
        TTS-friendly fallback message.
    """
    return get_guard().get_fallback_text(result)
