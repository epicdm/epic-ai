"""
Asterisk AMI Client for Redirect
Minimal implementation for channel redirects via AMI socket connection
"""
import os
import socket
import time
from typing import Optional, Dict, Any


class AsteriskAMI:
    """
    Minimal AMI client for Redirect.
    Works with standard Asterisk AMI (tcp).
    """

    def __init__(self):
        self.host = os.getenv("ASTERISK_AMI_HOST", "127.0.0.1")
        self.port = int(os.getenv("ASTERISK_AMI_PORT", "5038"))
        self.username = os.getenv("ASTERISK_AMI_USERNAME", "admin")
        self.secret = os.getenv("ASTERISK_AMI_SECRET", "admin")
        self.timeout = float(os.getenv("ASTERISK_AMI_TIMEOUT", "3.0"))

    def _recv_until(self, sock: socket.socket, sentinel=b"\r\n\r\n", max_bytes=65536) -> bytes:
        """Receive data until sentinel is found or max_bytes reached"""
        sock.settimeout(self.timeout)
        buf = b""
        while sentinel not in buf and len(buf) < max_bytes:
            chunk = sock.recv(4096)
            if not chunk:
                break
            buf += chunk
        return buf

    def _send_action(self, sock: socket.socket, action: Dict[str, Any]) -> str:
        """Send an AMI action and receive the response"""
        payload = ""
        for k, v in action.items():
            if v is None:
                continue
            payload += f"{k}: {v}\r\n"
        payload += "\r\n"
        sock.sendall(payload.encode("utf-8"))
        raw = self._recv_until(sock)
        return raw.decode("utf-8", errors="ignore")

    def _login(self, sock: socket.socket) -> None:
        """Authenticate with AMI server"""
        # greet
        _ = self._recv_until(sock)
        resp = self._send_action(sock, {
            "Action": "Login",
            "Username": self.username,
            "Secret": self.secret,
            "Events": "off",
        })
        if "Response: Success" not in resp:
            raise RuntimeError(f"AMI login failed: {resp}")

    def redirect(
        self,
        channel: str,
        context: str,
        exten: str,
        priority: int = 1,
        extra_channel: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Redirect a single channel (and optionally the bridged/other channel) to a new dialplan location.

        Args:
            channel: Asterisk channel to redirect (e.g., "PJSIP/alice-00000001")
            context: Target dialplan context (e.g., "sales_queue")
            exten: Target extension (e.g., "1")
            priority: Target priority in dialplan (default 1)
            extra_channel: Optional bridged/other leg to redirect

        Returns:
            Dict with keys:
                - ok: bool (True if redirect succeeded)
                - response: str (AMI response)
                - duration_ms: int (elapsed time)
        """
        started = time.time()
        sock = socket.create_connection((self.host, self.port), timeout=self.timeout)
        try:
            self._login(sock)
            action = {
                "Action": "Redirect",
                "Channel": channel,
                "Context": context,
                "Exten": exten,
                "Priority": priority,
            }
            # Optionally move the other leg too (very common for transfers)
            if extra_channel:
                action["ExtraChannel"] = extra_channel
                action["ExtraContext"] = context
                action["ExtraExten"] = exten
                action["ExtraPriority"] = priority

            resp = self._send_action(sock, action)

            ok = "Response: Success" in resp
            return {
                "ok": ok,
                "response": resp,
                "duration_ms": int((time.time() - started) * 1000),
            }
        finally:
            try:
                sock.close()
            except Exception:
                pass
