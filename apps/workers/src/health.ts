/**
 * Health Check HTTP Server
 *
 * Provides a simple HTTP endpoint for health checks and metrics.
 * Used by container orchestrators (DigitalOcean, Kubernetes) for liveness probes.
 *
 * Implements T050: Health check endpoint on port 3001
 *
 * @module health
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { getQueuesHealth } from './queues';
import { logger } from './lib/logger';

const COMPONENT = 'health';

/**
 * Health check port (configurable via env)
 */
const HEALTH_PORT = parseInt(process.env.HEALTH_PORT || '3001', 10);

/**
 * Worker start time for uptime calculation
 */
let startTime: Date | null = null;

/**
 * Last job processed timestamp
 */
let lastJobProcessedAt: Date | null = null;

/**
 * Updates the last job processed timestamp
 * Call this from the main worker when a job completes
 */
export function recordJobProcessed(): void {
  lastJobProcessedAt = new Date();
}

/**
 * Health check response structure
 */
interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  lastJobProcessedAt: string | null;
  queues: {
    name: string;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  }[];
  timestamp: string;
}

/**
 * HTTP request handler
 */
async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // Only handle GET /health
  if (req.method !== 'GET' || req.url !== '/health') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    const queueHealth = await getQueuesHealth();

    const queues = Object.entries(queueHealth).map(([queueName, stats]) => ({
      ...stats,
      name: queueName,
    }));

    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check for issues
    const totalFailed = queues.reduce((sum, q) => sum + q.failed, 0);
    const totalActive = queues.reduce((sum, q) => sum + q.active, 0);
    const anyPaused = queues.some((q) => q.paused);

    if (anyPaused) {
      status = 'unhealthy';
    } else if (totalFailed > 100) {
      status = 'degraded';
    }

    const uptimeMs = startTime ? Date.now() - startTime.getTime() : 0;

    const response: HealthResponse = {
      status,
      uptime: Math.floor(uptimeMs / 1000),
      lastJobProcessedAt: lastJobProcessedAt?.toISOString() || null,
      queues,
      timestamp: new Date().toISOString(),
    };

    const statusCode = status === 'unhealthy' ? 503 : 200;

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response, null, 2));
  } catch (error) {
    logger.error(COMPONENT, 'Health check failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      })
    );
  }
}

/**
 * Starts the health check HTTP server
 */
export function startHealthServer(): void {
  startTime = new Date();

  const server = createServer((req, res) => {
    handleRequest(req, res).catch((err) => {
      logger.error(COMPONENT, 'Request handler error', {
        error: err instanceof Error ? err.message : String(err),
      });
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });
  });

  server.listen(HEALTH_PORT, () => {
    logger.info(COMPONENT, `Health check server listening on port ${HEALTH_PORT}`);
  });

  server.on('error', (err) => {
    logger.error(COMPONENT, 'Health server error', {
      error: err.message,
    });
  });
}

/**
 * Gets current health status without HTTP
 * Useful for internal checks
 */
export async function getHealthStatus(): Promise<HealthResponse> {
  const queueHealth = await getQueuesHealth();

  const queues = Object.entries(queueHealth).map(([queueName, stats]) => ({
    ...stats,
    name: queueName,
  }));

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  const totalFailed = queues.reduce((sum, q) => sum + q.failed, 0);
  const anyPaused = queues.some((q) => q.paused);

  if (anyPaused) {
    status = 'unhealthy';
  } else if (totalFailed > 100) {
    status = 'degraded';
  }

  const uptimeMs = startTime ? Date.now() - startTime.getTime() : 0;

  return {
    status,
    uptime: Math.floor(uptimeMs / 1000),
    lastJobProcessedAt: lastJobProcessedAt?.toISOString() || null,
    queues,
    timestamp: new Date().toISOString(),
  };
}
