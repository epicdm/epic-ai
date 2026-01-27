/**
 * AMI Client - Asterisk Manager Interface wrapper
 *
 * Low-level AMI action execution for PBX control.
 * Handles connection, action formatting, and response parsing.
 */

import net from "net";

export interface AmiConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  timeoutMs?: number;
}

export interface AmiActionParams {
  [key: string]: string;
}

export interface AmiResponse {
  ok: boolean;
  response: Record<string, string>;
  raw: string[];
  error?: string;
}

/**
 * Parse response blocks from AMI
 * Multiple blocks separated by blank lines
 */
function parseBlocks(data: string): string[][] {
  const lines = data.split("\r\n");
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    if (line.trim() === "") {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  return blocks;
}

/**
 * Parse header lines into key-value pairs
 */
function parseHeaders(lines: string[]): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      headers[key] = value;
    }
  }

  return headers;
}

/**
 * Execute AMI action via TCP connection
 *
 * @param cfg AMI configuration (host, port, credentials)
 * @param actionParams Action to execute as key-value pairs
 * @returns Response with ok flag and parsed headers
 */
export function amiAction(
  cfg: AmiConfig,
  actionParams: AmiActionParams
): Promise<AmiResponse> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(
      {
        host: cfg.host,
        port: cfg.port,
      },
      () => {
        // Connected - send auth
        let lineBuffer = "";
        let authSent = false;
        let actionSent = false;
        const responseLines: string[] = [];
        const timeoutHandle = setTimeout(() => {
          socket.destroy();
          reject(new Error("AMI timeout"));
        }, cfg.timeoutMs || 5000);

        socket.on("data", (chunk) => {
          lineBuffer += chunk.toString();
          const lines = lineBuffer.split("\r\n");

          // Keep last incomplete line in buffer
          lineBuffer = lines.pop() || "";

          for (const line of lines) {
            responseLines.push(line);

            // Send auth after receiving banner
            if (!authSent && line.includes("Asterisk Call Manager")) {
              authSent = true;
              const authAction = [
                "Action: Login",
                `Username: ${cfg.username}`,
                `Secret: ${cfg.password}`,
                "ActionID: auth",
                "",
              ].join("\r\n");
              socket.write(authAction);
            }

            // Send action after successful auth
            if (
              !actionSent &&
              authSent &&
              line.includes("Authentication accepted")
            ) {
              actionSent = true;
              const action = [
                ...Object.entries(actionParams)
                  .map(([k, v]) => `${k}: ${v}`)
                  .sort(),
                "",
              ].join("\r\n");
              socket.write(action);
            }

            // Check for completion
            if (
              actionSent &&
              (line.includes("Response:") ||
                line.includes("Event:") ||
                line.includes("Message:"))
            ) {
              // Wait a bit more for complete response
              setTimeout(() => {
                clearTimeout(timeoutHandle);
                socket.destroy();

                const blocks = parseBlocks(responseLines.join("\r\n"));

                // Find response block (skip auth response)
                let responseBlock: Record<string, string> = {};
                for (const block of blocks) {
                  const headers = parseHeaders(block);
                  if (
                    headers["ActionID"] &&
                    headers["ActionID"] !== "auth" &&
                    (headers["Response"] || headers["Message"])
                  ) {
                    responseBlock = headers;
                    break;
                  }
                }

                const success =
                  responseBlock["Response"]?.toLowerCase() === "success" ||
                  responseBlock["Response"]?.toLowerCase() === "follows" ||
                  responseBlock["Message"]?.includes("successfully");

                resolve({
                  ok: success,
                  response: responseBlock,
                  raw: responseLines,
                  error: success ? undefined : responseBlock["Message"],
                });
              }, 100);
            }
          }
        });

        socket.on("error", (err) => {
          clearTimeout(timeoutHandle);
          reject(err);
        });

        socket.on("close", () => {
          clearTimeout(timeoutHandle);
        });
      }
    );

    socket.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Get AMI config from environment variables
 */
export function getAmiConfigFromEnv(): AmiConfig {
  const host = process.env.ASTERISK_AMI_HOST || "127.0.0.1";
  const port = Number(process.env.ASTERISK_AMI_PORT) || 5038;
  const username = process.env.ASTERISK_AMI_USER || "admin";
  const password = process.env.ASTERISK_AMI_PASS || "secret";
  const timeoutMs = Number(process.env.ASTERISK_AMI_TIMEOUT_MS) || 5000;

  return { host, port, username, password, timeoutMs };
}
