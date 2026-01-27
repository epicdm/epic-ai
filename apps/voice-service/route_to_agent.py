"""
Route-to-agent Runtime Adapter v1

Drop-in module for routing LiveKit voice calls to the Epic AI Agent Runtime.

Flow:
1. Create sessionId
2. Listen for user utterances (via CallCtx)
3. Send each utterance to runtime: POST /api/agent-os/runtime/turn
4. Speak the response back to caller
5. Loop until hangup or max turns

Guardrails:
- Timeout per turn
- Max turns limit
- Hangup keyword detection
- Fail-safe fallback on errors
"""

import os
import logging
import uuid
import asyncio
from typing import Optional

from call_ctx_protocol import CallCtx
from agent_runtime_client import AgentRuntimeClient, RuntimeTurnResult

logger = logging.getLogger(__name__)


# Hangup keywords that end the call
HANGUP_KEYWORDS = [
    "goodbye",
    "good bye",
    "bye",
    "hang up",
    "end call",
    "disconnect",
]


class RouteToAgentRuntimeAdapterV1:
    """
    Routes voice calls to the Epic AI Agent Runtime.

    Handles the conversation loop between the caller and the agent runtime.
    """

    def __init__(
        self,
        agent_id: str,
        call_ctx: CallCtx,
        runtime_client: Optional[AgentRuntimeClient] = None,
        max_turns: int = 100,
        turn_timeout: float = 30.0,
        enable_hangup_keywords: bool = True,
        fallback_text: Optional[str] = None,
    ):
        """
        Initialize the adapter.

        Args:
            agent_id: The agent ID to route to
            call_ctx: Call context implementing CallCtx protocol
            runtime_client: Runtime client (creates default if None)
            max_turns: Maximum number of conversation turns
            turn_timeout: Timeout per runtime turn in seconds
            enable_hangup_keywords: Whether to detect hangup keywords
            fallback_text: Custom fallback message on errors
        """
        self.agent_id = agent_id
        self.call_ctx = call_ctx
        self.runtime_client = runtime_client or AgentRuntimeClient()
        self.max_turns = max_turns
        self.turn_timeout = turn_timeout
        self.enable_hangup_keywords = enable_hangup_keywords

        self.fallback_text = (
            fallback_text
            or os.getenv("EPIC_RUNTIME_FALLBACK_TEXT")
            or "I'm having trouble processing your request. Please try again later."
        )

        # Generate unique session ID
        self.session_id = str(uuid.uuid4())

        logger.info(
            f"[RouteToAgent] Initialized - agent={agent_id}, "
            f"sessionId={self.session_id}, maxTurns={max_turns}"
        )

    async def run(self) -> None:
        """
        Run the conversation loop.

        This is the main entry point. It:
        1. Listens for user utterances
        2. Sends each to the runtime
        3. Speaks the response
        4. Loops until hangup or max turns
        """
        turn_count = 0

        try:
            logger.info(f"[RouteToAgent] Starting conversation loop (sessionId={self.session_id})")

            async for user_text in self.call_ctx.user_utterances():
                turn_count += 1

                if turn_count > self.max_turns:
                    logger.warning(
                        f"[RouteToAgent] Max turns ({self.max_turns}) reached, ending call"
                    )
                    await self._say_and_hangup("Thank you for calling. Goodbye!")
                    break

                # Skip empty utterances
                if not user_text or not user_text.strip():
                    logger.debug("[RouteToAgent] Skipping empty utterance")
                    continue

                logger.info(f"[RouteToAgent] Turn {turn_count}: User said: {user_text[:100]}...")

                # Check for hangup keywords
                if self.enable_hangup_keywords and self._is_hangup(user_text):
                    logger.info(f"[RouteToAgent] Hangup keyword detected: {user_text}")
                    await self._say_and_hangup("Goodbye! Have a great day.")
                    break

                # Process turn with runtime
                try:
                    result = await self._process_turn(user_text)

                    if not result or not result.text:
                        logger.warning("[RouteToAgent] Empty response from runtime")
                        await self.call_ctx.speak(
                            "I didn't quite catch that. Could you repeat?"
                        )
                        continue

                    # Speak the response
                    await self.call_ctx.speak(result.text)

                    # Check if runtime wants to end the call
                    if result.should_end:
                        logger.info("[RouteToAgent] Runtime requested call end")
                        await self.call_ctx.hangup()
                        break

                except asyncio.TimeoutError:
                    logger.error(f"[RouteToAgent] Turn timeout ({self.turn_timeout}s)")
                    await self._say_and_hangup(
                        "I'm having trouble processing your request. "
                        "Please try calling back."
                    )
                    break

                except Exception as e:
                    logger.error(f"[RouteToAgent] Turn processing error: {e}")
                    await self._say_and_hangup(self.fallback_text)
                    break

        except Exception as e:
            logger.error(f"[RouteToAgent] Fatal error in conversation loop: {e}")
            try:
                await self._say_and_hangup(self.fallback_text)
            except Exception as hangup_error:
                logger.error(f"[RouteToAgent] Failed to hangup gracefully: {hangup_error}")

        logger.info(
            f"[RouteToAgent] Conversation ended - sessionId={self.session_id}, "
            f"turns={turn_count}"
        )

    async def _process_turn(self, user_text: str) -> RuntimeTurnResult:
        """
        Process a single turn with the runtime.

        Runs in a separate thread pool to avoid blocking the event loop
        with synchronous requests library.

        Args:
            user_text: What the user said

        Returns:
            RuntimeTurnResult from the agent

        Raises:
            asyncio.TimeoutError: If turn exceeds timeout
            RuntimeError: If runtime call fails
        """
        loop = asyncio.get_event_loop()

        # Run the synchronous runtime call in a thread pool
        result = await asyncio.wait_for(
            loop.run_in_executor(
                None,
                self.runtime_client.turn,
                self.agent_id,
                self.session_id,
                user_text,
                self.call_ctx.caller_phone,
                self.call_ctx.caller_name,
            ),
            timeout=self.turn_timeout,
        )

        return result

    async def _say_and_hangup(self, text: str) -> None:
        """
        Speak text and then hang up.

        Args:
            text: Text to speak before hanging up
        """
        try:
            await self.call_ctx.speak(text, allow_interruptions=False)
            await asyncio.sleep(0.5)  # Brief pause before hangup
            await self.call_ctx.hangup()
        except Exception as e:
            logger.error(f"[RouteToAgent] Error in say_and_hangup: {e}")
            try:
                await self.call_ctx.hangup()
            except Exception:
                pass

    def _is_hangup(self, text: str) -> bool:
        """
        Check if user text contains hangup keywords.

        Args:
            text: User utterance

        Returns:
            True if hangup keyword detected
        """
        text_lower = text.lower().strip()

        for keyword in HANGUP_KEYWORDS:
            if keyword in text_lower:
                return True

        return False


