/**
 * Job Producer Service
 *
 * Handles job creation and enqueuing for the background worker system.
 * Implements dual-storage pattern: Prisma for persistence, BullMQ for processing.
 *
 * Based on research.md Decision 1 (Dual-storage pattern) and
 * Decision 10 (Per-organization rate limiting).
 *
 * @module job-queue/producer
 */

import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from '@epic-ai/database';
import type { Job as PrismaJob, JobType as PrismaJobType, JobStatus as PrismaJobStatus } from '@prisma/client';
import {
  JobType,
  JobPriority,
  JobPriorityName,
  QueueName,
  JobTypeToQueue,
  validatePayload,
  priorityToNumber,
  type JobResponse,
} from './types';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Maximum concurrent jobs per organization
 * Based on research.md Decision 10
 */
const MAX_CONCURRENT_JOBS_PER_ORG = 50;

/**
 * Maximum queued jobs per organization
 */
const MAX_QUEUED_JOBS_PER_ORG = 200;

/**
 * Default job options for BullMQ
 */
const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'custom' as const,
  },
  removeOnComplete: {
    count: 1000,
  },
  removeOnFail: {
    count: 5000,
  },
};

// =============================================================================
// Redis Connection (Singleton)
// =============================================================================

let redisConnection: Redis | null = null;

function getRedisConnection(): Redis {
  if (!redisConnection) {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set');
    }

    redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
    });
  }
  return redisConnection;
}

// =============================================================================
// Queue Instances (Lazy Initialization)
// =============================================================================

const queues: Map<QueueName, Queue> = new Map();

