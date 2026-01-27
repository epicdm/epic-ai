"""
Flow Loader - Load Agent OS flow JSONB from API

Fetches flow_config from Agent OS API for dynamic IVR behavior.
"""

import os
import logging
import requests
from typing import Dict, Any, Optional
from flow_runtime import DEFAULT_FLOW

logger = logging.getLogger(__name__)

# Configuration
WEB_API_BASE = os.getenv("WEB_API_BASE", os.getenv("EPIC_APP_BASE_URL", "http://localhost:3000"))
FLOW_CACHE_TTL = int(os.getenv("FLOW_CACHE_TTL", "300"))  # 5 minutes


class FlowLoader:
    """
    Flow loader that fetches agent flow from Agent OS API.

    Features:
    - Fetches flow_config from /api/agent-os/agents/{id}
    - Returns DEFAULT_FLOW if agent has no flow_config
    - Caches flows for performance (optional, v2)
    """

    def __init__(self, api_base: str = WEB_API_BASE):
        """
        Initialize flow loader.

        Args:
            api_base: Base URL for web API
        """
        self.api_base = api_base

    def load_agent_flow(self, agent_id: str) -> Dict[str, Any]:
        """
        Load flow config for agent.

        Args:
            agent_id: VoiceAgent ID (e.g., "va_abc123")

        Returns:
            Flow JSONB or DEFAULT_FLOW if not found

        Raises:
            Exception if API call fails
        """
        try:
            # Fetch agent from API
            url = f"{self.api_base}/api/agent-os/agents/{agent_id}"
            logger.info(f"[FlowLoader] Fetching agent flow from {url}")

            response = requests.get(url, timeout=5)

            # Handle non-2xx responses
            if response.status_code != 200:
                logger.warning(
                    f"[FlowLoader] Failed to fetch agent {agent_id}: "
                    f"status={response.status_code}"
                )
                return DEFAULT_FLOW

            # Parse response
            data = response.json()

            # Extract flow_config
            # Expected structure: { "data": { "id": "va_...", "flowConfig": {...} } }
            agent = data.get("data")
            if not agent:
                logger.warning(f"[FlowLoader] No 'data' field in response for agent {agent_id}")
                return DEFAULT_FLOW

            flow_config = agent.get("flowConfig") or agent.get("flow_config")

            if not flow_config:
                logger.info(
                    f"[FlowLoader] Agent {agent_id} has no flow_config, using DEFAULT_FLOW"
                )
                return DEFAULT_FLOW

            # Validate flow structure
            if "start_node" not in flow_config or "nodes" not in flow_config:
                logger.warning(
                    f"[FlowLoader] Agent {agent_id} flow_config missing start_node or nodes, "
                    f"using DEFAULT_FLOW"
                )
                return DEFAULT_FLOW

            logger.info(
                f"[FlowLoader] Loaded flow for agent {agent_id}: "
                f"start_node={flow_config.get('start_node')}, "
                f"nodes={len(flow_config.get('nodes', {}))}"
            )

            return flow_config

        except requests.RequestException as e:
            logger.error(f"[FlowLoader] HTTP error fetching agent {agent_id}: {e}")
            return DEFAULT_FLOW

        except Exception as e:
            logger.error(f"[FlowLoader] Unexpected error loading flow for {agent_id}: {e}")
            return DEFAULT_FLOW


# Global instance
_flow_loader = FlowLoader()


def load_agent_flow(agent_id: str) -> Dict[str, Any]:
    """
    Load agent flow config.

    Helper function for backward compatibility.

    Args:
        agent_id: VoiceAgent ID

    Returns:
        Flow JSONB or DEFAULT_FLOW
    """
    return _flow_loader.load_agent_flow(agent_id)
