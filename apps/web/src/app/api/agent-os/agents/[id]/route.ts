/**
 * Agent OS - Single Agent API
 *
 * GET /api/agent-os/agents/:id - Get agent details
 * DELETE /api/agent-os/agents/:id - Delete agent
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import type { ApiResponse, GapItem, WarningItem } from "@epic-ai/shared";
import type { Agent } from "@prisma/client";

type AgentResponse = ApiResponse<Agent>;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agent-os/agents/:id
 * Get a single agent with all configuration
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<AgentResponse>> {
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

    const agent = await prisma.agent.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
      include: {
        template: {
          select: { id: true, name: true, slug: true, category: true },
        },
        companyProfile: {
          select: { id: true, name: true, website: true, industry: true },
        },
        voiceAgent: {
          select: { id: true, name: true },
        },
        wizardSessions: {
          where: { status: "IN_PROGRESS" },
          take: 1,
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: "Agent not found" } },
        { status: 404 }
      );
    }

    // Calculate confidence scores based on config completeness
    const confidence = calculateConfigConfidence(agent);
    const gaps = calculateConfigGaps(agent);
    const warnings = calculateWarnings(agent);

    return NextResponse.json({
      data: agent,
      confidence,
      gaps,
      warnings,
    });
  } catch (error) {
    console.error("Error getting agent:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get agent" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/agent-os/agents/:id
 * Delete an agent (soft delete by archiving)
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<{ deleted: boolean }>>> {
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

    const agent = await prisma.agent.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: "Agent not found" } },
        { status: 404 }
      );
    }

    // Don't allow deletion of published agents
    if (agent.status === "PUBLISHED") {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "CANNOT_DELETE_PUBLISHED",
            message: "Cannot delete a published agent. Archive it first.",
          },
        },
        { status: 400 }
      );
    }

    // Soft delete by setting status to ARCHIVED
    await prisma.agent.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json({
      data: { deleted: true },
      confidence: {},
      gaps: [],
      warnings: [],
    });
  } catch (error) {
    console.error("Error deleting agent:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to delete agent" } },
      { status: 500 }
    );
  }
}

/**
 * Calculate confidence scores for each config module
 */
function calculateConfigConfidence(agent: Agent): Record<string, number> {
  const confidence: Record<string, number> = {};

  // Role Card confidence
  const roleCard = agent.roleCard as Record<string, unknown> | null;
  if (roleCard && Object.keys(roleCard).length > 0) {
    const requiredFields = ["name", "title", "company"];
    const filledFields = requiredFields.filter((f) => roleCard[f]);
    confidence["role_card"] = filledFields.length / requiredFields.length;
  } else {
    confidence["role_card"] = 0;
  }

  // Personality Config confidence
  const personality = agent.personalityConfig as Record<string, unknown> | null;
  if (personality && Object.keys(personality).length > 0) {
    confidence["personality_config"] = personality.voice_tone ? 0.8 : 0.3;
  } else {
    confidence["personality_config"] = 0;
  }

  // Tool Config confidence
  const tools = agent.toolConfig as Record<string, unknown> | null;
  if (tools && Object.keys(tools).length > 0) {
    const enabledTools = (tools.enabled_tools as unknown[]) || [];
    confidence["tool_config"] = enabledTools.length > 0 ? 0.7 : 0.2;
  } else {
    confidence["tool_config"] = 0;
  }

  // Knowledge Config confidence
  const knowledge = agent.knowledgeConfig as Record<string, unknown> | null;
  if (knowledge && Object.keys(knowledge).length > 0) {
    const knowledgeBases = (knowledge.knowledge_bases as unknown[]) || [];
    confidence["knowledge_config"] = knowledgeBases.length > 0 ? 0.8 : 0.1;
  } else {
    confidence["knowledge_config"] = 0;
  }

  // Brain Config confidence
  const brain = agent.brainConfig as Record<string, unknown> | null;
  confidence["brain_config"] = brain && Object.keys(brain).length > 0 ? 0.7 : 0;

  // Memory Config confidence
  const memory = agent.memoryConfig as Record<string, unknown> | null;
  confidence["memory_config"] = memory && Object.keys(memory).length > 0 ? 0.6 : 0.3;

  // Learning Config confidence
  const learning = agent.learningConfig as Record<string, unknown> | null;
  confidence["learning_config"] = learning && Object.keys(learning).length > 0 ? 0.5 : 0.3;

  // Governance Config confidence
  const governance = agent.governanceConfig as Record<string, unknown> | null;
  confidence["governance_config"] = governance && Object.keys(governance).length > 0 ? 0.6 : 0.2;

  // Economics Config confidence
  const economics = agent.economicsConfig as Record<string, unknown> | null;
  confidence["economics_config"] = economics && Object.keys(economics).length > 0 ? 0.5 : 0.3;

  return confidence;
}

/**
 * Calculate gaps that need user attention
 */
function calculateConfigGaps(agent: Agent): GapItem[] {
  const gaps: GapItem[] = [];

  const roleCard = agent.roleCard as Record<string, unknown> | null;
  if (!roleCard || !roleCard.name) {
    gaps.push({
      gap_type: "missing_required",
      field_path: "role_card.name",
      severity: "high",
      impact: "Agent has no name identity",
      recommended_fix: "Set the agent's name in role card configuration",
      question_to_user: "What name should this agent use?",
    });
  }

  if (!roleCard || !roleCard.company) {
    gaps.push({
      gap_type: "missing_required",
      field_path: "role_card.company",
      severity: "high",
      impact: "Agent doesn't know what company it represents",
      recommended_fix: "Set the company name in role card configuration",
    });
  }

  const personality = agent.personalityConfig as Record<string, unknown> | null;
  if (!personality || !personality.voice_tone) {
    gaps.push({
      gap_type: "missing_config",
      field_path: "personality_config.voice_tone",
      severity: "medium",
      impact: "Agent has no defined personality",
      recommended_fix: "Configure the agent's voice and tone",
      question_to_user: "What tone should the agent use? (professional, friendly, etc.)",
    });
  }

  const knowledge = agent.knowledgeConfig as Record<string, unknown> | null;
  const knowledgeBases = (knowledge?.knowledge_bases as unknown[]) || [];
  if (knowledgeBases.length === 0) {
    gaps.push({
      gap_type: "missing_data",
      field_path: "knowledge_config.knowledge_bases",
      severity: "medium",
      impact: "Agent has no knowledge sources",
      recommended_fix: "Connect knowledge bases or upload documents",
      question_to_user: "What information should the agent have access to?",
    });
  }

  return gaps;
}

/**
 * Calculate warnings about potential issues
 */
function calculateWarnings(agent: Agent): WarningItem[] {
  const warnings: WarningItem[] = [];

  // Warning if published without governance config
  if (agent.status === "PUBLISHED") {
    const governance = agent.governanceConfig as Record<string, unknown> | null;
    if (!governance || Object.keys(governance).length === 0) {
      warnings.push({
        code: "NO_GOVERNANCE",
        message: "Published agent has no governance rules configured",
        severity: "warning",
        field_path: "governance_config",
        suggestion: "Configure compliance and risk settings before going live",
      });
    }
  }

  // Warning if no escalation rules
  const roleCard = agent.roleCard as Record<string, unknown> | null;
  const escalationRules = (roleCard?.escalation_rules as unknown[]) || [];
  if (escalationRules.length === 0) {
    warnings.push({
      code: "NO_ESCALATION",
      message: "No escalation rules defined",
      severity: "info",
      field_path: "role_card.escalation_rules",
      suggestion: "Define when and how the agent should escalate to humans",
    });
  }

  return warnings;
}
