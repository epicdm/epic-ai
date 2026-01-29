/**
 * Callback Queue Client
 *
 * BullMQ queue instance for scheduling callback jobs from the web app.
 * Jobs are processed by the workers service.
 *
 * @module lib/queues/callback
 */

import { Queue } from "bullmq";
import { redis } from "../redis";

export const CALLBACK_QUEUE_NAME = "callback";

/**
 * Callback queue for scheduling voice callback jobs.
 * Jobs are added via /api/telephony/callback/enqueue and processed by workers.
 */
export const callbackQueue = new Queue(CALLBACK_QUEUE_NAME, {
  connection: redis,
});
