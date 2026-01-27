/**
 * Asterisk AMI (Manager Interface) Client
 *
 * Connects to Asterisk AMI to send commands like Originate.
 * Used by callback processor to trigger outbound calls.
 *
 * @module lib/asterisk-ami
 */

import net from "node:net";

type AmiOptions = {
  host: string;
  port: number;
  username: string;
  secret: string;
  timeoutMs?: number;
};

/**
 * Encode AMI command as key:value pairs
 * AMI packet ends with \r\n\r\n
 */
function amiEncode(obj: Record<string, any>): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    lines.push(`${k}: ${String(v)}`);
  }
  return lines.join("\r\n") + "\r\n\r\n";
}

/**
 * Asterisk Manager Interface Client
 *
 * Provides async/await interface for AMI commands.
 * Handles login, command execution, and response parsing.
 */
export class AmiClient {
  private sock: net.Socket | null = null;
  private buffer = "";
  private connected = false;

  constructor(private opts: AmiOptions) {}

  /**
   * Connect to AMI and authenticate
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    this.sock = net.createConnection(
      { host: this.opts.host, port: this.opts.port },
      () => {}
    );

    this.sock.setTimeout(this.opts.timeoutMs ?? 8000);

    // Wait for greeting banner
    await new Promise<void>((resolve, reject) => {
      if (!this.sock) return reject(new Error("No socket"));
      this.sock.once("error", reject);
      this.sock.once("timeout", () => reject(new Error("AMI timeout")));
      this.sock.once("data", () => resolve()); // greeting banner
    });

    // Login
    await this.action({
      Action: "Login",
      Username: this.opts.username,
      Secret: this.opts.secret,
      Events: "off",
    });

    this.connected = true;
  }

  /**
   * Close AMI connection
   */
  async close(): Promise<void> {
    try {
      if (this.sock) this.sock.end();
    } finally {
      this.sock = null;
      this.connected = false;
    }
  }

  /**
   * Send AMI action and wait for response
   *
   * @param payload - AMI command object (e.g., { Action: "Originate", ... })
   * @returns Response object with Response, Message, etc.
   */
  async action(payload: Record<string, any>): Promise<Record<string, string>> {
    if (!this.sock) throw new Error("AMI not connected");

    const actionId = payload.ActionID ?? `act-${Date.now()}-${Math.random()}`;
    const packet = amiEncode({ ...payload, ActionID: actionId });

    const sock = this.sock;
    sock.write(packet);

    // Read until we get a Response for that ActionID
    return await new Promise((resolve, reject) => {
      let done = false;

      const onData = (chunk: Buffer) => {
        this.buffer += chunk.toString("utf8");

        // AMI messages separated by \r\n\r\n
        while (this.buffer.includes("\r\n\r\n")) {
          const idx = this.buffer.indexOf("\r\n\r\n");
          const raw = this.buffer.slice(0, idx);
          this.buffer = this.buffer.slice(idx + 4);

          const msg: Record<string, string> = {};
          for (const line of raw.split("\r\n")) {
            const i = line.indexOf(":");
            if (i > 0) {
              const k = line.slice(0, i).trim();
              const v = line.slice(i + 1).trim();
              msg[k] = v;
            }
          }

          // Match response by ActionID
          if (msg.ActionID === String(actionId) && msg.Response) {
            done = true;
            sock.off("data", onData);
            sock.off("error", onErr);

            if (msg.Response.toLowerCase() === "error") {
              return reject(new Error(msg.Message || "AMI error"));
            }
            return resolve(msg);
          }
        }
      };

      const onErr = (err: any) => {
        if (done) return;
        sock.off("data", onData);
        reject(err);
      };

      sock.on("data", onData);
      sock.once("error", onErr);
    });
  }
}

// =============================================================================
// V2: Simplified AMI Client (function-based, single action per connection)
// =============================================================================

export type AmiConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  timeoutMs?: number;
};

export type AmiResponse = {
  raw: string;
  headers: Record<string, string>;
};

/**
 * Minimal AMI client: connect -> login -> send action -> read response -> logoff.
 * v1 is intentionally simple and synchronous per job.
 */
export async function amiSendAction(
  cfg: AmiConfig,
  actionLines: string[]
): Promise<AmiResponse> {
  const timeoutMs = cfg.timeoutMs ?? 8000;

  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: cfg.host, port: cfg.port });

    let buffer = "";
    let settled = false;

    const finish = (err?: Error, res?: AmiResponse) => {
      if (settled) return;
      settled = true;
      try {
        socket.end();
        socket.destroy();
      } catch {}
      if (err) reject(err);
      else if (res) resolve(res);
      else reject(new Error("AMI: Unknown failure"));
    };

    const timer = setTimeout(() => {
      finish(new Error(`AMI timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.on("error", (e) => {
      clearTimeout(timer);
      finish(e as Error);
    });

    socket.on("connect", () => {
      // Wait for AMI banner then login
      // We'll just send login immediately; Asterisk tolerates it.
      const login =
        [
          "Action: Login",
          `Username: ${cfg.username}`,
          `Secret: ${cfg.password}`,
          "Events: off",
          "",
          "",
        ].join("\r\n");

      socket.write(login);

      // After login, send our action
      const action =
        [...actionLines, "", ""].join("\r\n");

      socket.write(action);

      // Logoff after action
      const logoff = ["Action: Logoff", "", ""].join("\r\n");
      socket.write(logoff);
    });

    socket.on("data", (data) => {
      buffer += data.toString("utf8");

      // We consider it "done" when we see a Logoff response or socket is large enough.
      // AMI responses are separated by \r\n\r\n blocks.
      // We'll resolve once we see at least one "Response:" after our action.
      if (buffer.includes("Response:") && buffer.includes("ActionID:")) {
        clearTimeout(timer);

        // Parse the last response block
        const blocks = buffer.split("\r\n\r\n").filter(Boolean);
        const last = blocks[blocks.length - 1] ?? buffer;

        const headers: Record<string, string> = {};
        for (const line of last.split("\r\n")) {
          const idx = line.indexOf(":");
          if (idx > 0) {
            const k = line.slice(0, idx).trim();
            const v = line.slice(idx + 1).trim();
            headers[k] = v;
          }
        }

        finish(undefined, { raw: buffer, headers });
      }
    });

    socket.on("close", () => {
      // if closed before we settled, it means we didn't get response
      if (!settled) {
        clearTimeout(timer);
        finish(new Error("AMI closed before response"));
      }
    });
  });
}
