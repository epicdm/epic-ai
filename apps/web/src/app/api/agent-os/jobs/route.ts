/**
 * Agent OS - Jobs API
 *
 * POST /api/agent-os/jobs - Create a new job
 * GET /api/agent-os/jobs - List jobs with filtering
 *
 * Background job management for:
 * - Company enrichment
 * - Knowledge processing
 * - Simulation/testing
 * - Learning/feedback processing
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import type { ApiResponse, JobResult } from "@epic-ai/shared";
import type { AgentJob, AgentJobType, JobStatus } from "@prisma/client";

type JobResponse = ApiResponse<AgentJob>;
type JobListResponse = ApiResponse<AgentJob[]>;

/**
 * Schema for creating a job
 */
const CreateJobSchema = z.object({
  jobType: z.enum([
    "ENRICH_COMPANY",
    "GENERATE_ROLE_CARD",
    "GENERATE_BRAIN_CONFIG",
    "GENERATE_PERSONALITY",
    "PROCESS_KNOWLEDGE",
    "RUN_SIMULATION",
    "VALIDATE_GOVERNANCE",
    "PROCESS_FEEDBACK",
    "UPDATE_MEMORY",
    "PROPOSE_IMPROVEMENTS",
  ]),
  agentId: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  priority: z.number().min(0).max(10).optional(),
  scheduledFor: z.string().datetime().optional(),
});

/**
 * POST /api/agent-os/jobs
 * Create a new background job
 */
export async function POST(request: NextRequest): Promise<NextResponse<JobResponse>> {
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

    const body = await request.json();
    const parsed = CreateJobSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { jobType, agentId, payload, priority, scheduledFor } = parsed.data;

    // Validate agent belongs to org if agentId provided
    if (agentId) {
      const agent = await prisma.agent.findFirst({
        where: {
          id: agentId,
          organizationId: org.id,
        },
      });

      if (!agent) {
        return NextResponse.json(
          { data: null, error: { code: "NOT_FOUND", message: "Agent not found" } },
          { status: 404 }
        );
      }
    }

    // Validate job-specific requirements
    const jobValidation = validateJobRequirements(jobType as AgentJobType, agentId, payload);
    if (!jobValidation.valid) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "INVALID_JOB",
            message: jobValidation.error || "Invalid job configuration",
          },
        },
        { status: 400 }
      );
    }

    // Create the job
    const job = await prisma.agentJob.create({
      data: {
        organizationId: org.id,
        agentId,
        jobType: jobType as AgentJobType,
        payload: (payload || {}) as object,
        priority: priority || 0,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status: "PENDING",
      },
    });

    // TODO: Queue job with BullMQ when worker infrastructure is ready
    // await jobQueue.add(jobType, { jobId: job.id }, { priority, delay });

    const warnings = [];
    if (!scheduledFor) {
      warnings.push({
        code: "IMMEDIATE_JOB",
        message: "Job will be processed as soon as a worker is available",
        severity: "info" as const,
      });
    }

    return NextResponse.json({
      data: job,
      confidence: {
        job_created: 1.0,
      },
      gaps: [],
      warnings,
    });
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to create job" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-os/jobs
 * List jobs with filtering
 *
 * Query params:
 * - agentId: Filter by agent
 * - jobType: Filter by job type
 * - status: Filter by status
 * - limit: Max results (default 20)
 */
export async function GET(request: NextRequest): Promise<NextResponse<JobListResponse>> {
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

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const jobType = searchParams.get("jobType") as AgentJobType | null;
    const status = searchParams.get("status") as JobStatus | null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    // Build filter
    const where: Record<string, unknown> = {
      organizationId: org.id,
    };

    if (agentId) {
      where.agentId = agentId;
    }

    if (jobType) {
      where.jobType = jobType;
    }

    if (status) {
      where.status = status;
    }

    const jobs = await prisma.agentJob.findMany({
      where,
      orderBy: [
        { priority: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
    });

    // Calculate job stats
    const stats = {
      pending: jobs.filter((j) => j.status === "PENDING").length,
      running: jobs.filter((j) => j.status === "RUNNING").length,
      completed: jobs.filter((j) => j.status === "COMPLETED").length,
      failed: jobs.filter((j) => j.status === "FAILED").length,
    };

    const warnings = [];
    if (stats.failed > 0) {
      warnings.push({
        code: "FAILED_JOBS",
        message: `${stats.failed} job(s) have failed`,
        severity: "warning" as const,
        suggestion: "Review failed jobs and retry or address issues",
      });
    }

    return NextResponse.json({
      data: jobs,
      confidence: {
        jobs: 1.0,
        pending: stats.pending,
        running: stats.running,
        completed: stats.completed,
        failed: stats.failed,
      },
      gaps: [],
      warnings,
    });
  } catch (error) {
    console.error("Error listing jobs:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to list jobs" } },
      { status: 500 }
    );
  }
}

/**
 * Validate job-specific requirements
 */
function validateJobRequirements(
  jobType: AgentJobType,
  agentId: string | undefined,
  payload: Record<string, unknown> | undefined
): { valid: boolean; error?: string } {
  // Jobs that require an agent
  const agentRequiredJobs: AgentJobType[] = [
    "GENERATE_ROLE_CARD",
    "GENERATE_BRAIN_CONFIG",
    "GENERATE_PERSONALITY",
    "PROCESS_KNOWLEDGE",
    "RUN_SIMULATION",
    "VALIDATE_GOVERNANCE",
    "PROCESS_FEEDBACK",
    "UPDATE_MEMORY",
    "PROPOSE_IMPROVEMENTS",
  ];

  if (agentRequiredJobs.includes(jobType) && !agentId) {
    return {
      valid: false,
      error: `Job type ${jobType} requires an agentId`,
    };
  }

  // Validate specific job payloads
  switch (jobType) {
    case "ENRICH_COMPANY":
      // Optionally accepts website URL in payload
      break;

    case "PROCESS_KNOWLEDGE":
      // Should have knowledge source info
      if (!payload?.sourceType) {
        return {
          valid: false,
          error: "PROCESS_KNOWLEDGE requires sourceType in payload",
        };
      }
      break;

    case "RUN_SIMULATION":
      // Should have simulation config
      if (!payload?.scenario) {
        return {
          valid: false,
          error: "RUN_SIMULATION requires scenario in payload",
        };
      }
      break;

    default:
      // Other jobs have no specific requirements
      break;
  }

  return { valid: true };
}
