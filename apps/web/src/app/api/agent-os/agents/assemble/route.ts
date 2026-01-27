/**
 * Agent OS - Assembly Orchestrator API
 *
 * POST /api/agent-os/agents/assemble
 * Enqueue a background job to run the full assembly pipeline
 *
 * This endpoint creates a DRAFT agent and enqueues an ASSEMBLE_AGENT job.
 * The job runs 8 phases asynchronously:
 * 1. Enrichment - Scrape website, build company profile
 * 2. Template - Recommend best agent template
 * 3. Tools - Assign tools based on template + company
 * 4. Flow - Generate conversation flows
 * 5. Personality - Configure voice and tone
 * 6. Knowledge - Seed initial knowledge base
 * 7. Governance - Set compliance rules
 * 8. Economics - Configure cost/usage limits
 *
 * The result includes confidence scores, gaps, warnings, and evidence
 * for full AI governance transparency.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import {
  AssembleAgentRequestSchema,
  type ApiResponse,
} from "@epic-ai/shared";
import { enqueueJob, JobType } from "@/lib/services/job-queue";
import type { Agent, ChannelType } from "@prisma/client";

type AssembleResponse = ApiResponse<{
  agent: Agent;
  jobId: string;
  status: 'pending';
}>;

/**
 * POST /api/agent-os/agents/assemble
 * Create a draft agent and enqueue assembly job
 */
export async function POST(request: NextRequest) {
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

    // Parse and validate request
    const body = await request.json();
    const parsed = AssembleAgentRequestSchema.safeParse(body);

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

    const {
      agentId,
      companyId,
      websiteUrl,
      userAnswers,
      desiredTemplateKey,
      channels,
      force,
      name,
      slug,
    } = parsed.data;

    // If agentId is provided, validate it's a DRAFT agent
    let existingAgent: Agent | null = null;
    if (agentId) {
      existingAgent = await prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!existingAgent) {
        return NextResponse.json(
          { data: null, error: { code: "NOT_FOUND", message: "Agent not found" } },
          { status: 404 }
        );
      }

      if (existingAgent.organizationId !== org.id) {
        return NextResponse.json(
          { data: null, error: { code: "FORBIDDEN", message: "Agent not found in organization" } },
          { status: 403 }
        );
      }

      // PUBLISHED and ARCHIVED agents are immutable
      if (existingAgent.status === "PUBLISHED" || existingAgent.status === "ARCHIVED") {
        return NextResponse.json(
          {
            data: null,
            error: {
              code: "IMMUTABLE_AGENT",
              message: `Cannot assemble into ${existingAgent.status} agent. Clone to DRAFT first.`,
            },
          },
          { status: 400 }
        );
      }
    }

    // Get or create company profile
    let companyProfile = companyId
      ? await prisma.companyProfile.findUnique({ where: { id: companyId } })
      : await prisma.companyProfile.findUnique({ where: { organizationId: org.id } });

    // Validate company belongs to org
    if (companyProfile && companyProfile.organizationId !== org.id) {
      return NextResponse.json(
        { data: null, error: { code: "FORBIDDEN", message: "Company profile not found in organization" } },
        { status: 403 }
      );
    }

    // Ensure we have a company profile
    if (!companyProfile) {
      // Create a minimal company profile if websiteUrl provided
      if (websiteUrl) {
        companyProfile = await prisma.companyProfile.create({
          data: {
            organizationId: org.id,
            name: "New Company",
            website: websiteUrl,
          },
        });
      } else {
        return NextResponse.json(
          { data: null, error: { code: "NO_COMPANY", message: "Company profile or website URL required" } },
          { status: 400 }
        );
      }
    }

    // Generate agent name and slug
    const agentName = name || `${companyProfile.name} Agent`;
    const baseSlug = slug || generateSlug(agentName, org.id);

    // Check for slug uniqueness (only for new agents)
    let finalSlug = baseSlug;
    if (!existingAgent) {
      const agentWithSlug = await prisma.agent.findFirst({
        where: { organizationId: org.id, slug: baseSlug },
      });
      if (agentWithSlug) {
        finalSlug = `${baseSlug}-${Date.now().toString(36)}`;
      }
    } else {
      finalSlug = existingAgent.slug; // Keep existing slug
    }

    // Create or update agent in DRAFT status (assembling state)
    let agent: Agent;
    if (existingAgent) {
      // Update existing DRAFT agent to mark it as being assembled
      agent = await prisma.agent.update({
        where: { id: existingAgent.id },
        data: {
          status: "DRAFT",
          companyProfileId: companyProfile.id,
          // Clear previous config to indicate re-assembly in progress
          configConfidence: {},
          configGaps: [],
          configWarnings: [],
        },
        include: {
          template: {
            select: { id: true, name: true, slug: true },
          },
          companyProfile: {
            select: { id: true, name: true },
          },
        },
      });
    } else {
      // Create new agent in DRAFT status
      agent = await prisma.agent.create({
        data: {
          organizationId: org.id,
          name: agentName,
          slug: finalSlug,
          description: `AI agent being assembled...`,
          channels: channels as ChannelType[],
          status: "DRAFT",
          companyProfileId: companyProfile.id,
        },
        include: {
          template: {
            select: { id: true, name: true, slug: true },
          },
          companyProfile: {
            select: { id: true, name: true },
          },
        },
      });
    }

    // Enqueue the ASSEMBLE_AGENT job
    const jobResponse = await enqueueJob({
      type: JobType.ASSEMBLE_AGENT,
      organizationId: org.id,
      payload: {
        organizationId: org.id,
        userId, // Include userId for audit trail
        agentId: agent.id,
        companyId: companyProfile.id,
        websiteUrl: websiteUrl || companyProfile.website || undefined,
        userAnswers: userAnswers || {},
        desiredTemplateKey: desiredTemplateKey || undefined,
        channels,
        force: force || false,
        name: agentName,
        slug: finalSlug,
      },
      priority: 'HIGH', // Assembly jobs get high priority
    });

    return NextResponse.json({
      data: {
        agent,
        jobId: jobResponse.id,
        status: 'pending' as const,
      },
      confidence: {},
      gaps: [],
      warnings: [{
        code: "ASSEMBLY_QUEUED",
        message: "Agent assembly job has been queued for processing",
        severity: "info" as const,
      }],
    });
  } catch (error) {
    console.error("Error in agent assembly:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to start agent assembly",
          details: error instanceof Error ? error.message : undefined,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a URL-safe slug from a name
 */
function generateSlug(name: string, orgId: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  return base || `agent-${orgId.slice(0, 8)}`;
}
