"""
Call Context Protocol

Minimal protocol for call context abstraction.
Allows route_to_agent to work with any call platform (LiveKit, Twilio, etc.)
"""

from typing import Protocol, AsyncIterator, Optional


class CallCtx(Protocol):
    """
    Protocol for a voice call context.

    Implementations must provide:
    - user_utterances(): AsyncIterator yielding user speech text
    - speak(text): Async method to speak text back to caller
    - hangup(): Async method to end the call
    """

    async def user_utterances(self) -> AsyncIterator[str]:
        """
        Async iterator that yields user utterances as they're transcribed.

        Yields:
            str: Transcribed text from the user

        Example:
            async for text in call_ctx.user_utterances():
                print(f"User said: {text}")
        """
        ...

    async def speak(self, text: str, allow_interruptions: bool = True) -> None:
        """
        Speak text to the caller via TTS.

        Args:
            text: The text to speak
            allow_interruptions: Whether the caller can interrupt
        """
        ...

    async def hangup(self) -> None:
        """
        End the call gracefully.
        """
        ...

    @property
    def caller_phone(self) -> Optional[str]:
        """Optional: Caller phone number (if available)"""
        return None

    @property
    def caller_name(self) -> Optional[str]:
        """Optional: Caller name (if available)"""
        return None
