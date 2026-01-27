/**
 * Session Events Logger
 *
 * Redis-based session event tracking for escalations and state changes.
 * Follows the callback outcome pattern from callback system.
 *
 * Part of Transfer Tool Adapter Pack v1
 */

import Redis from "ioredis";

/**
 * Write session event to Redis
 *
 * Updates session hash with new fields. All values stored as strings.
 * TTL configurable via SESSION_TTL_SECONDS environment variable (default 86400 = 24h).
 *
 * @param sessionId Session identifier
 * @param patch Fields to update in session hash
 */
export async function writeSessionEvent(
  sessionId: string,
  patch: Record<string, string>
): Promise<void> {
  try {
    const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

    const sessionKey = `session:${sessionId}`;

    // Add timestamp if not provided
    if (!patch.updated_at) {
      patch.updated_at = new Date().toISOString();
    }

    // Write all fields to hash
    await redis.hset(sessionKey, patch);

    // Set TTL (default 24 hours)
    const ttlSeconds = Number(process.env.SESSION_TTL_SECONDS) || 86400;
    await redis.expire(sessionKey, ttlSeconds);

    console.log("[session-events] Wrote session event", {
      sessionId,
      fields: Object.keys(patch),
      ttl: ttlSeconds,
    });

    await redis.quit();
  } catch (err) {
    console.error("[session-events] Failed to write session event", {
      sessionId,
      error: err,
    });
    // Non-critical - don't fail the operation
  }
}

/**
 * Read session event from Redis
 *
 * @param sessionId Session identifier
 * @returns Session hash as key-value pairs
 */
export async function readSessionEvent(
  sessionId: string
): Promise<Record<string, string> | null> {
  try {
    const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

    const sessionKey = `session:${sessionId}`;
    const data = await redis.hgetall(sessionKey);

    await redis.quit();

    return Object.keys(data).length > 0 ? data : null;
  } catch (err) {
    console.error("[session-events] Failed to read session event", {
      sessionId,
      error: err,
    });
    return null;
  }
}
