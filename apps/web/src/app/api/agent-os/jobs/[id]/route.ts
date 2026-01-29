/**
 * Agent OS - Single Job API
 *
 * GET /api/agent-os/jobs/:id - Get job status and result
 * DELETE /api/agent-os/jobs/:id - Cancel a pending/running job
 *
 * Supports Wizard Steps 6, 7 (Knowledge, Test) job monitoring
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import type { ApiResponse, JobResult } from "@epic-ai/shared";
import { Prisma, type AgentJob } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

type JobResponse = ApiResponse<AgentJob>;

/**
 * GET /api/agent-os/jobs/:id
 * Get job status, progress, and result
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<JobResponse>> {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json(
        { data: null, error: { code: "NO_ORG", message: "No organization found" } },
        { status: 404 }
      );
    }

    const { id } = await params;

    const job = await prisma.agentJob.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!job) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: "Job not found" } },
        { status: 404 }
      );
    }

    // Calculate confidence based on job status
    const statusConfidence: Record<string, number> = {
      PENDING: 0.2,
      RUNNING: 0.5,
      COMPLETED: 1.0,
      FAILED: 0.0,
      CANCELLED: 0.0,
    };

    const warnings = [];

    // Check for long-running jobs
    if (job.status === "RUNNING" && job.startedAt) {
      const runningTime = Date.now() - job.startedAt.getTime();
      const fiveMinutes = 5 * 60 * 1000;
      if (runningTime > fiveMinutes) {
        warnings.push({
          code: "LONG_RUNNING",
          message: `Job has been running for ${Math.round(runningTime / 60000)} minutes`,
          severity: "warning" as const,
          suggestion: "Check job logs or consider cancellation",
        });
      }
    }

    // Check for failed jobs
    if (job.status === "FAILED") {
      warnings.push({
        code: "JOB_FAILED",
        message: job.error || "Job failed without error message",
        severity: "error" as const,
        suggestion: "Review error and retry if appropriate",
      });
    }

    // Check for stale pending jobs
    if (job.status === "PENDING") {
      const waitingTime = Date.now() - job.createdAt.getTime();
      const tenMinutes = 10 * 60 * 1000;
      if (waitingTime > tenMinutes) {
        warnings.push({
          code: "STALE_PENDING",
          message: `Job has been pending for ${Math.round(waitingTime / 60000)} minutes`,
          severity: "info" as const,
          suggestion: "Worker may be busy or offline",
        });
      }
    }

    return NextResponse.json({
      data: job,
      confidence: {
        job_status: statusConfidence[job.status] || 0.5,
        progress: job.progress / 100,
      },
      gaps: [],
      warnings,
    });
  } catch (error) {
    console.error("Error getting job:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get job" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agent-os/jobs/:id
 * Cancel a pending or running job
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<JobResponse>> {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json(
        { data: null, error: { code: "NO_ORG", message: "No organization found" } },
        { status: 404 }
      );
    }

    const { id } = await params;

    const job = await prisma.agentJob.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!job) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: "Job not found" } },
        { status: 404 }
      );
    }

    // Can only cancel pending or running jobs
    if (job.status !== "PENDING" && job.status !== "RUNNING") {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "INVALID_STATE",
            message: `Cannot cancel job in ${job.status} status`,
          },
        },
        { status: 400 }
      );
    }

    // Update job status to cancelled
    const cancelledJob = await prisma.agentJob.update({
      where: { id },
      data: {
        status: "CANCELLED",
        failedAt: new Date(),
        error: "Cancelled by user",
      },
    });

    // TODO: Cancel BullMQ job when worker infrastructure is ready
    // if (job.bullmqJobId) {
    //   await jobQueue.remove(job.bullmqJobId);
    // }

    return NextResponse.json({
      data: cancelledJob,
      confidence: {
        cancelled: 1.0,
      },
      gaps: [],
      warnings: [{
        code: "JOB_CANCELLED",
        message: "Job was cancelled successfully",
        severity: "info" as const,
      }],
    });
  } catch (error) {
    console.error("Error cancelling job:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to cancel job" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agent-os/jobs/:id
 * Retry a failed job
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<JobResponse>> {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json(
        { data: null, error: { code: "NO_ORG", message: "No organization found" } },
        { status: 404 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body as { action?: string };

    if (action !== "retry") {
      return NextResponse.json(
        { data: null, error: { code: "INVALID_ACTION", message: "Only 'retry' action is supported" } },
        { status: 400 }
      );
    }

    const job = await prisma.agentJob.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!job) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: "Job not found" } },
        { status: 404 }
      );
    }

    // Can only retry failed or cancelled jobs
    if (job.status !== "FAILED" && job.status !== "CANCELLED") {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "INVALID_STATE",
            message: `Cannot retry job in ${job.status} status`,
          },
        },
        { status: 400 }
      );
    }

    // Check max attempts
    if (job.attempts >= job.maxAttempts) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "MAX_ATTEMPTS",
            message: `Job has reached maximum retry attempts (${job.maxAttempts})`,
          },
        },
        { status: 400 }
      );
    }

    // Reset job for retry
    const retriedJob = await prisma.agentJob.update({
      where: { id },
      data: {
        status: "PENDING",
        progress: 0,
        attempts: job.attempts + 1,
        error: null,
        result: undefined,
        startedAt: null,
        completedAt: null,
        failedAt: null,
      },
    });

    // TODO: Queue job with BullMQ when worker infrastructure is ready
    // await jobQueue.add(job.jobType, { jobId: job.id }, { priority: job.priority });

    return NextResponse.json({
      data: retriedJob,
      confidence: {
        retry_queued: 1.0,
      },
      gaps: [],
      warnings: [{
        code: "JOB_RETRIED",
        message: `Job retried (attempt ${retriedJob.attempts}/${retriedJob.maxAttempts})`,
        severity: "info" as const,
      }],
    });
  } catch (error) {
    console.error("Error retrying job:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to retry job" } },
      { status: 500 }
    );
  }
}
