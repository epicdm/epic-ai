import { Redis } from "ioredis";

export function keyForJob(jobId: string) {
  // Must match what your polling API reads
  // e.g. GET /api/telephony/callback/outcome?jobId=... expects this hash
  return `callback:job:${jobId}`;
}

export type CallbackOutcomePatch = Record<string, string | number | boolean | null | undefined>;

function toStringMap(patch: CallbackOutcomePatch): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v === null) out[k] = "";
    else out[k] = String(v);
  }
  return out;
}

/**
 * Writes/updates the job outcome hash in Redis.
 * v1 uses HSET only (no JSON), so the UI can read simple strings.
 */
export async function writeOutcome(redis: Redis, jobId: string, patch: CallbackOutcomePatch) {
  const key = keyForJob(jobId);
  const payload = toStringMap({
    ...patch,
    updated_at: new Date().toISOString(),
  });

  if (Object.keys(payload).length === 0) return;
  await redis.hset(key, payload);

  // Optional: keep outcomes for 7 days
  await redis.expire(key, 60 * 60 * 24 * 7);
}
