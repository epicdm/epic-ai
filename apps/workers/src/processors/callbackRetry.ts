/**
 * Callback Retry Processor
 *
 * Handles retry of failed callback jobs.
 * Fetches original payload from Redis and re-originates the call.
 *
 * @module processors/callbackRetry
 */

import type { Job } from "bullmq";
import { redis } from "../lib/redis";
import { CallbackRequestedPayloadSchema } from "@epic-ai/shared";
import { callbackRequestedProcessor } from "./callbackRequested";

/**
 * Process callback retry job
 *
 * Fetches original callback payload from Redis and re-executes
 * the callback request processor.
 *
 * @param job - BullMQ retry job with originalJobId
 * @returns Result from re-originated call
 */
export async function callbackRetryProcessor(job: Job) {
  const originalJobId = String(job.data?.originalJobId || "");

  if (!originalJobId) {
    throw new Error("Missing originalJobId in retry job");
  }

  console.log("[callback.retry] Processing retry", {
    retryJobId: job.id,
    originalJobId,
  });

  // Fetch original payload from Redis
  const key = `callback:payload:${originalJobId}`;
  const raw = await redis.get(key);

  if (!raw) {
    throw new Error(
      `No stored payload found for originalJobId=${originalJobId}`
    );
  }

  // Parse and validate payload
  const payload = CallbackRequestedPayloadSchema.parse(JSON.parse(raw));

  console.log("[callback.retry] Retrieved payload", {
    voiceAgentId: payload.voiceAgentId,
    caller: payload.caller,
  });

  // Create shim job with original ID to maintain outcome tracking
  // This ensures the retry uses the same job ID for event correlation
  const shimJob = {
    id: originalJobId,
    data: payload,
  } as any;

  // Reuse the main callback processor
  const result = await callbackRequestedProcessor(shimJob);

  console.log("[callback.retry] Retry result", {
    originalJobId,
    ok: result.ok,
  });

  return result;
}
