/**
 * Shared helpers for Agent OS PATCH-by-module endpoints
 */

import { NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import type { ApiResponse, GapItem, WarningItem, ConfidenceMap } from "@epic-ai/shared";
import type { Agent, Prisma } from "@prisma/client";
import type { z } from "zod";

export interface ModulePatchContext {
  userId: string;
  orgId: string;
  agent: Agent;
}

// Error responses use 'never' for data type to be assignable to any ApiResponse<T>
export type ModulePatchError = NextResponse<{
  data: null;
  error: { code: string; message: string; details?: Record<string, unknown> };
  confidence?: ConfidenceMap;
  gaps?: GapItem[];
  warnings?: WarningItem[];
}>;

/**
 * Options for validateAgentAccess
 */
export interface ValidateAgentAccessOptions {
  /** If true, checks if the agent is editable (blocks published agents) */
  requireEditable?: boolean;
}

/**
 * Validate authentication and agent ownership
 * Returns either the context or an error response
 *
 * @param agentId - The agent ID to validate access for
 * @param options - Optional configuration
 * @param options.requireEditable - If true, blocks modifications to published agents (default: false)
 */
export async function validateAgentAccess(
  agentId: string,
  options?: ValidateAgentAccessOptions
): Promise<ModulePatchContext | ModulePatchError> {
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

  // Don't allow patching archived agents
  if (agent.status === "ARCHIVED") {
    return NextResponse.json(
      { data: null, error: { code: "AGENT_ARCHIVED", message: "Cannot modify archived agent" } },
      { status: 400 }
    );
  }

  // GOVERNANCE INVARIANT: Published agents cannot be edited directly
  // Users must create a draft version via POST /agents/:id/clone-draft
  if (options?.requireEditable && agent.status === "PUBLISHED") {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "AGENT_PUBLISHED",
          message: "Agent is published; create a new draft version to edit.",
          details: {
            agentId: agent.id,
            currentStatus: agent.status,
            hint: `Use POST /api/agent-os/agents/${agent.id}/clone-draft to create an editable copy`,
          },
        }
      },
      { status: 409 }
    );
  }

  return { userId, orgId: org.id, agent };
}

/**
 * Check if result is an error response
 */
export function isErrorResponse(result: ModulePatchContext | ModulePatchError): result is ModulePatchError {
  return result instanceof NextResponse;
}

/**
 * Return an error response with proper typing for any ApiResponse<T>
 * This helper allows error responses to be returned from handlers with any data type
 */
export function returnError<T>(error: ModulePatchError): NextResponse<ApiResponse<T>> {
  return error as unknown as NextResponse<ApiResponse<T>>;
}

/**
 * Validate request body against a Zod schema with STRICT mode
 * Rejects unknown keys to enforce schema contracts
 * Note: Uses AnyZodObject to support .strict() method
 */
export function validateBody<T extends z.AnyZodObject>(
  body: unknown,
  schema: T,
  options?: { strict?: boolean }
): { success: true; data: z.infer<T> } | { success: false; error: ModulePatchError } {
  // Default to strict mode for security and contract enforcement
  const useStrict = options?.strict !== false;
  const schemaToUse = useStrict ? schema.strict() : schema;
  const parsed = schemaToUse.safeParse(body);

  if (!parsed.success) {
    return {
      success: false,
      error: NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: formatValidationError(parsed.error),
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: parsed.data };
}

/**
 * Format Zod validation error into human-readable message
 */
function formatValidationError(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });

  if (issues.length === 1) {
    return issues[0];
  }

  return `Validation errors: ${issues.join("; ")}`;
}

/**
 * Update agent module and return standardized response
 */
export async function updateAgentModule<T>(
  agentId: string,
  moduleField: keyof Prisma.AgentUpdateInput,
  data: T,
  options?: {
    confidence?: ConfidenceMap;
    gaps?: GapItem[];
    warnings?: WarningItem[];
  }
): Promise<NextResponse<ApiResponse<Agent>>> {
  try {
    // Deep merge with existing config
    const currentAgent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!currentAgent) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: "Agent not found" } },
        { status: 404 }
      );
    }

    const existingConfig = (currentAgent[moduleField as keyof Agent] as Record<string, unknown>) || {};
    const mergedConfig = deepMerge(existingConfig, data as Record<string, unknown>);

    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        [moduleField]: mergedConfig,
        updatedAt: new Date(),
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

    return NextResponse.json({
      data: updatedAgent,
      confidence: options?.confidence || calculateModuleConfidence(moduleField, mergedConfig),
      gaps: options?.gaps || [],
      warnings: options?.warnings || [],
    });
  } catch (error) {
    console.error(`Error updating ${String(moduleField)}:`, error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: `Failed to update ${String(moduleField)}` } },
      { status: 500 }
    );
  }
}

/**
 * Deep merge objects (second object wins on conflicts)
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const targetVal = target[key];
    const sourceVal = source[key];

    if (
      sourceVal !== null &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      targetVal !== null &&
      typeof targetVal === "object" &&
      !Array.isArray(targetVal)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      );
    } else {
      result[key] = sourceVal;
    }
  }

  return result;
}

/**
 * Calculate confidence for a specific module
 */
function calculateModuleConfidence(
  moduleField: keyof Prisma.AgentUpdateInput,
  config: Record<string, unknown>
): ConfidenceMap {
  const confidence: ConfidenceMap = {};
  const keys = Object.keys(config);

  if (keys.length === 0) {
    confidence[String(moduleField)] = 0;
    return confidence;
  }

  // Count non-null, non-empty values
  let filledCount = 0;
  for (const key of keys) {
    const val = config[key];
    if (val !== null && val !== undefined && val !== "") {
      if (Array.isArray(val) && val.length === 0) continue;
      if (typeof val === "object" && Object.keys(val as object).length === 0) continue;
      filledCount++;
    }
  }

  confidence[String(moduleField)] = Math.min(filledCount / Math.max(keys.length, 1), 1);

  return confidence;
}

/**
 * Get module-specific gaps
 */
export function getModuleGaps(
  moduleField: string,
  config: Record<string, unknown>,
  requiredFields: string[]
): GapItem[] {
  const gaps: GapItem[] = [];

  for (const field of requiredFields) {
    if (!config[field]) {
      gaps.push({
        gap_type: "missing_required",
        field_path: `${moduleField}.${field}`,
        severity: "medium",
        impact: `Missing required field: ${field}`,
        recommended_fix: `Provide a value for ${field}`,
      });
    }
  }

  return gaps;
}
