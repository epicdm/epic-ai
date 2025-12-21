/**
 * Redis Connection Singleton for BullMQ Workers
 *
 * This module provides a shared Redis connection configured for BullMQ.
 * Uses ioredis with settings optimized for queue operations.
 *
 * @module lib/redis
 */

import Redis from 'ioredis';

/**
 * Environment variable for Redis connection
 * Expected format: redis://[:password@]host:port
 */
const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error('REDIS_URL environment variable is required');
}

/**
 * Shared Redis connection for all BullMQ queues and workers.
 *
 * Configuration notes:
 * - maxRetriesPerRequest: null - Required for BullMQ blocking operations
 * - enableReadyCheck: false - Faster startup, Upstash handles readiness
 * - lazyConnect: true - Only connect when first command is issued
 */
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ (allows infinite retries for blocking commands)
  enableReadyCheck: false, // Faster startup, skip ready check
  lazyConnect: true, // Connect lazily on first use
  retryStrategy: (times: number) => {
    // Exponential backoff with max 30 seconds
    const delay = Math.min(times * 1000, 30000);
    return delay;
  },
});

/**
 * Connection event handlers for logging
 */
redis.on('connect', () => {
  console.log('[Redis] Connected to Redis server');
});

redis.on('ready', () => {
  console.log('[Redis] Redis connection ready');
});

redis.on('error', (error: Error) => {
  console.error('[Redis] Connection error:', error.message);
});

redis.on('close', () => {
  console.log('[Redis] Connection closed');
});

redis.on('reconnecting', () => {
  console.log('[Redis] Reconnecting...');
});

/**
 * Creates a duplicate Redis connection for BullMQ.
 * BullMQ requires separate connections for queue and worker.
 *
 * @returns A new Redis instance with the same configuration
 */
export function createRedisConnection(): Redis {
  return new Redis(REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 1000, 30000);
      return delay;
    },
  });
}

/**
 * Gracefully closes the Redis connection.
 * Call this during application shutdown.
 */
export async function closeRedisConnection(): Promise<void> {
  if (redis.status === 'ready' || redis.status === 'connecting') {
    await redis.quit();
    console.log('[Redis] Connection gracefully closed');
  }
}
