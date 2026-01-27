import { z } from "zod";

/**
 * Callback Requested Job Payload
 *
 * Used when scheduling a callback job via BullMQ.
 */
export const CallbackRequestedPayloadSchema = z.object({
  voiceAgentId: z.string().min(1),
  sessionId: z.string().min(1),
  callId: z.string().optional(),
  did: z.string().optional(),
  caller: z.string().min(1),

  // Callback timing
  callbackWindow: z.string().optional(), // e.g. "tomorrow_morning"
  callbackLabel: z.string().optional(), // e.g. "Tomorrow morning"
  callbackTimeIso: z.string().optional(), // ISO timestamp
  timezone: z.string().optional(), // default "America/Dominica"

  // Optional: qualification answers snapshot
  answers: z.record(z.string(), z.string()).optional(),

  // Optional: external references
  leadId: z.string().optional(),
});

export type CallbackRequestedPayload = z.infer<
  typeof CallbackRequestedPayloadSchema
>;
