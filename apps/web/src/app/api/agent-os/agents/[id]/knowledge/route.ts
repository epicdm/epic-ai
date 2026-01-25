/**
 * Agent OS - Knowledge Config Module PATCH
 *
 * PATCH /api/agent-os/agents/:id/knowledge
 * Update agent's knowledge configuration (what the agent knows)
 */

import { NextRequest, NextResponse } from "next/server";
import { KnowledgeConfigSchema, type ApiResponse } from "@epic-ai/shared";
import type { Agent } from "@prisma/client";
import {
  validateAgentAccess,
  isErrorResponse,
  validateBody,
  updateAgentModule,
  returnError,
} from "../_helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/agent-os/agents/:id/knowledge
 * Update knowledge configuration
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Agent>>> {
  try {
    const { id } = await params;

    const context = await validateAgentAccess(id, { requireEditable: true });
    if (isErrorResponse(context)) {
      return returnError<Agent>(context);
    }

    const body = await request.json();
    const validation = validateBody(body, KnowledgeConfigSchema.partial());

    if (!validation.success) {
      return returnError<Agent>(validation.error);
    }

    const knowledgeData = validation.data;

    // Calculate gaps and warnings
    const gaps = [];
    const warnings = [];

    const knowledgeBases = knowledgeData.knowledge_bases || [];
    const sources = knowledgeData.sources || [];

    if (knowledgeBases.length === 0 && sources.length === 0) {
      gaps.push({
        gap_type: "no_knowledge" as const,
        field_path: "knowledge_config",
        severity: "high" as const,
        impact: "Agent has no knowledge sources to draw from",
        recommended_fix: "Connect a knowledge base or add knowledge sources",
        question_to_user: "What information should this agent have access to?",
      });
    }

    // Check retrieval settings
    if (knowledgeData.retrieval_settings) {
      const { top_k, similarity_threshold } = knowledgeData.retrieval_settings;

      if (top_k && top_k > 10) {
        warnings.push({
          code: "HIGH_TOP_K",
          message: "High top_k value may slow down responses",
          severity: "info" as const,
          field_path: "knowledge_config.retrieval_settings.top_k",
          suggestion: "Consider using 5-10 for optimal balance",
        });
      }

      if (similarity_threshold && similarity_threshold < 0.5) {
        warnings.push({
          code: "LOW_SIMILARITY",
          message: "Low similarity threshold may return irrelevant results",
          severity: "warning" as const,
          field_path: "knowledge_config.retrieval_settings.similarity_threshold",
          suggestion: "Consider using at least 0.6 for better relevance",
        });
      }
    }

    // Check context window
    if (knowledgeData.context_window?.max_knowledge_tokens) {
      if (knowledgeData.context_window.max_knowledge_tokens > 8000) {
        warnings.push({
          code: "LARGE_CONTEXT",
          message: "Large knowledge context may increase costs",
          severity: "info" as const,
          field_path: "knowledge_config.context_window.max_knowledge_tokens",
          suggestion: "Consider limiting to 4000-6000 tokens",
        });
      }
    }

    return updateAgentModule(id, "knowledgeConfig", knowledgeData, { gaps, warnings });
  } catch (error) {
    console.error("Error updating knowledge config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to update knowledge config" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-os/agents/:id/knowledge
 * Get current knowledge configuration
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Record<string, unknown>>>> {
  try {
    const { id } = await params;

    const context = await validateAgentAccess(id);
    if (isErrorResponse(context)) {
      return returnError<Record<string, unknown>>(context);
    }

    const knowledgeConfig = (context.agent.knowledgeConfig as Record<string, unknown>) || {};
    const knowledgeBases = (knowledgeConfig.knowledge_bases as unknown[]) || [];
    const sources = (knowledgeConfig.sources as unknown[]) || [];

    const hasKnowledge = knowledgeBases.length > 0 || sources.length > 0;

    return NextResponse.json({
      data: knowledgeConfig,
      confidence: {
        knowledge_config: hasKnowledge ? 0.8 : 0.1,
      },
      gaps: hasKnowledge ? [] : [{
        gap_type: "no_knowledge" as const,
        field_path: "knowledge_config",
        severity: "high" as const,
        impact: "Agent has no knowledge sources",
        recommended_fix: "Add knowledge bases or sources",
      }],
      warnings: [],
    });
  } catch (error) {
    console.error("Error getting knowledge config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get knowledge config" } },
      { status: 500 }
    );
  }
}
