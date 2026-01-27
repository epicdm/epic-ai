"""
Call Actions Module

TTS and call control helpers for the voice-service.
Provides clean abstractions for common call operations.

Usage:
    from call_actions import play_tts_and_end_call

    # In your call handler:
    if not result.ok:
        await play_tts_and_end_call(call_ctx, "Sorry, this line is unavailable.")
        return
"""

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


async def play_tts_and_end_call(
    call_ctx: Any,
    text: str,
    voice_id: Optional[str] = None,
    hang_up_delay_ms: int = 500,
) -> None:
    """
    Play a TTS message and then end the call.

    This is an adapter that works with LiveKit agent contexts.
    It handles the common pattern of playing a message before disconnecting.

    Args:
        call_ctx: The LiveKit agent context (AgentContext or similar).
        text: The text to speak via TTS.
        voice_id: Optional voice ID for the TTS provider.
        hang_up_delay_ms: Delay in ms after TTS before hanging up.
    """
    if not text:
        logger.warning("[CallActions] Empty TTS text provided, ending call")
        await _end_call(call_ctx)
        return

    logger.info(f"[CallActions] Playing TTS and ending call: {text[:50]}...")

    try:
        # Try to use the agent's TTS capability
        if hasattr(call_ctx, "say"):
            # LiveKit VoicePipelineAgent pattern
            await call_ctx.say(text, allow_interruptions=False)

        elif hasattr(call_ctx, "agent") and hasattr(call_ctx.agent, "say"):
            # Nested agent pattern
            await call_ctx.agent.say(text, allow_interruptions=False)

        elif hasattr(call_ctx, "tts") and hasattr(call_ctx.tts, "synthesize"):
            # Direct TTS access pattern
            audio = await call_ctx.tts.synthesize(text)
            if hasattr(call_ctx, "play_audio"):
                await call_ctx.play_audio(audio)
            elif hasattr(call_ctx, "output") and hasattr(call_ctx.output, "play"):
                await call_ctx.output.play(audio)

        else:
            logger.warning(
                "[CallActions] No TTS capability found on context, "
                "ending call without message"
            )

    except Exception as e:
        logger.error(f"[CallActions] TTS failed: {e}")

    # Wait briefly for TTS to complete
    if hang_up_delay_ms > 0:
        import asyncio
        await asyncio.sleep(hang_up_delay_ms / 1000.0)

    await _end_call(call_ctx)


async def _end_call(call_ctx: Any) -> None:
    """
    End the call using available methods on the context.

    Args:
        call_ctx: The LiveKit agent context.
    """
    try:
        if hasattr(call_ctx, "disconnect"):
            await call_ctx.disconnect()
            logger.info("[CallActions] Call disconnected via disconnect()")

        elif hasattr(call_ctx, "shutdown"):
            await call_ctx.shutdown()
            logger.info("[CallActions] Call ended via shutdown()")

        elif hasattr(call_ctx, "room") and hasattr(call_ctx.room, "disconnect"):
            await call_ctx.room.disconnect()
            logger.info("[CallActions] Call ended via room.disconnect()")

        elif hasattr(call_ctx, "close"):
            await call_ctx.close()
            logger.info("[CallActions] Call ended via close()")

        else:
            logger.warning("[CallActions] No disconnect method found on context")

    except Exception as e:
        logger.error(f"[CallActions] Error ending call: {e}")


async def play_tts(
    call_ctx: Any,
    text: str,
    allow_interruptions: bool = True,
) -> None:
    """
    Play a TTS message without ending the call.

    Args:
        call_ctx: The LiveKit agent context.
        text: The text to speak.
        allow_interruptions: Whether the caller can interrupt.
    """
    if not text:
        return

    logger.debug(f"[CallActions] Playing TTS: {text[:50]}...")

    try:
        if hasattr(call_ctx, "say"):
            await call_ctx.say(text, allow_interruptions=allow_interruptions)

        elif hasattr(call_ctx, "agent") and hasattr(call_ctx.agent, "say"):
            await call_ctx.agent.say(
                text, allow_interruptions=allow_interruptions
            )

        elif hasattr(call_ctx, "tts") and hasattr(call_ctx.tts, "synthesize"):
            audio = await call_ctx.tts.synthesize(text)
            if hasattr(call_ctx, "play_audio"):
                await call_ctx.play_audio(audio)
            elif hasattr(call_ctx, "output") and hasattr(call_ctx.output, "play"):
                await call_ctx.output.play(audio)

        else:
            logger.warning("[CallActions] No TTS capability found on context")

    except Exception as e:
        logger.error(f"[CallActions] TTS failed: {e}")


async def transfer_call(
    call_ctx: Any,
    target: str,
    announcement: Optional[str] = None,
) -> bool:
    """
    Transfer the call to another destination.

    Args:
        call_ctx: The LiveKit agent context.
        target: SIP URI or phone number to transfer to.
        announcement: Optional message to play before transfer.

    Returns:
        True if transfer initiated, False if not supported/failed.
    """
    logger.info(f"[CallActions] Transferring call to: {target}")

    if announcement:
        await play_tts(call_ctx, announcement, allow_interruptions=False)

    try:
        if hasattr(call_ctx, "transfer"):
            await call_ctx.transfer(target)
            return True

        elif hasattr(call_ctx, "sip") and hasattr(call_ctx.sip, "transfer"):
            await call_ctx.sip.transfer(target)
            return True

        else:
            logger.warning("[CallActions] No transfer capability found on context")
            return False

    except Exception as e:
        logger.error(f"[CallActions] Transfer failed: {e}")
        return False


async def hold_call(call_ctx: Any, hold: bool = True) -> bool:
    """
    Put the call on hold or resume.

    Args:
        call_ctx: The LiveKit agent context.
        hold: True to hold, False to resume.

    Returns:
        True if successful, False if not supported/failed.
    """
    action = "hold" if hold else "resume"
    logger.info(f"[CallActions] {action.capitalize()} call")

    try:
        if hasattr(call_ctx, "hold"):
            if hold:
                await call_ctx.hold()
            else:
                await call_ctx.unhold()
            return True

        elif hasattr(call_ctx, "mute"):
            # Fallback: mute audio as pseudo-hold
            await call_ctx.mute(hold)
            return True

        else:
            logger.warning("[CallActions] No hold capability found on context")
            return False

    except Exception as e:
        logger.error(f"[CallActions] {action.capitalize()} failed: {e}")
        return False
