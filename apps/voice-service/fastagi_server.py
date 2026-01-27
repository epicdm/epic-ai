#!/usr/bin/env python3
"""
FastAGI Server for Epic AI Voice Service

Listens on TCP port 4573 for AGI connections from Asterisk.
Routes incoming calls to the appropriate handler based on the AGI request path.

Usage:
    python3 fastagi_server.py

FastAGI Protocol:
    1. Asterisk connects via TCP
    2. Sends AGI environment (key:value lines ending with blank line)
    3. Voice service responds with AGI commands
    4. Commands are executed by Asterisk
    5. Results returned to voice service

Supported endpoints:
    /route_to_agent - Route call to agent flow runtime

Environment Variables:
    FASTAGI_HOST - Host to bind to (default: 0.0.0.0)
    FASTAGI_PORT - Port to bind to (default: 4573)
"""

from __future__ import annotations
import os
import socketserver
import logging
from urllib.parse import urlparse, parse_qs
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class FastAGIHandler(socketserver.StreamRequestHandler):
    """
    Handles FastAGI connections from Asterisk.

    Each connection:
    1. Receives AGI environment
    2. Routes to appropriate handler based on path
    3. Sends AGI commands back to Asterisk
    """

    def handle(self):
        """Handle incoming FastAGI connection."""
        try:
            # Read AGI environment from Asterisk
            agi_env = self._read_agi_environment()

            # Parse AGI request URL
            agi_request = agi_env.get("agi_request", "")
            parsed = urlparse(agi_request)
            path = parsed.path or "/"
            qs = parse_qs(parsed.query)

            # Normalize query params (take first value for each key)
            params = {k: (v[0] if v else "") for k, v in qs.items()}

            logger.info(f"[FastAGI] Incoming request: {path}")
            logger.debug(f"[FastAGI] Params: {params}")
            logger.debug(f"[FastAGI] Environment: {agi_env}")

            # Create AGI IO wrapper
            agi_io = {
                "rfile": self.rfile,
                "wfile": self.wfile
            }

            # Route to handler based on path
            if path == "/route_to_agent":
                self._handle_route_to_agent(agi_env, params, agi_io)
            else:
                logger.warning(f"[FastAGI] Unknown path: {path}")
                self._send_command(agi_io, "HANGUP")

        except Exception as e:
            logger.error(f"[FastAGI] Error handling request: {e}", exc_info=True)
            try:
                self._send_command({"wfile": self.wfile}, "HANGUP")
            except:
                pass

    def _read_agi_environment(self) -> Dict[str, str]:
        """
        Read AGI environment from Asterisk.

        Format: key:value lines ending with blank line

        Returns:
            Dictionary of AGI environment variables
        """
        agi_env = {}
        while True:
            line = self.rfile.readline().decode("utf-8", errors="ignore").strip()
            if not line:
                break
            if ":" in line:
                k, v = line.split(":", 1)
                agi_env[k.strip()] = v.strip()
        return agi_env

    def _send_command(self, agi_io: Dict[str, Any], command: str) -> str:
        """
        Send AGI command to Asterisk and read response.

        Args:
            agi_io: AGI IO wrapper with wfile/rfile
            command: AGI command string

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

    def _handle_route_to_agent(
        self,
        agi_env: Dict[str, str],
        params: Dict[str, str],
        agi_io: Dict[str, Any]
    ):
        """
        Handle /route_to_agent endpoint.

        Routes call to agent flow runtime. Expected params:
        - voiceAgentId: Agent ID
        - sessionId: Session ID
        - callId: Call ID
        - did: DID number
        - caller: Caller phone number
        - jobId: Callback job ID (optional)

        Args:
            agi_env: AGI environment from Asterisk
            params: Query parameters from AGI request
            agi_io: AGI IO wrapper
        """
        try:
            # Import route_to_agent handler
            # This should already exist or be created
            from route_to_agent import handle_agi_route_to_agent

            logger.info(f"[FastAGI] Routing to agent: {params.get('voiceAgentId')}")

            # Delegate to route_to_agent handler
            handle_agi_route_to_agent(agi_env, params, agi_io)

        except ImportError:
            logger.error("[FastAGI] route_to_agent module not found")
            self._send_command(agi_io, "VERBOSE \"Route to agent not available\" 1")
            self._send_command(agi_io, "HANGUP")
        except Exception as e:
            logger.error(f"[FastAGI] Error in route_to_agent: {e}", exc_info=True)
            self._send_command(agi_io, "HANGUP")


def serve(host: str = "0.0.0.0", port: int = 4573):
    """
    Start FastAGI server.

    Args:
        host: Host to bind to
        port: Port to bind to
    """
    logger.info(f"[FastAGI] Starting server on {host}:{port}")

    with socketserver.TCPServer((host, port), FastAGIHandler) as server:
        server.allow_reuse_address = True
        logger.info(f"[FastAGI] Server ready. Waiting for connections...")

        try:
            server.serve_forever()
        except KeyboardInterrupt:
            logger.info("[FastAGI] Server shutting down...")


if __name__ == "__main__":
    # Get host/port from environment
    host = os.getenv("FASTAGI_HOST", "0.0.0.0")
    port = int(os.getenv("FASTAGI_PORT", "4573"))

    serve(host=host, port=port)
