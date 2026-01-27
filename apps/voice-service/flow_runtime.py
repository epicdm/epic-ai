"""
Flow Runtime Engine v1 + Tool Node Runtime v1

Executes Agent OS flow JSONB to drive IVR/agent behavior dynamically.

Flow Model (with tool nodes):
{
  "start_node": "welcome",
  "nodes": {
    "lookup_customer": {
      "type": "tool",
      "tool_key": "crm.lookupContact",
      "input": {
        "phone": "{{session.caller}}"
      },
      "save_output_as": "tool.crm.contact",
      "on_success": "support_menu",
      "on_error": "fallback_no_record"
    },
    "welcome": {
      "type": "prompt",
      "text": "Welcome to Epic AI. Press 1 for sales, 2 for support.",
      "collect": "dtmf",
      "transitions": {
        "1": "sales_menu",
        "2": "support_menu",
        "timeout": "fallback"
      }
    },
    "end": { "type": "end", "text": "Thanks for calling. Goodbye." }
  }
}

Templating v1 (deterministic, small):
- {{session.caller}} - Caller phone number
- {{session.did}} - DID number
- {{session.last_dtmf}} - Last DTMF input
- {{memory.someKey}} - Session memory
- {{tool.crm.contact.id}} - Tool output
"""

from typing import Dict, Any, Optional
import logging
import re

logger = logging.getLogger(__name__)

# Templating regex for v1
TOKEN_RE = re.compile(r"\{\{\s*([^}]+)\s*\}\}")


def get_path(obj: Dict[str, Any], path: str) -> Any:
    """
    Get value from nested dict using dot notation.

    Args:
        obj: Dictionary to search
        path: Dot-separated path (e.g., "session.caller")

    Returns:
        Value at path or None if not found
    """
    cur = obj
    for part in path.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur


def render_template(value: Any, ctx: Dict[str, Any]) -> Any:
    """
    Very small deterministic templating for v1.

    Supports:
    - {{session.caller}} - Session context
    - {{session.did}} - Session context
    - {{session.last_dtmf}} - Last DTMF input
    - {{memory.someKey}} - Session memory
    - {{tool.crm.contact.id}} - Tool outputs

    Args:
        value: Value to render (can be string, dict, list)
        ctx: Context dictionary

    Returns:
        Rendered value
    """
    if isinstance(value, dict):
        return {k: render_template(v, ctx) for k, v in value.items()}
    if isinstance(value, list):
        return [render_template(v, ctx) for v in value]
    if not isinstance(value, str):
        return value

    def sub(match):
        expr = match.group(1).strip()  # e.g. "session.caller"
        v = get_path(ctx, expr)
        return "" if v is None else str(v)

    return TOKEN_RE.sub(sub, value)


def deep_set(obj: Dict[str, Any], path: str, value: Any):
    """
    Set value in nested dict using dot notation.

    Args:
        obj: Dictionary to modify
        path: Dot-separated path (e.g., "tool.crm.contact")
        value: Value to set
    """
    parts = path.split(".")
    cur = obj
    for p in parts[:-1]:
        if p not in cur or not isinstance(cur[p], dict):
            cur[p] = {}
        cur = cur[p]
    cur[parts[-1]] = value


class FlowRuntimeEngine:
    """
    Flow runtime engine that executes Agent OS flow JSONB.

    Handles:
    - Node traversal
    - Transition resolution
    - Flow validation
    - State management
    """

    def __init__(self, flow: Dict[str, Any]):
        """
        Initialize flow runtime engine.

        Args:
            flow: Agent OS flow JSONB
        """
        self.flow = flow
        self._validate_flow()

    def _validate_flow(self):
        """Validate flow structure"""
        if not self.flow:
            raise ValueError("Flow is empty or None")

        if "start_node" not in self.flow:
            raise ValueError("Flow missing 'start_node'")

        if "nodes" not in self.flow:
            raise ValueError("Flow missing 'nodes'")

        start_node_id = self.flow["start_node"]
        if start_node_id not in self.flow["nodes"]:
            raise ValueError(f"Start node '{start_node_id}' not found in nodes")

    def get_start_node_id(self) -> str:
        """Get the starting node ID"""
        return self.flow["start_node"]

    def get_node(self, node_id: str) -> Optional[Dict[str, Any]]:
        """
        Get node by ID.

        Args:
            node_id: Node identifier

        Returns:
            Node definition or None if not found
        """
        return self.flow["nodes"].get(node_id)

    def resolve_next(self, node: Dict[str, Any], input_value: str) -> Optional[str]:
        """
        Resolve next node based on user input.

        Args:
            node: Current node
            input_value: User input (e.g., DTMF digit)

        Returns:
            Next node ID or None if no match
        """
        # Check for explicit transitions first
        transitions = node.get("transitions", {})

        # Try exact match
        if input_value in transitions:
            return transitions[input_value]

        # Try timeout fallback
        if "timeout" in transitions:
            return transitions["timeout"]

        # Try static next field (for non-branching nodes)
        if "next" in node:
            return node["next"]

        return None

    def get_node_action(self, node: Dict[str, Any]) -> str:
        """
        Get Asterisk action for node type.

        Args:
            node: Node definition

        Returns:
            Action string: "DTMF_MENU", "RECORD", "HANGUP", "TOOL"
        """
        node_type = node.get("type", "prompt")

        if node_type == "prompt":
            return "DTMF_MENU"
        elif node_type == "record":
            return "RECORD"
        elif node_type == "tool":
            return "TOOL"
        elif node_type == "end":
            return "HANGUP"
        else:
            logger.warning(f"Unknown node type: {node_type}, defaulting to DTMF_MENU")
            return "DTMF_MENU"

    def get_node_text(self, node: Dict[str, Any]) -> str:
        """
        Get node text (prompt, message, etc.).

        Args:
            node: Node definition

        Returns:
            Node text or default
        """
        return node.get("text", "Please hold...")

    def should_collect_input(self, node: Dict[str, Any]) -> bool:
        """
        Check if node should collect user input.

        Args:
            node: Node definition

        Returns:
            True if node collects input
        """
        collect = node.get("collect")
        return collect in ["dtmf", "asr", "record"]

    def get_timeout(self, node: Dict[str, Any], default: int = 7) -> int:
        """
        Get node timeout in seconds.

        Args:
            node: Node definition
            default: Default timeout

        Returns:
            Timeout in seconds
        """
        return node.get("timeout", default)


