/**
 * Transfer to Human Tool Adapter
 *
 * Executes call transfer from AI agent to human via Flask voice-service endpoint.
 * Calls /telephony/transfer which handles AMI Redirect via Asterisk Manager Interface.
 * Validates channel, executes redirect, returns structured result.
 *
 * Part of Transfer Tool Adapter Pack v1
 */

export interface TransferToHumanInput {
  /** Active Asterisk channel (e.g., "PJSIP/+17675551234-00000001") */
  channel: string;
  /** Dialplan context (e.g., "sales_queue") */
  context: string;
  /** Dialplan extension (usually "1") */
  exten: string;
  /** Dialplan priority (usually 1) */
  priority?: number;
  /** Reason for transfer (for logging) */
  reason?: string;
  /** AMI timeout override */
  timeoutMs?: number;
}

export interface TransferToHumanResult {
  ok: boolean;
  message: string;
  redirected_to: {
    context: string;
    exten: string;
    priority: number;
  };
  reason?: string;
  ami_response?: Record<string, string>;
  timestamp: string;
}

/**
 * Validate channel name format
 */
function validateChannel(channel: string): boolean {
  // Basic validation: should contain / and hyphen
  // Examples: PJSIP/+17675551234-00000001, SIP/1001-00000abc
  return /^[A-Z0-9]+\/[^-]+-[a-z0-9]+$/i.test(channel);
}

/**
 * Execute transfer to human via Flask voice-service endpoint.
 * Calls /telephony/transfer which handles AMI Redirect via Asterisk Manager Interface.
 */
export async function transferToHuman(
  input: TransferToHumanInput
): Promise<TransferToHumanResult> {
  const { channel, context, exten, priority = 1, reason, timeoutMs } = input;
  const timestamp = new Date().toISOString();

  console.log("[transfer-to-human] Executing call transfer", {
    channel,
    context,
    exten,
    priority,
    reason,
  });

  // Validate channel
  if (!validateChannel(channel)) {
    const message = `Invalid channel format: ${channel}`;
    console.error("[transfer-to-human] Validation failed", { message });

    return {
      ok: false,
      message,
      redirected_to: { context, exten, priority },
      reason,
      timestamp,
    };
  }

  try {
    // Get voice service URL from environment
    const voiceServiceUrl =
      process.env.VOICE_SERVICE_URL || "http://localhost:8000";

    // Build request payload
    const requestBody = {
      channel,
      context,
      exten,
      priority,
    };

    console.log("[transfer-to-human] Calling voice-service transfer endpoint", {
      voiceServiceUrl,
      body: requestBody,
    });

    // Call Flask /telephony/transfer endpoint
    const controller = new AbortController();
    const timeout = timeoutMs || 5000;
    const timeoutHandle = setTimeout(() => controller.abort(), timeout);

    let response: Response;
    try {
      response = await fetch(`${voiceServiceUrl}/telephony/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutHandle);
    }

    const result = await response.json();

    if (!response.ok) {
      const message = result.error || `HTTP ${response.status}`;
      console.error("[transfer-to-human] Transfer endpoint error", {
        channel,
        status: response.status,
        error: message,
      });

      return {
        ok: false,
        message,
        redirected_to: { context, exten, priority },
        reason,
        ami_response: result.details,
        timestamp,
      };
    }

    if (!result.ok) {
      const message = result.error || "AMI redirect failed";
      console.error("[transfer-to-human] AMI redirect failed", {
        channel,
        message,
        details: result.details,
      });

      return {
        ok: false,
        message,
        redirected_to: { context, exten, priority },
        reason,
        ami_response: result.details,
        timestamp,
      };
    }

    console.log("[transfer-to-human] Transfer successful", {
      channel,
      context,
      exten,
      priority,
      duration_ms: result.data?.duration_ms,
    });

    return {
      ok: true,
      message: `Call redirected to ${context}/${exten}/${priority}`,
      redirected_to: { context, exten, priority },
      reason,
      ami_response: result.data,
      timestamp,
    };
  } catch (err: any) {
    const message = err?.message || "Unknown error";
    console.error("[transfer-to-human] Exception during transfer", {
      channel,
      error: message,
      stack: err?.stack,
    });

    return {
      ok: false,
      message: `Transfer failed: ${message}`,
      redirected_to: { context, exten, priority },
      reason,
      timestamp,
    };
  }
}
