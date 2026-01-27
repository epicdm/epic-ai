"""
Epic AI Runtime LLM Adapter

Custom LLM adapter for LiveKit agents that routes through our Runtime API.
This enables full agent capabilities (flow, knowledge, tools, memory) instead
of simple OpenAI calls.

Usage:
    from runtime_llm import RuntimeLLM

    session = AgentSession(
        llm=RuntimeLLM(agent_id="your-agent-id"),
        stt=deepgram.STT(),
        tts=openai.TTS(),
    )
"""

import os
import logging
import asyncio
from typing import Optional, AsyncIterator, Dict, Any, List, Callable
from dataclasses import dataclass

from livekit.agents import llm
from runtime_client import RuntimeClient, VoiceTurnResult

logger = logging.getLogger(__name__)


@dataclass
class RuntimeLLMOptions:
    """Options for the Runtime LLM adapter."""
    agent_id: str
    call_id: Optional[str] = None
    caller_phone: Optional[str] = None
    caller_name: Optional[str] = None
    runtime_url: Optional[str] = None
    api_key: Optional[str] = None
    timeout: int = 30


class RuntimeLLM(llm.LLM):
    """
    Custom LLM adapter that routes to Epic AI Runtime.

    This replaces OpenAI's LLM with calls to our runtime API,
    enabling:
    - Agent flow state management
    - Knowledge retrieval (RAG)
    - Tool execution
    - Memory persistence
    - Personality rendering
    """

    def __init__(
        self,
        agent_id: str,
        call_id: Optional[str] = None,
        caller_phone: Optional[str] = None,
        caller_name: Optional[str] = None,
        runtime_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: int = 30
    ):
        """
        Initialize the Runtime LLM adapter.

        Args:
            agent_id: Agent ID (UUID) or DID (phone number)
            call_id: Optional call identifier (set per-session if not provided)
            caller_phone: Caller's phone number
            caller_name: Caller's name
            runtime_url: Runtime API URL
            api_key: API key for authentication
            timeout: Request timeout in seconds
        """
        super().__init__()
        self._agent_id = agent_id
        self._call_id = call_id
        self._caller_phone = caller_phone
        self._caller_name = caller_name
        self._turn_count = 0
        self._call_start_time: Optional[str] = None

        # Initialize the runtime client
        self._client = RuntimeClient(
            base_url=runtime_url,
            api_key=api_key,
            timeout=timeout
        )

        # Callbacks for flow events
        self._on_flow_change: Optional[Callable[[str], None]] = None
        self._on_should_end: Optional[Callable[[], None]] = None
        self._on_tool_action: Optional[Callable[[Dict[str, Any]], None]] = None

        logger.info(f"[RuntimeLLM] Initialized for agent={agent_id}")

    def set_call_context(
        self,
        call_id: str,
        caller_phone: Optional[str] = None,
        caller_name: Optional[str] = None
    ):
        """
        Set the call context for this LLM instance.
        Called when a new call connects.

        Args:
            call_id: LiveKit room/call identifier
            caller_phone: Caller's phone number
            caller_name: Caller's name
        """
        self._call_id = call_id
        self._caller_phone = caller_phone or self._caller_phone
        self._caller_name = caller_name or self._caller_name
        self._turn_count = 0
        self._call_start_time = None

        logger.info(f"[RuntimeLLM] Call context set: call_id={call_id}, phone={caller_phone}")

    def on_flow_change(self, callback: Callable[[str], None]):
        """Register a callback for flow stage changes."""
        self._on_flow_change = callback

    def on_should_end(self, callback: Callable[[], None]):
        """Register a callback for when the call should end."""
        self._on_should_end = callback

    def on_tool_action(self, callback: Callable[[Dict[str, Any]], None]):
        """Register a callback for tool actions."""
        self._on_tool_action = callback

    async def chat(
        self,
        *,
        chat_ctx: llm.ChatContext,
        fnc_ctx: Optional[llm.FunctionContext] = None,
        temperature: Optional[float] = None,
        n: Optional[int] = None,
        parallel_tool_calls: Optional[bool] = None,
    ) -> "RuntimeLLMStream":
        """
        Process a chat request through the runtime.

        This is the main entry point called by LiveKit's AgentSession.

        Args:
            chat_ctx: Chat context with conversation history
            fnc_ctx: Function context (we ignore this, runtime handles tools)
            temperature: Temperature setting (ignored, runtime uses agent config)
            n: Number of completions (ignored)
            parallel_tool_calls: Whether to allow parallel tool calls (ignored)

        Returns:
            RuntimeLLMStream with the response
        """
        # Extract the latest user message
        user_message = self._extract_latest_user_message(chat_ctx)
        if not user_message:
            logger.warning("[RuntimeLLM] No user message found in chat context")
            return RuntimeLLMStream.error("I didn't catch that. Could you repeat?")

        # Generate call_id if not set
        if not self._call_id:
            self._call_id = f"call_{id(self)}_{asyncio.get_event_loop().time()}"
            logger.info(f"[RuntimeLLM] Generated call_id: {self._call_id}")

        # Track turn count
        self._turn_count += 1
        is_first_turn = self._turn_count == 1

        # Call the runtime
        logger.info(f"[RuntimeLLM] Processing turn {self._turn_count}: '{user_message[:50]}...'")

        result = await self._client.process_turn(
            agent_id=self._agent_id,
            call_id=self._call_id,
            transcript=user_message,
            caller_phone=self._caller_phone,
            caller_name=self._caller_name,
            turn_number=self._turn_count,
            is_first_turn=is_first_turn
        )

        # Handle flow events
        if self._on_flow_change and result.flow_stage:
            self._on_flow_change(result.flow_stage)

        if self._on_should_end and result.should_end_call:
            self._on_should_end()

        if self._on_tool_action and result.tool_actions:
            for action in result.tool_actions:
                self._on_tool_action(action)

        # Log result
        logger.info(
            f"[RuntimeLLM] Turn {self._turn_count} complete: "
            f"success={result.success}, "
            f"flow={result.flow_stage}, "
            f"end_call={result.should_end_call}, "
            f"latency={result.latency_ms}ms"
        )

        return RuntimeLLMStream(result)

    def _extract_latest_user_message(self, chat_ctx: llm.ChatContext) -> Optional[str]:
        """Extract the latest user message from the chat context."""
        # Iterate through messages in reverse to find the latest user message
        for msg in reversed(chat_ctx.messages):
            if msg.role == "user":
                if isinstance(msg.content, str):
                    return msg.content
                elif isinstance(msg.content, list):
                    # Handle multi-part messages (text + images, etc.)
                    for part in msg.content:
                        if hasattr(part, 'text'):
                            return part.text
        return None

    async def close(self):
        """Clean up resources."""
        await self._client.close()


