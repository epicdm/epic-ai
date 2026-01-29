/**
 * Agent OS - Agents API
 *
 * POST /api/agent-os/agents - Create a new agent
 * GET /api/agent-os/agents - List agents for organization
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { CreateAgentRequestSchema, type ApiResponse } from "@epic-ai/shared";
import type { Agent, AgentStatus, ChannelType } from "@prisma/client";

// Type for the API response
type AgentListResponse = ApiResponse<Agent[]>;
type AgentCreateResponse = ApiResponse<Agent>;

/**
 * GET /api/agent-os/agents
 * List all agents for the organization
 */
export async function GET(request: NextRequest): Promise<NextResponse<AgentListResponse>> {
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
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: { organizationId: string; status?: AgentStatus } = {
      organizationId: org.id,
    };

    if (status) {
      where.status = status as AgentStatus;
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: {
          template: {
            select: { id: true, name: true, slug: true },
          },
          companyProfile: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.agent.count({ where }),
    ]);

    return NextResponse.json({
      data: agents,
      confidence: {},
      gaps: [],
      warnings: [],
    });
  } catch (error) {
    console.error("Error listing agents:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to list agents" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent-os/agents
 * Create a new agent (draft state)
 */
export async function POST(request: NextRequest): Promise<NextResponse<AgentCreateResponse>> {
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
    const parsed = CreateAgentRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: parsed.error.flatten(),
          }
        },
        { status: 400 }
      );
    }

    const { name, slug, description, templateId, channels } = parsed.data;

    // Check for slug uniqueness within organization
    const existingAgent = await prisma.agent.findFirst({
      where: { organizationId: org.id, slug },
    });

    if (existingAgent) {
      return NextResponse.json(
        { data: null, error: { code: "SLUG_EXISTS", message: "Agent with this slug already exists" } },
        { status: 409 }
      );
    }

    // Get template if provided
    let template = null;
    if (templateId) {
      template = await prisma.agentTemplate.findUnique({
        where: { id: templateId },
      });
    }

    // Get company profile if exists
    const companyProfile = await prisma.companyProfile.findUnique({
      where: { organizationId: org.id },
    });

    // Create agent with default or template configs
    const agent = await prisma.agent.create({
      data: {
        organizationId: org.id,
        name,
        slug,
        description,
        channels: channels as ChannelType[],
        status: "DRAFT",
        templateId: template?.id,
        companyProfileId: companyProfile?.id,
        // Apply template configs if available, otherwise use defaults
        roleCard: template?.roleCardTemplate || {},
        brainConfig: template?.brainConfigTemplate || {},
        personalityConfig: template?.personalityTemplate || {},
        toolConfig: template?.toolConfigTemplate || {},
        knowledgeConfig: template?.knowledgeConfigTemplate || {},
        memoryConfig: template?.memoryConfigTemplate || {},
        learningConfig: template?.learningConfigTemplate || {},
        governanceConfig: template?.governanceTemplate || {},
        economicsConfig: template?.economicsTemplate || {},
        // Initialize confidence tracking
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

    // Calculate initial gaps (things that need to be configured)
    const gaps = [];
    if (!agent.roleCard || Object.keys(agent.roleCard as object).length === 0) {
      gaps.push({
        gap_type: "missing_config" as const,
        field_path: "role_card",
        severity: "high" as const,
        impact: "Agent identity not defined",
        recommended_fix: "Complete the agent setup step",
        question_to_user: "What role should this agent play?",
      });
    }
    if (!agent.personalityConfig || Object.keys(agent.personalityConfig as object).length === 0) {
      gaps.push({
        gap_type: "missing_config" as const,
        field_path: "personality_config",
        severity: "high" as const,
        impact: "Agent personality not defined",
        recommended_fix: "Configure voice and personality settings",
        question_to_user: "What tone and personality should the agent have?",
      });
    }

    return NextResponse.json({
      data: agent,
      confidence: {
        "role_card": 0,
        "personality_config": 0,
        "tool_config": 0,
        "knowledge_config": 0,
      },
      gaps,
      warnings: [],
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to create agent" } },
      { status: 500 }
    );
  }
}
