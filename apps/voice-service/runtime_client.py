"""
Epic AI Runtime Client

HTTP client for calling the Agent Runtime API from the voice-service.
This bridges LiveKit/telephony to the workers runtime layer.

Usage:
    client = RuntimeClient(base_url="https://leads.epic.dm/api/runtime/voice")
    result = await client.process_turn(
        agent_id="uuid-or-phone-number",
        call_id="livekit-room-id",
        transcript="Hello, I need help",
        caller_phone="+15551234567"
    )
"""

import os
import logging
import aiohttp
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class VoiceTurnResult:
    """Result from a voice turn processing"""
    success: bool
    text: str
    flow_stage: str
    should_end_call: bool
    tool_actions: List[Dict[str, Any]]
    request_id: str
    tokens_used: int
    latency_ms: int
    error: Optional[str] = None


class RuntimeClient:
    """
    HTTP client for the Voice Runtime API.

    Connects the LiveKit voice-service to the Epic AI agent runtime,
    enabling full agent capabilities (flow, knowledge, tools, memory).
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: int = 30
    ):
        """
        Initialize the runtime client.

        Args:
            base_url: Runtime API URL (default: from RUNTIME_API_URL env)
            api_key: API key for authentication (default: from VOICE_RUNTIME_API_KEY env)
            timeout: Request timeout in seconds
        """
        self.base_url = base_url or os.environ.get(
            "RUNTIME_API_URL",
            "http://localhost:3000/api/runtime/voice"
        )
        self.api_key = api_key or os.environ.get("VOICE_RUNTIME_API_KEY")
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create an aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(timeout=self.timeout)
        return self._session

    async def close(self):
        """Close the HTTP session."""
        if self._session and not self._session.closed:
            await self._session.close()

    async def process_turn(
        self,
        agent_id: str,
        call_id: str,
        transcript: str,
        caller_phone: Optional[str] = None,
        caller_name: Optional[str] = None,
        call_start_time: Optional[str] = None,
        turn_number: Optional[int] = None,
        is_first_turn: Optional[bool] = None
    ) -> VoiceTurnResult:
        """
        Process a single voice turn through the runtime.

        This is the main entry point for voice-to-runtime communication.

        Args:
            agent_id: Agent ID (UUID) or DID (phone number) for lookup
            call_id: LiveKit room/call identifier
            transcript: Transcribed user speech from STT
            caller_phone: Caller's phone number (E.164 format)
            caller_name: Caller's name (if available from CallerID)
            call_start_time: ISO timestamp when call started
            turn_number: Current turn number in conversation
            is_first_turn: Whether this is the first turn

        Returns:
            VoiceTurnResult with agent response and metadata
        """
        session = await self._get_session()

        # Build request payload
        payload: Dict[str, Any] = {
            "agentIdOrDid": agent_id,
            "callId": call_id,
            "transcript": transcript,
        }

        # Add optional caller info
        if caller_phone or caller_name:
            payload["caller"] = {}
            if caller_phone:
                payload["caller"]["phoneNumber"] = caller_phone
            if caller_name:
                payload["caller"]["callerName"] = caller_name

        # Add optional metadata
        if call_start_time or turn_number is not None or is_first_turn is not None:
            payload["metadata"] = {}
            if call_start_time:
                payload["metadata"]["callStartTime"] = call_start_time
            if turn_number is not None:
                payload["metadata"]["turnNumber"] = turn_number
            if is_first_turn is not None:
                payload["metadata"]["isFirstTurn"] = is_first_turn

        # Build headers
        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["x-api-key"] = self.api_key

        logger.info(f"[RuntimeClient] Processing turn for agent={agent_id}, call={call_id}")
        logger.debug(f"[RuntimeClient] Transcript: {transcript[:100]}...")

        try:
            async with session.post(
                self.base_url,
                json=payload,
                headers=headers
            ) as response:
                data = await response.json()

                if response.status != 200:
                    logger.error(f"[RuntimeClient] API error: {response.status} - {data}")
                    return VoiceTurnResult(
                        success=False,
                        text="I'm sorry, I'm having trouble processing your request. Please try again.",
                        flow_stage="error",
                        should_end_call=False,
                        tool_actions=[],
                        request_id=data.get("requestId", "unknown"),
                        tokens_used=0,
                        latency_ms=0,
                        error=data.get("error", f"HTTP {response.status}")
                    )

                logger.info(f"[RuntimeClient] Turn completed: request_id={data.get('requestId')}, latency={data.get('latencyMs')}ms")

                return VoiceTurnResult(
                    success=data.get("success", False),
                    text=data.get("text", ""),
                    flow_stage=data.get("flowStage", "unknown"),
                    should_end_call=data.get("shouldEndCall", False),
                    tool_actions=data.get("toolActions", []),
                    request_id=data.get("requestId", "unknown"),
                    tokens_used=data.get("tokensUsed", 0),
                    latency_ms=data.get("latencyMs", 0),
                    error=data.get("error")
                )

        except aiohttp.ClientError as e:
            logger.error(f"[RuntimeClient] HTTP error: {e}")
            return VoiceTurnResult(
                success=False,
                text="I apologize, but I'm experiencing connection issues. Please try again.",
                flow_stage="error",
                should_end_call=False,
                tool_actions=[],
                request_id="connection_error",
                tokens_used=0,
                latency_ms=0,
                error=str(e)
            )
        except Exception as e:
            logger.error(f"[RuntimeClient] Unexpected error: {e}")
            return VoiceTurnResult(
                success=False,
                text="I apologize, but something went wrong. Please try again.",
                flow_stage="error",
                should_end_call=False,
                tool_actions=[],
                request_id="unknown_error",
                tokens_used=0,
                latency_ms=0,
                error=str(e)
            )

    async def health_check(self) -> Dict[str, Any]:
        """
        Check the runtime API health.

        Returns:
            Health status dict
        """
        session = await self._get_session()

        try:
            async with session.get(self.base_url) as response:
                if response.status == 200:
                    return await response.json()
                return {
                    "status": "unhealthy",
                    "error": f"HTTP {response.status}"
                }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }


# Convenience functions for standalone usage
_client: Optional[RuntimeClient] = None


async def get_client() -> RuntimeClient:
    """Get or create the shared runtime client."""
    global _client
    if _client is None:
        _client = RuntimeClient()
    return _client


async def process_voice_turn(
    agent_id: str,
    call_id: str,
    transcript: str,
    **kwargs
) -> VoiceTurnResult:
    """
    Convenience function to process a voice turn.

    Args:
        agent_id: Agent ID or phone number
        call_id: Call/room identifier
        transcript: User's speech text
        **kwargs: Additional parameters (caller_phone, caller_name, etc.)

    Returns:
        VoiceTurnResult
    """
    client = await get_client()
    return await client.process_turn(agent_id, call_id, transcript, **kwargs)
