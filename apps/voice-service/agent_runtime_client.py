"""
Agent Runtime Client v1

Synchronous client for calling the Epic AI Agent Runtime turn endpoint.
Used by route_to_agent adapter to process voice utterances.

Endpoint: POST /api/agent-os/runtime/turn
"""

import os
import logging
import requests
from typing import Optional, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class RuntimeTurnResult:
    """Result from a runtime turn call"""
    text: str  # Text to speak back to the caller
    session_id: str  # Session ID for this conversation
    should_end: bool = False  # If True, end the call
    metadata: Optional[Dict[str, Any]] = None  # Additional metadata


class AgentRuntimeClient:
    """
    Synchronous client for the Agent Runtime turn endpoint.

    Sends user utterances to the runtime and receives text responses.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
    ):
        """
        Initialize the runtime client.

        Args:
            base_url: Base URL for the runtime API (e.g., http://localhost:3000)
            api_key: API key for authentication
            timeout: Request timeout in seconds
        """
        self.base_url = base_url or os.getenv("RUNTIME_API_URL", "http://localhost:3000")
        self.api_key = api_key or os.getenv("VOICE_RUNTIME_API_KEY")
        self.timeout = timeout

        # Remove trailing slash from base_url
        if self.base_url.endswith("/"):
            self.base_url = self.base_url[:-1]

        logger.info(f"[RuntimeClient] Initialized with base_url={self.base_url}")

    def turn(
        self,
        agent_id: str,
        session_id: str,
        user_text: str,
        caller_phone: Optional[str] = None,
        caller_name: Optional[str] = None,
    ) -> RuntimeTurnResult:
        """
        Process a single turn with the agent runtime.

        Args:
            agent_id: The agent ID to route to
            session_id: Unique session ID for this call
            user_text: What the user said (transcribed text)
            caller_phone: Optional caller phone number
            caller_name: Optional caller name

        Returns:
            RuntimeTurnResult with the agent's response

        Raises:
            RuntimeError: If the API call fails
        """
        url = f"{self.base_url}/api/agent-os/runtime/turn"

        headers = {
            "Content-Type": "application/json",
        }

        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "agentId": agent_id,
            "sessionId": session_id,
            "userText": user_text,
        }

        if caller_phone:
            payload["callerPhone"] = caller_phone

        if caller_name:
            payload["callerName"] = caller_name

        try:
            logger.debug(f"[RuntimeClient] POST {url} - sessionId={session_id}, text={user_text[:50]}...")

            response = requests.post(
                url,
                json=payload,
                headers=headers,
                timeout=self.timeout,
            )

            response.raise_for_status()
            data = response.json()

            # Extract response text
            agent_text = data.get("text", "")
            should_end = data.get("shouldEnd", False)
            metadata = data.get("metadata")

            logger.info(f"[RuntimeClient] Response: {agent_text[:100]}... (shouldEnd={should_end})")

            return RuntimeTurnResult(
                text=agent_text,
                session_id=session_id,
                should_end=should_end,
                metadata=metadata,
            )

        except requests.exceptions.Timeout:
            logger.error(f"[RuntimeClient] Timeout calling runtime API (timeout={self.timeout}s)")
            raise RuntimeError("Runtime API timeout")

        except requests.exceptions.RequestException as e:
            logger.error(f"[RuntimeClient] Failed to call runtime API: {e}")
            raise RuntimeError(f"Runtime API error: {e}")

        except Exception as e:
            logger.error(f"[RuntimeClient] Unexpected error: {e}")
            raise RuntimeError(f"Runtime client error: {e}")