class RuntimeLLMStream(llm.LLMStream):
    """
    Stream wrapper for Runtime LLM responses.

    Since the Runtime API returns complete responses (not streaming),
    this wraps the response in a single-chunk stream.
    """

    def __init__(self, result: VoiceTurnResult):
        super().__init__(
            chat_ctx=llm.ChatContext(),
            fnc_ctx=None,
        )
        self._result = result
        self._sent = False

    @staticmethod
    def error(message: str) -> "RuntimeLLMStream":
        """Create a stream with an error message."""
        return RuntimeLLMStream(VoiceTurnResult(
            success=False,
            text=message,
            flow_stage="error",
            should_end_call=False,
            tool_actions=[],
            request_id="error",
            tokens_used=0,
            latency_ms=0,
            error="No user message"
        ))

    async def aclose(self):
        """Close the stream."""
        pass

    async def __anext__(self) -> llm.ChatChunk:
        """Get the next chunk from the stream."""
        if self._sent:
            raise StopAsyncIteration

        self._sent = True

        # Create a single chunk with the full response
        return llm.ChatChunk(
            request_id=self._result.request_id,
            choices=[
                llm.Choice(
                    delta=llm.ChoiceDelta(
                        role="assistant",
                        content=self._result.text,
                    ),
                    index=0,
                )
            ],
        )


# Factory function for easy creation
def create_runtime_llm(
    agent_id: str,
    **kwargs
) -> RuntimeLLM:
    """
    Factory function to create a RuntimeLLM instance.

    Args:
        agent_id: Agent ID or phone number
        **kwargs: Additional options (call_id, caller_phone, etc.)

    Returns:
        RuntimeLLM instance
    """
    return RuntimeLLM(agent_id=agent_id, **kwargs)
