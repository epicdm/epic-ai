"""
LiveKit Call Context Adapter

Implements CallCtx protocol for LiveKit agent contexts.
Adapts LiveKit's AgentSession to the CallCtx interface.
"""

import logging
import asyncio
from typing import AsyncIterator, Optional
from livekit import agents

logger = logging.getLogger(__name__)


class LiveKitCallCtx:
    """
    LiveKit-specific implementation of CallCtx protocol.

    Wraps a LiveKit AgentSession to provide the CallCtx interface.
    """

    def __init__(
        self,
        session: agents.AgentSession,
        participant: agents.Participant,
    ):
        """
        Initialize the LiveKit call context.

        Args:
            session: LiveKit AgentSession
            participant: The participant (caller)
        """
        self.session = session
        self.participant = participant

        # Extract caller info from SIP attributes
        self._caller_phone = participant.attributes.get("sip.callerNumber")
        self._caller_name = participant.attributes.get("sip.callerName")

        logger.info(
            f"[LiveKitCallCtx] Initialized for participant {participant.identity}"
        )

    async def user_utterances(self) -> AsyncIterator[str]:
        """
        Async iterator that yields user speech as it's transcribed.

        Yields:
            str: Transcribed text from the user
        """
        # Queue to buffer utterances from the session
        utterance_queue = asyncio.Queue()

        # Flag to signal when to stop
        stop_event = asyncio.Event()

        # Listen for user speech events from the session
        @self.session.on("user_speech")
        def _on_user_speech(event):
            """Handle user speech events"""
            try:
                text = event.alternatives[0].text if event.alternatives else ""
                if text and text.strip():
                    logger.debug(f"[LiveKitCallCtx] User said: {text[:50]}...")
                    asyncio.create_task(utterance_queue.put(text))
            except Exception as e:
                logger.error(f"[LiveKitCallCtx] Error processing user speech: {e}")

        # Listen for participant disconnect
        @self.session.on("participant_disconnected")
        def _on_disconnect(event):
            """Handle participant disconnect"""
            logger.info("[LiveKitCallCtx] Participant disconnected")
            stop_event.set()

        try:
            # Yield utterances as they arrive
            while not stop_event.is_set():
                try:
                    # Wait for next utterance with timeout
                    utterance = await asyncio.wait_for(
                        utterance_queue.get(),
                        timeout=1.0
                    )
                    yield utterance

                except asyncio.TimeoutError:
                    # No utterance in the last second, check if we should stop
                    if stop_event.is_set():
                        break
                    continue

        except Exception as e:
            logger.error(f"[LiveKitCallCtx] Error in utterance loop: {e}")
        finally:
            logger.info("[LiveKitCallCtx] Utterance stream ended")

    async def speak(self, text: str, allow_interruptions: bool = True) -> None:
        """
        Speak text to the caller via TTS.

        Args:
            text: The text to speak
            allow_interruptions: Whether the caller can interrupt
        """
        if not text or not text.strip():
            return

        try:
            logger.debug(f"[LiveKitCallCtx] Speaking: {text[:50]}...")

            # Use the session's say method if available
            if hasattr(self.session, "say"):
                await self.session.say(text, allow_interruptions=allow_interruptions)

            # Fallback: use generate_reply
            elif hasattr(self.session, "generate_reply"):
                await self.session.generate_reply(
                    instructions=f"Say exactly: {text}"
                )

            else:
                logger.warning("[LiveKitCallCtx] No TTS method available on session")

        except Exception as e:
            logger.error(f"[LiveKitCallCtx] Failed to speak: {e}")

    async def hangup(self) -> None:
        """
        End the call gracefully.
        """
        try:
            logger.info("[LiveKitCallCtx] Hanging up call")

            # Try to disconnect via the session
            if hasattr(self.session, "disconnect"):
                await self.session.disconnect()

            # Fallback: disconnect via room
            elif hasattr(self.session, "room") and hasattr(self.session.room, "disconnect"):
                await self.session.room.disconnect()

            else:
                logger.warning("[LiveKitCallCtx] No disconnect method available")

        except Exception as e:
            logger.error(f"[LiveKitCallCtx] Error hanging up: {e}")

    @property
    def caller_phone(self) -> Optional[str]:
        """Caller phone number from SIP attributes"""
        return self._caller_phone

    @property
    def caller_name(self) -> Optional[str]:
        """Caller name from SIP attributes"""
        return self._caller_name