# Helper functions for backward compatibility

def get_node(flow: Dict[str, Any], node_id: str) -> Optional[Dict[str, Any]]:
    """
    Get node from flow by ID.

    Args:
        flow: Agent OS flow JSONB
        node_id: Node identifier

    Returns:
        Node definition or None
    """
    return flow["nodes"].get(node_id)


def resolve_next(node: Dict[str, Any], input_value: str) -> Optional[str]:
    """
    Resolve next node based on user input.

    Args:
        node: Current node
        input_value: User input (e.g., DTMF digit)

    Returns:
        Next node ID or None
    """
    # Check transitions
    transitions = node.get("transitions", {})

    # Try exact match
    if input_value in transitions:
        return transitions[input_value]

    # Try timeout fallback
    if "timeout" in transitions:
        return transitions["timeout"]

    # Try static next
    if "next" in node:
        return node["next"]

    return None


# Default flow for agents without flow_config
DEFAULT_FLOW = {
    "start_node": "welcome",
    "nodes": {
        "welcome": {
            "type": "prompt",
            "text": "Welcome to Epic AI. Press 1 for sales, 2 for support, 3 for information, or 0 for an operator.",
            "collect": "dtmf",
            "timeout": 7,
            "transitions": {
                "1": "sales",
                "2": "support",
                "3": "information",
                "0": "operator",
                "timeout": "no_input"
            }
        },
        "sales": {
            "type": "prompt",
            "text": "Great! I can help you with sales. Press 1 to book a demo, 2 to speak with a sales representative, or 9 to go back to the main menu.",
            "collect": "dtmf",
            "timeout": 7,
            "transitions": {
                "1": "book_demo",
                "2": "transfer_sales",
                "9": "welcome",
                "timeout": "no_input"
            }
        },
        "support": {
            "type": "prompt",
            "text": "Support. Press 1 to leave a message, 2 to speak with a support agent, or 9 to go back.",
            "collect": "dtmf",
            "timeout": 7,
            "transitions": {
                "1": "leave_message",
                "2": "transfer_support",
                "9": "welcome",
                "timeout": "no_input"
            }
        },
        "information": {
            "type": "prompt",
            "text": "For hours, location, and pricing information, press 1 to leave a message or 9 to go back to the main menu.",
            "collect": "dtmf",
            "timeout": 7,
            "transitions": {
                "1": "leave_message",
                "9": "welcome",
                "timeout": "no_input"
            }
        },
        "operator": {
            "type": "prompt",
            "text": "Connecting you to an operator. Please hold.",
            "next": "transfer_operator"
        },
        "book_demo": {
            "type": "record",
            "text": "Please leave your name, company, and contact details after the beep. We'll get back to you within 24 hours to schedule your demo.",
            "next": "end"
        },
        "leave_message": {
            "type": "record",
            "text": "Please leave a detailed message after the beep, including your name and contact information.",
            "next": "end"
        },
        "transfer_sales": {
            "type": "transfer",
            "text": "Transferring you to sales. Please hold.",
            "transfer_to": "+15551234567",
            "next": "end"
        },
        "transfer_support": {
            "type": "transfer",
            "text": "Transferring you to support. Please hold.",
            "transfer_to": "+15551234567",
            "next": "end"
        },
        "transfer_operator": {
            "type": "transfer",
            "text": "Transferring you to an operator. Please hold.",
            "transfer_to": "+15551234567",
            "next": "end"
        },
        "no_input": {
            "type": "prompt",
            "text": "Sorry, I didn't receive your input. Please try again.",
            "collect": "dtmf",
            "timeout": 7,
            "transitions": {
                "timeout": "end"
            }
        },
        "end": {
            "type": "end",
            "text": "Thank you for calling. Goodbye!"
        }
    }
}