function getQueue(queueName: QueueName): Queue {
  let queue = queues.get(queueName);
  if (!queue) {
    queue = new Queue(queueName, {
      connection: getRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
    queues.set(queueName, queue);
  }
  return queue;
}

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when organization has too many active jobs
 */
export class TooManyJobsError extends Error {
  public readonly code = 'TOO_MANY_JOBS';
  public readonly organizationId: string;
  public readonly currentCount: number;
  public readonly limit: number;

  constructor(organizationId: string, currentCount: number, limit: number) {
    super(`Maximum concurrent jobs reached (${limit})`);
    this.name = 'TooManyJobsError';
    this.organizationId = organizationId;
    this.currentCount = currentCount;
    this.limit = limit;
  }
}

/**
 * Error thrown when payload validation fails
 */
export class PayloadValidationError extends Error {
  public readonly code = 'INVALID_PAYLOAD';
  public readonly issues: Array<{ path: (string | number)[]; message: string }>;

  constructor(
    message: string,
    issues: Array<{ path: (string | number)[]; message: string }>
  ) {
    super(message);
    this.name = 'PayloadValidationError';
    this.issues = issues;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the organization ID for a brand
 */
async function getOrganizationIdForBrand(brandId: string): Promise<string> {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { organizationId: true },
  });

  if (!brand) {
    throw new Error(`Brand not found: ${brandId}`);
  }

  return brand.organizationId;
}

/**
 * Counts active jobs for an organization
 */
async function countActiveJobsForOrg(organizationId: string): Promise<number> {
  // We need to count jobs via brands since Job model doesn't have organizationId
  const brands = await prisma.brand.findMany({
    where: { organizationId },
    select: { id: true },
  });

  const brandIds = brands.map((b) => b.id);

  const count = await prisma.job.count({
    where: {
      brandId: { in: brandIds },
      status: { in: ['PENDING', 'RUNNING'] },
    },
  });

  return count;
}

/**
 * Checks rate limit for an organization
 */
async function checkRateLimit(organizationId: string): Promise<void> {
  const activeCount = await countActiveJobsForOrg(organizationId);

  if (activeCount >= MAX_CONCURRENT_JOBS_PER_ORG) {
    throw new TooManyJobsError(
      organizationId,
      activeCount,
      MAX_CONCURRENT_JOBS_PER_ORG
    );
  }
}

/**
 * Converts a Prisma Job to API response format
 */
function jobToResponse(job: PrismaJob, organizationId: string): JobResponse {
  return {
    id: job.id,
    type: job.type as JobType,
    brandId: job.brandId,
    organizationId,
    payload: job.payload as Record<string, unknown>,
    status: job.status as JobResponse['status'],
    priority: JobPriority.NORMAL, // Priority is stored in BullMQ, not Prisma
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    runAt: job.runAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    result: job.result as Record<string, unknown> | null,
    error: job.error,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.createdAt.toISOString(), // Job model doesn't have updatedAt
  };
}

// =============================================================================
// Public API
// =============================================================================

export interface EnqueueJobOptions {
  /**
   * Job type
   */
  type: JobType;

  /**
   * Brand ID (required for brand-scoped jobs)
   */
  brandId?: string;

  /**
   * Organization ID (required if brandId not provided)
   */
  organizationId?: string;

  /**
   * Job-specific payload
   */
  payload: Record<string, unknown>;

  /**
   * Priority level (default: NORMAL)
   */
  priority?: JobPriorityName;

  /**
   * Scheduled execution time (default: now)
   */
  runAt?: Date;

  /**
   * Custom job ID for deduplication
   */
  jobId?: string;
}

/**
 * Enqueues a new job for background processing.
 *
 * Creates the job in both Prisma (for persistence and UI) and
 * BullMQ (for processing). Implements per-organization rate limiting.
 *
 * @param options - Job configuration
 * @returns The created job response
 * @throws {TooManyJobsError} If organization has reached job limit
 * @throws {PayloadValidationError} If payload validation fails
 */
export async function enqueueJob(options: EnqueueJobOptions): Promise<JobResponse> {
  const {
    type,
    brandId,
    organizationId: providedOrgId,
    payload,
    priority = 'NORMAL',
    runAt = new Date(),
    jobId,
  } = options;

  // 1. Determine organization ID
  let organizationId = providedOrgId;
  if (brandId && !organizationId) {
    organizationId = await getOrganizationIdForBrand(brandId);
  }

  if (!organizationId) {
    throw new Error('organizationId is required when brandId is not provided');
  }

  // 2. Validate payload against job type schema
  try {
    validatePayload(type, payload);
  } catch (error) {
    if (error instanceof Error && 'issues' in error) {
      const zodError = error as { issues: Array<{ path: (string | number)[]; message: string }> };
      throw new PayloadValidationError(
        `Invalid payload for job type ${type}`,
        zodError.issues
      );
    }
    throw error;
  }

  // 3. Check rate limit
  await checkRateLimit(organizationId);

  // 4. Create job in Prisma
  const prismaJob = await prisma.job.create({
    data: {
      type: type as PrismaJobType,
      brandId: brandId ?? null,
      payload: payload,
      status: 'PENDING' as PrismaJobStatus,
      attempts: 0,
      maxAttempts: DEFAULT_JOB_OPTIONS.attempts,
      runAt,
    },
  });

  // 5. Enqueue in BullMQ
  const queueName = JobTypeToQueue[type];
  const queue = getQueue(queueName);

  const delay = runAt > new Date() ? runAt.getTime() - Date.now() : 0;

  await queue.add(
    type,
    {
      prismaJobId: prismaJob.id,
      type,
      brandId,
      organizationId,
      payload,
    },
    {
      jobId: jobId ?? prismaJob.id,
      priority: priorityToNumber(priority),
      delay,
    }
  );

  // 6. Return job response
  return jobToResponse(prismaJob, organizationId);
}

/**
 * Gets a job by ID
 */
export async function getJob(
  jobId: string,
  organizationId: string
): Promise<JobResponse | null> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      brand: {
        select: { organizationId: true },
      },
    },
  });

  if (!job) {
    return null;
  }

  // Verify organization access
  const jobOrgId = job.brand?.organizationId;
  if (jobOrgId && jobOrgId !== organizationId) {
    return null; // Job belongs to different org
  }

  return jobToResponse(job, organizationId);
}