# ============================================================================
# FastAGI Integration for Outbound Callbacks
# ============================================================================

def handle_agi_route_to_agent(
    agi_env: dict,
    params: dict,
    agi_io: dict
) -> None:
    """
    Handle FastAGI /route_to_agent endpoint for outbound callbacks.

    This is called by the FastAGI server when Asterisk connects after
    an AMI Originate (outbound callback).

    Expected params from AMI Originate:
        - voiceAgentId: Voice agent ID
        - sessionId: Session ID (from callback job)
        - callId: Call ID
        - did: DID number
        - caller: Caller phone number
        - jobId: Callback job ID

    Args:
        agi_env: AGI environment from Asterisk
        params: Query parameters from AGI request URL
        agi_io: AGI IO wrapper (rfile, wfile)

    Flow:
        1. Load/create agent session
        2. Load flow JSONB from database or web API
        3. Run DTMF flow runtime loop
        4. Handle call completion/hangup
    """
    logger.info(f"[AGI:RouteToAgent] Starting - voiceAgentId={params.get('voiceAgentId')}")

    try:
        # Import session runtime
        # This module should provide DTMF-based flow execution
        from routes.agent_session import create_agi_session, run_agi_session_loop

        # Create or resume session
        session = create_agi_session(
            voice_agent_id=params.get("voiceAgentId", ""),
            session_id=params.get("sessionId", str(uuid.uuid4())),
            call_id=params.get("callId", ""),
            did=params.get("did", ""),
            caller=params.get("caller", ""),
            agi_env=agi_env,
            agi_io=agi_io,
        )

        logger.info(
            f"[AGI:RouteToAgent] Session created - "
            f"sessionId={session.get('sessionId')}, "
            f"voiceAgentId={session.get('voiceAgentId')}"
        )

        # Run DTMF flow loop
        # This handles:
        # - Playing prompts (TTS or pre-recorded)
        # - Collecting DTMF input
        # - Recording voice
        # - Executing tool nodes (Magnus, callback.enqueue, etc.)
        # - Following flow transitions
        # - Ending on end node or timeout
        run_agi_session_loop(session, agi_io)

        logger.info(f"[AGI:RouteToAgent] Session completed - sessionId={session.get('sessionId')}")

    except ImportError as e:
        logger.error(f"[AGI:RouteToAgent] Session runtime not available: {e}")
        _agi_verbose(agi_io, "Session runtime not configured", 1)
        _agi_hangup(agi_io)

    except Exception as e:
        logger.error(f"[AGI:RouteToAgent] Error: {e}", exc_info=True)
        _agi_verbose(agi_io, f"Error: {str(e)}", 1)
        _agi_hangup(agi_io)


def _agi_send_command(agi_io: dict, command: str) -> str:
    """
    Send AGI command and read response.

    Args:
        agi_io: AGI IO wrapper
        command: AGI command

    Returns:
        Response from Asterisk
    """
    wfile = agi_io["wfile"]
    rfile = agi_io.get("rfile")

    wfile.write(f"{command}\n".encode("utf-8"))
    wfile.flush()

    if rfile:
        response = rfile.readline().decode("utf-8", errors="ignore").strip()
        return response

    return ""


def _agi_verbose(agi_io: dict, message: str, level: int = 1) -> None:
    """Send VERBOSE command to Asterisk."""
    _agi_send_command(agi_io, f'VERBOSE "{message}" {level}')


def _agi_hangup(agi_io: dict) -> None:
    """Send HANGUP command to Asterisk."""
    _agi_send_command(agi_io, "HANGUP")
