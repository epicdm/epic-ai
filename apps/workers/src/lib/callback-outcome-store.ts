/**
 * Callback Outcome Store
 *
 * Redis-based storage for callback job outcomes and correlation data.
 * Used by AMI event listener to track call progress and outcomes.
 *
 * @module lib/callback-outcome-store
 */

import { redis } from "./redis";

const TTL_SECONDS = 60 * 60 * 24; // 24 hours

/**
 * Save callback outcome data to Redis
 *
 * Stores outcome fields in a hash, updates existing fields.
 * Sets TTL to 24 hours.
 *
 * @param jobId - BullMQ job ID
 * @param data - Outcome data to store
 */
export async function saveCallbackOutcome(
  jobId: string,
  data: Record<string, any>
): Promise<void> {
  const key = `callback:job:${jobId}`;

  // Convert all values to strings for Redis hash
  const stringData: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== null && v !== undefined) {
      stringData[k] = String(v);
    }
  }

  // Use Redis pipeline for atomic operation
  const pipeline = redis.pipeline();
  pipeline.hset(key, stringData);
  pipeline.expire(key, TTL_SECONDS);
  await pipeline.exec();
}

/**
 * Get callback outcome data from Redis
 *
 * @param jobId - BullMQ job ID
 * @returns Outcome data or null if not found
 */
export async function getCallbackOutcome(
  jobId: string
): Promise<Record<string, string> | null> {
  const key = `callback:job:${jobId}`;
  const data = await redis.hgetall(key);

  return Object.keys(data).length > 0 ? data : null;
}

/**
 * Link Asterisk Uniqueid to job ID
 *
 * Allows looking up job ID from Hangup events.
 *
 * @param uniqueid - Asterisk channel uniqueid
 * @param jobId - BullMQ job ID
 */
export async function linkUniqueIdToJob(
  uniqueid: string,
  jobId: string
): Promise<void> {
  const key = `callback:uniqueid:${uniqueid}`;
  await redis.set(key, jobId, "EX", TTL_SECONDS);
}

/**
 * Look up job ID by Asterisk Uniqueid
 *
 * @param uniqueid - Asterisk channel uniqueid
 * @returns Job ID or null if not found
 */
export async function lookupJobByUniqueId(
  uniqueid: string
): Promise<string | null> {
  const key = `callback:uniqueid:${uniqueid}`;
  return await redis.get(key);
}
