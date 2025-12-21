/**
 * Jobs API Routes
 *
 * POST /api/jobs - Create a new job
 * GET /api/jobs - List jobs with filters and pagination
 *
 * @module api/jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserOrganization } from '@/lib/sync-user';
import {
  enqueueJob,
  listJobs,
  CreateJobRequestSchema,
  TooManyJobsError,
  PayloadValidationError,
  type JobType,
  type JobResponse,
} from '@/lib/services/job-queue';

/**
 * POST /api/jobs
 *
 * Creates a new background job.
 *
 * Request body:
 * - type: JobType (required)
 * - brandId: string (optional, for brand-scoped jobs)
 * - payload: object (required, validated against job type schema)
 * - priority: 'HIGH' | 'NORMAL' | 'LOW' (optional, default: NORMAL)
 * - runAt: ISO datetime string (optional, default: now)
 *
 * Response: JobResponse
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2. Get organization
    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found', code: 'ORG_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const parseResult = CreateJobRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          code: 'VALIDATION_ERROR',
          details: parseResult.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { type, brandId, payload, priority, runAt } = parseResult.data;

    // 4. Enqueue the job
    const job = await enqueueJob({
      type: type as JobType,
      brandId,
      organizationId: org.id,
      payload,
      priority,
      runAt: runAt ? new Date(runAt) : undefined,
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    // Handle known error types
    if (error instanceof TooManyJobsError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: {
            organizationId: error.organizationId,
            currentCount: error.currentCount,
            limit: error.limit,
          },
        },
        { status: 429 }
      );
    }

    if (error instanceof PayloadValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: { issues: error.issues },
        },
        { status: 400 }
      );
    }

    // Log and return generic error
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs
 *
 * Lists jobs for the current organization with optional filters.
 *
 * Query parameters:
 * - status: Filter by status (PENDING, RUNNING, COMPLETED, FAILED, CANCELLED)
 * - type: Filter by job type
 * - brandId: Filter by brand
 * - limit: Number of results (default: 20, max: 100)
 * - cursor: Pagination cursor
 *
 * Response: { jobs: JobResponse[], nextCursor: string | null, totalCount: number }
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // 2. Get organization
    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found', code: 'ORG_NOT_FOUND' },
        { status: 404 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as JobResponse['status'] | null;
    const type = searchParams.get('type') as JobType | null;
    const brandId = searchParams.get('brandId');
    const limitParam = searchParams.get('limit');
    const cursor = searchParams.get('cursor');

    // Validate limit
    let limit = 20;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 100); // Cap at 100
      }
    }

    // 4. List jobs
    const result = await listJobs({
      organizationId: org.id,
      status: status ?? undefined,
      type: type ?? undefined,
      brandId: brandId ?? undefined,
      limit,
      cursor: cursor ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing jobs:', error);
    return NextResponse.json(
      { error: 'Failed to list jobs', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