/**
 * Lists jobs with filters and pagination
 */
export async function listJobs(options: {
  organizationId: string;
  status?: JobResponse['status'];
  type?: JobType;
  brandId?: string;
  limit?: number;
  cursor?: string;
}): Promise<{
  jobs: JobResponse[];
  nextCursor: string | null;
  totalCount: number;
}> {
  const { organizationId, status, type, brandId, limit = 20, cursor } = options;

  // Get brand IDs for this organization
  const brands = await prisma.brand.findMany({
    where: { organizationId },
    select: { id: true },
  });
  const brandIds = brands.map((b) => b.id);

  // Build where clause
  const where: {
    brandId?: { in: string[] } | string;
    status?: PrismaJobStatus;
    type?: PrismaJobType;
    id?: { lt: string };
  } = {};

  if (brandId) {
    // If specific brand requested, verify it belongs to org
    if (!brandIds.includes(brandId)) {
      return { jobs: [], nextCursor: null, totalCount: 0 };
    }
    where.brandId = brandId;
  } else {
    where.brandId = { in: brandIds };
  }

  if (status) {
    where.status = status as PrismaJobStatus;
  }

  if (type) {
    where.type = type as PrismaJobType;
  }

  if (cursor) {
    where.id = { lt: cursor };
  }

  // Get total count
  const totalCount = await prisma.job.count({ where });

  // Get jobs
  const jobs = await prisma.job.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1, // Fetch one extra to determine if there's a next page
  });

  // Determine pagination
  const hasMore = jobs.length > limit;
  const jobsToReturn = hasMore ? jobs.slice(0, limit) : jobs;
  const nextCursor = hasMore ? jobsToReturn[jobsToReturn.length - 1]?.id ?? null : null;

  return {
    jobs: jobsToReturn.map((job) => jobToResponse(job, organizationId)),
    nextCursor,
    totalCount,
  };
}

/**
 * Cancels a pending or running job
 */
export async function cancelJob(
  jobId: string,
  organizationId: string
): Promise<JobResponse | null> {
  // Get job and verify access
  const existingJob = await getJob(jobId, organizationId);
  if (!existingJob) {
    return null;
  }

  // Check if job can be cancelled
  if (existingJob.status === 'COMPLETED' || existingJob.status === 'FAILED') {
    throw new Error(`Cannot cancel job in ${existingJob.status} state`);
  }

  // Update Prisma record
  const updatedJob = await prisma.job.update({
    where: { id: jobId },
    data: { status: 'CANCELLED' as PrismaJobStatus },
  });

  // Remove from BullMQ queue
  const queueName = JobTypeToQueue[existingJob.type];
  const queue = getQueue(queueName);

  try {
    const bullJob = await queue.getJob(jobId);
    if (bullJob) {
      await bullJob.remove();
    }
  } catch (error) {
    // Job may already be processed or removed
    console.warn(`Could not remove job ${jobId} from queue: ${error}`);
  }

  return jobToResponse(updatedJob, organizationId);
}

/**
 * Retries a failed job
 */
export async function retryJob(
  jobId: string,
  organizationId: string
): Promise<JobResponse | null> {
  // Get original job
  const originalJob = await getJob(jobId, organizationId);
  if (!originalJob) {
    return null;
  }

  // Check if job can be retried
  if (originalJob.status !== 'FAILED') {
    throw new Error(`Cannot retry job in ${originalJob.status} state`);
  }

  // Create new job with same payload but HIGH priority
  return enqueueJob({
    type: originalJob.type,
    brandId: originalJob.brandId ?? undefined,
    organizationId,
    payload: originalJob.payload,
    priority: 'HIGH', // Manual retries get high priority
  });
}

/**
 * Closes all queue connections
 * Should be called during graceful shutdown
 */
export async function closeQueues(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  for (const queue of queues.values()) {
    closePromises.push(queue.close());
  }

  await Promise.all(closePromises);
  queues.clear();

  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
