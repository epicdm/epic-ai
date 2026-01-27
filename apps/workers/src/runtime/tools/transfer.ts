/**
 * Transfer Tool Adapter
 * Handles channel redirects via AMI (Asterisk Manager Interface)
 * Routes calls to new dialplan contexts based on policy-resolved targets
 */

export interface TransferTarget {
  context: string;
  exten: string;
  priority?: number;
}

export interface TransferArgs {
  target: TransferTarget;
  extra_channel?: string;
}

export interface LiveSession {
  call_id?: string;
  asterisk_channel?: string;
  asterisk_other_channel?: string;
  [key: string]: any;
}

export interface TransferResult {
  ok: boolean;
  code?: number;
  message?: string;
  data?: {
    ok: boolean;
    response: string;
    duration_ms: number;
  };
}

/**
 * Execute transfer tool to redirect a channel to new dialplan location.
 *
 * This function:
 * 1. Retrieves the Asterisk channel from the live session
 * 2. Calls the voice-service /telephony/transfer endpoint
 * 3. Handles missing channel gracefully
 * 4. Returns standardized result with ok/code/message/data structure
 *
 * @param session - Live session object containing call context
 * @param args - Transfer arguments with target dialplan location
 * @returns Transfer result with AMI response details
 */
export async function executeTransferTool(
  session: LiveSession,
  args: TransferArgs
): Promise<TransferResult> {
  try {
    // Extract Asterisk channel from session
    const channel = session.asterisk_channel;
    if (!channel) {
      console.warn(
        `Transfer requested but no Asterisk channel in session ${session.call_id}`
      );
      return {
        ok: false,
        code: 400,
        message: "No Asterisk channel available for transfer",
      };
    }

    // Build request payload
    const voiceServiceUrl =
      process.env.VOICE_SERVICE_URL || "http://localhost:8000";
    const requestBody = {
      channel: channel,
      context: args.target.context,
      exten: args.target.exten,
      priority: args.target.priority || 1,
      extra_channel: args.extra_channel || session.asterisk_other_channel,
    };

    console.info(
      `Transfer: channel=${channel} target=${args.target.context}/${args.target.exten}`
    );

    // Call voice-service transfer endpoint
    const response = await fetch(`${voiceServiceUrl}/telephony/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(
        `Transfer failed: ${response.status} - ${JSON.stringify(result)}`
      );
      return {
        ok: false,
        code: response.status,
        message: result.error || "Transfer endpoint error",
        data: result.details,
      };
    }

    if (!result.ok) {
      console.error(`Transfer AMI error: ${result.error}`);
      return {
        ok: false,
        code: 502,
        message: "AMI redirect failed",
        data: result.details,
      };
    }

    console.info(
      `Transfer succeeded: ${result.data.duration_ms}ms, channel=${channel}`
    );

    return {
      ok: true,
      code: 200,
      message: "Transfer completed",
      data: result.data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Transfer tool error: ${message}`);
    return {
      ok: false,
      code: 500,
      message: `Transfer error: ${message}`,
    };
  }
}
