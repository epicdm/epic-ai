/**
 * Live Session Reader
 *
 * Fetches live session state from the session endpoint.
 * Used for monitoring active calls and escalation status.
 *
 * Integration: Transfer Tool Adapter Pack v1
 */

export interface SessionData {
  sessionId: string;
  state?: string;
  escalated?: string;
  escalation_reason?: string;
  escalation_target?: string;
  escalation_node?: string;
  escalation_agent_id?: string;
  escalation_at?: string;
  escalation_attempted?: string;
  escalation_attempted_at?: string;
  escalation_error?: string;
  updated_at?: string;
  [key: string]: string | undefined;
}

export interface SessionResponse {
  data: SessionData | null;
  confidence: Record<string, unknown>;
  gaps: string[];
  warnings: Array<{
    code: string;
    message: string;
    severity: "info" | "warning" | "error";
  }>;
}

/**
 * Fetch live session state from Redis
 *
 * @param sessionId Session identifier
 * @returns Session data or null if not found
 */
export async function getLiveSession(
  sessionId: string
): Promise<SessionResponse> {
  try {
    const params = new URLSearchParams({ sessionId });
    const response = await fetch(
      `/api/telephony/session?${params.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      return {
        data: null,
        confidence: {},
        gaps: [],
        warnings: [
          {
            code: "FETCH_ERROR",
            message: `HTTP ${response.status}`,
            severity: "error",
          },
        ],
      };
    }

    return await response.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      data: null,
      confidence: {},
      gaps: [],
      warnings: [
        {
          code: "NETWORK_ERROR",
          message,
          severity: "error",
        },
      ],
    };
  }
}

/**
 * Check if session has been escalated
 */
export function isEscalated(session: SessionData | null | undefined): boolean {
  if (!session) return false;
  return session.escalated === "true" || session.state === "ESCALATED";
}

/**
 * Get escalation details if escalated
 */
export function getEscalationDetails(session: SessionData | null | undefined) {
  if (!session || !isEscalated(session)) {
    return null;
  }

  return {
    reason: session.escalation_reason || "Unknown reason",
    target: session.escalation_target,
    node: session.escalation_node,
    agentId: session.escalation_agent_id,
    timestamp: session.escalation_at,
    error: session.escalation_error,
  };
}

/**
 * Poll session state until escalated or timeout
 *
 * @param sessionId Session identifier
 * @param maxPollMs Maximum time to poll (default 60000 = 60s)
 * @param pollIntervalMs Interval between polls (default 1000 = 1s)
 * @returns Final session state or null if timeout
 */
export async function pollUntilEscalated(
  sessionId: string,
  maxPollMs: number = 60000,
  pollIntervalMs: number = 1000
): Promise<SessionData | null> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxPollMs) {
    const response = await getLiveSession(sessionId);

    if (response.data && isEscalated(response.data)) {
      return response.data;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return null;
}
