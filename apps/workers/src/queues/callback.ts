import { Queue, Worker } from "bullmq";
import { originateCallbackProcessor } from "../processors/originate-callback";

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const CALLBACK_QUEUE_NAME =
  process.env.CALLBACK_QUEUE_NAME || "telephony-callback";

export function createCallbackQueue() {
  const queueName = CALLBACK_QUEUE_NAME;
  const prefix = process.env.BULLMQ_PREFIX || "epic";

  const queue = new Queue(queueName, {
    connection: { url: reqEnv("REDIS_URL") },
    prefix,
  });

  return queue;
}

export function createCallbackWorker() {
  const queueName = CALLBACK_QUEUE_NAME;
  const prefix = process.env.BULLMQ_PREFIX || "epic";

  const worker = new Worker(queueName, originateCallbackProcessor, {
    connection: { url: reqEnv("REDIS_URL") },
    prefix,
    concurrency: 5,
    lockDuration: 300_000, // 5 minutes
    stalledInterval: 30_000, // 30 seconds
    settings: {
      backoffStrategy: (attemptsMade: number): number => {
        // Exponential backoff: 1min, 5min, 15min
        const delays = [60_000, 300_000, 900_000];
        const index = Math.min(attemptsMade - 1, delays.length - 1);
        return delays[index] ?? delays[delays.length - 1]!;
      },
    },
  });

  worker.on("completed", (job) => {
    // eslint-disable-next-line no-console
    console.log(`[callback-worker] completed job=${job.id}`);
  });

  worker.on("failed", (job, err) => {
    // eslint-disable-next-line no-console
    console.error(`[callback-worker] failed job=${job?.id}`, err?.message || err);
  });

  return worker;
}
