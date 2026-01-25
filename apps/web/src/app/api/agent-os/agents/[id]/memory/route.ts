/**
 * Agent OS - Memory Config Module PATCH
 *
 * PATCH /api/agent-os/agents/:id/memory
 * Update agent's memory configuration (what the agent remembers)
 */

import { NextRequest, NextResponse } from "next/server";
import { MemoryConfigSchema, type ApiResponse } from "@epic-ai/shared";
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
 * PATCH /api/agent-os/agents/:id/memory
 * Update memory configuration
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
    const validation = validateBody(body, MemoryConfigSchema.partial());

    if (!validation.success) {
      return returnError<Agent>(validation.error);
    }

    const memoryData = validation.data;

    const warnings = [];

    // Check long-term memory settings
    if (memoryData.long_term?.enabled && !memoryData.persistence?.encrypt) {
      warnings.push({
        code: "UNENCRYPTED_LONG_TERM",
        message: "Long-term memory enabled without encryption",
        severity: "warning" as const,
        field_path: "memory_config.persistence.encrypt",
        suggestion: "Enable encryption for storing sensitive conversation data",
      });
    }

    // Check episodic memory retention
    if (memoryData.episodic?.enabled && memoryData.episodic?.retention_days) {
      if (memoryData.episodic.retention_days > 90) {
        warnings.push({
          code: "LONG_RETENTION",
          message: "Long memory retention may have privacy implications",
          severity: "info" as const,
          field_path: "memory_config.episodic.retention_days",
          suggestion: "Consider GDPR and data retention policies",
        });
      }
    }

    // Check if storing all interactions
    if (memoryData.episodic?.store_interactions && memoryData.long_term?.enabled) {
      warnings.push({
        code: "HIGH_STORAGE",
        message: "Storing all interactions to long-term memory increases storage costs",
        severity: "info" as const,
        field_path: "memory_config",
        suggestion: "Consider summarization instead of full interaction storage",
      });
    }

    return updateAgentModule(id, "memoryConfig", memoryData, { warnings });
  } catch (error) {
    console.error("Error updating memory config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to update memory config" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-os/agents/:id/memory
 * Get current memory configuration
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

    const memoryConfig = (context.agent.memoryConfig as Record<string, unknown>) || {};

    return NextResponse.json({
      data: memoryConfig,
      confidence: {
        memory_config: Object.keys(memoryConfig).length > 0 ? 0.6 : 0.3,
      },
      gaps: [],
      warnings: [],
    });
  } catch (error) {
    console.error("Error getting memory config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get memory config" } },
      { status: 500 }
    );
  }
}
