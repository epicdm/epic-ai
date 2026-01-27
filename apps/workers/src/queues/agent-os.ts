/**
 * Agent OS Queue Definition
 *
 * Handles Agent OS background jobs including company enrichment.
 *
 * @module queues/agent-os
 */

import { Queue } from 'bullmq';
import { redis } from '../lib/redis';
import { QueueName } from '../types/payloads';
import { defaultJobOptions } from './options';

/**
 * Agent OS Queue
 *
 * Handles: ENRICH_COMPANY (and future Agent OS job types)
 * Concurrency: 5 (heavy processing - web scraping + AI)
 * Lock Duration: 10 minutes
 */
export const agentOsQueue = new Queue(QueueName.AGENT_OS, {
  connection: redis,
  defaultJobOptions,
});
