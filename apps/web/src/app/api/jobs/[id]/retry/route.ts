/**
 * Job Retry API Route
 *
 * POST /api/jobs/[id]/retry - Retry a failed job
 *
 * @module api/jobs/[id]/retry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { getUserOrganization } from '@/lib/sync-user';
import { retryJob, TooManyJobsError } from '@/lib/services/job-queue';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/jobs/[id]/retry
 *
 * Retries a failed job by creating a new job with the same payload.
 * The new job is created with HIGH priority.
 * Only FAILED jobs can be retried.
 *
 * Response: JobResponse (new job) | 404 | 400 | 429
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. Authenticate
    const { userId } = await getAuthWithBypass();
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

    // 3. Get job ID from params
    const { id } = await params;

    // 4. Retry job
    const newJob = await retryJob(id, org.id);

    if (!newJob) {
      return NextResponse.json(
        { error: 'Job not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(newJob, { status: 201 });
  } catch (error) {
    // Handle "cannot retry" error
    if (error instanceof Error && error.message.includes('Cannot retry job')) {
      return NextResponse.json(
        { error: error.message, code: 'INVALID_STATE' },
        { status: 400 }
      );
    }

    // Handle rate limit error
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

    console.error('Error retrying job:', error);
    return NextResponse.json(
      { error: 'Failed to retry job', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
