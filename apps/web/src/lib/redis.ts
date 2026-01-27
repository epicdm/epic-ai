/**
 * Redis Connection for Web App
 *
 * Shared Redis connection for BullMQ queue operations from API routes.
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
 * Shared Redis connection for BullMQ queues in the web app.
 *
 * Configuration notes:
 * - maxRetriesPerRequest: null - Required for BullMQ blocking operations
 * - enableReadyCheck: false - Faster startup
 * - lazyConnect: true - Only connect when first command is issued
 */
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
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
  console.log('[Redis:Web] Connected to Redis server');
});

redis.on('error', (error: Error) => {
  console.error('[Redis:Web] Connection error:', error.message);
});

redis.on('close', () => {
  console.log('[Redis:Web] Connection closed');
});
