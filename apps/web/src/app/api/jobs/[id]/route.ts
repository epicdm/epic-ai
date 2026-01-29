/**
 * Individual Job API Routes
 *
 * GET /api/jobs/[id] - Get job by ID
 * DELETE /api/jobs/[id] - Cancel a job
 *
 * @module api/jobs/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { getUserOrganization } from '@/lib/sync-user';
import { getJob, cancelJob } from '@/lib/services/job-queue';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/jobs/[id]
 *
 * Retrieves a specific job by ID.
 *
 * Response: JobResponse | 404
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // 4. Fetch job
    const job = await getJob(id, org.id);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jobs/[id]
 *
 * Cancels a pending or running job.
 * Jobs in COMPLETED, FAILED, or CANCELLED state cannot be cancelled.
 *
 * Response: JobResponse (with status: CANCELLED) | 404 | 400
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // 4. Cancel job
    const job = await cancelJob(id, org.id);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(job);
  } catch (error) {
    // Handle "cannot cancel" error
    if (error instanceof Error && error.message.includes('Cannot cancel job')) {
      return NextResponse.json(
        { error: error.message, code: 'INVALID_STATE' },
        { status: 400 }
      );
    }

    console.error('Error cancelling job:', error);
    return NextResponse.json(
      { error: 'Failed to cancel job', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
