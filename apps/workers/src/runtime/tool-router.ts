/**
 * Tool Router
 *
 * Routes and executes tool calls based on tool_config and decisions.
 * Handles permissions, rate limits, and confirmation requirements.
 *
 * @module runtime/tool-router
 */

import type {
  ToolConfig,
  RuntimeContext,
  BrainDecision,
  ToolExecutionResult,
} from "./types";

// ============================================================================
// Tool Router Types
// ============================================================================

export interface MaybeRunToolParams {
  toolConfig: ToolConfig;
  decision: BrainDecision;
  context: RuntimeContext;
  agentId: string;
}

// ============================================================================
// Tool Execution
// ============================================================================

/**
 * Execute a tool if the decision indicates one should be used.
 */
export async function maybeRunTool(
  params: MaybeRunToolParams
): Promise<ToolExecutionResult | null> {
  const { toolConfig, decision, context, agentId } = params;

  // Check if tool should be used
  if (decision.action !== "use_tool" || !decision.tool) {
    return null;
  }

  const toolId = decision.tool;
  const startTime = Date.now();

  // Find tool in config
  const tool = toolConfig.enabled_tools.find((t) => t.id === toolId);

  if (!tool) {
    return {
      toolId,
      success: false,
      error: `Tool ${toolId} not found in enabled_tools`,
      durationMs: Date.now() - startTime,
      requiredConfirmation: false,
      summary: `Tool ${toolId} is not configured for this agent.`,
    };
  }

  // Check if tool is enabled
  if (!tool.enabled) {
    return {
      toolId,
      success: false,
      error: `Tool ${toolId} is disabled`,
      durationMs: Date.now() - startTime,
      requiredConfirmation: false,
      summary: `Tool ${toolId} is currently disabled.`,
    };
  }

  // Check permissions
  const permissionCheck = checkToolPermissions(tool, context);
  if (!permissionCheck.allowed) {
    return {
      toolId,
      success: false,
      error: permissionCheck.reason,
      durationMs: Date.now() - startTime,
      requiredConfirmation: false,
      summary: permissionCheck.reason,
    };
  }

  // Check rate limits
  const rateLimitCheck = await checkRateLimits(tool, context, agentId);
  if (!rateLimitCheck.allowed) {
    return {
      toolId,
      success: false,
      error: rateLimitCheck.reason,
      durationMs: Date.now() - startTime,
      requiredConfirmation: false,
      summary: rateLimitCheck.reason,
    };
  }

  // Check if confirmation is required
  const requiresConfirmation =
    tool.permissions?.requires_confirmation ||
    (toolConfig.tool_policies?.confirm_sensitive_actions && isSensitiveAction(toolId));

  if (requiresConfirmation) {
    // In production, this would pause and wait for user confirmation
    // For v1, we'll note that confirmation was required
    return {
      toolId,
      success: true,
      data: { pending_confirmation: true },
      durationMs: Date.now() - startTime,
      requiredConfirmation: true,
      summary: `Waiting for user confirmation before executing ${tool.name ?? toolId}.`,
    };
  }

  // Execute the tool
  try {
    const result = await executeTool(toolId, tool, context);

    // Log usage if enabled
    if (toolConfig.tool_policies?.log_all_usage) {
      await logToolUsage(agentId, toolId, result, context);
    }

    return {
      toolId,
      success: true,
      data: result.data,
      durationMs: Date.now() - startTime,
      requiredConfirmation: false,
      summary: result.summary,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      toolId,
      success: false,
      error: errorMessage,
      durationMs: Date.now() - startTime,
      requiredConfirmation: false,
      summary: `Failed to execute ${tool.name ?? toolId}: ${errorMessage}`,
    };
  }
}

// ============================================================================
// Permission Checks
// ============================================================================

interface PermissionCheckResult {
  allowed: boolean;
  reason: string;
}

function checkToolPermissions(
  tool: ToolConfig["enabled_tools"][0],
  context: RuntimeContext
): PermissionCheckResult {
  const permissions = tool.permissions;

  if (!permissions) {
    // Default: allow
    return { allowed: true, reason: "" };
  }

  // Check read permission (most tools need this)
  if (permissions.read === false) {
    return {
      allowed: false,
      reason: `Tool ${tool.id} does not have read permission`,
    };
  }

  // For tools that modify data, check write permission
  const writeTools = [
    "crm.upsert_lead",
    "crm.update_lead",
    "calendar.book",
    "sms.send",
    "email.send",
  ];

  if (writeTools.includes(tool.id) && permissions.write === false) {
    return {
      allowed: false,
      reason: `Tool ${tool.id} does not have write permission`,
    };
  }

  // For deletion operations
  const deleteTools = ["crm.delete_lead", "calendar.cancel"];

  if (deleteTools.includes(tool.id) && permissions.delete === false) {
    return {
      allowed: false,
      reason: `Tool ${tool.id} does not have delete permission`,
    };
  }

  return { allowed: true, reason: "" };
}

// ============================================================================
// Rate Limit Checks
// ============================================================================

interface RateLimitCheckResult {
  allowed: boolean;
  reason: string;
}

async function checkRateLimits(
  tool: ToolConfig["enabled_tools"][0],
  context: RuntimeContext,
  agentId: string
): Promise<RateLimitCheckResult> {
  const limits = tool.rate_limits;

  if (!limits) {
    return { allowed: true, reason: "" };
  }

  // TODO: Implement actual rate limit tracking with Redis
  // For v1, this is a stub that always allows

  // In production:
  // 1. Track calls_per_minute with sliding window
  // 2. Track calls_per_conversation with session counter
  // 3. Track calls_per_day with daily counter

  // Example implementation:
  // const key = `rate_limit:${agentId}:${tool.id}`;
  // const count = await redis.incr(key);
  // if (count === 1) await redis.expire(key, 60);
  // if (count > (limits.calls_per_minute ?? Infinity)) {
  //   return { allowed: false, reason: "Rate limit exceeded" };
  // }

  return { allowed: true, reason: "" };
}

// ============================================================================
// Tool Execution
// ============================================================================

interface ToolExecutionInternalResult {
  data: unknown;
  summary: string;
}

async function executeTool(
  toolId: string,
  tool: ToolConfig["enabled_tools"][0],
  context: RuntimeContext
): Promise<ToolExecutionInternalResult> {
  // Route to appropriate executor based on tool category
  const [category, action] = toolId.split(".");

  switch (category) {
    case "kb":
      return executeKnowledgeBaseTool(action, tool, context);
    case "crm":
      return executeCRMTool(action, tool, context);
    case "calendar":
      return executeCalendarTool(action, tool, context);
    case "sms":
      return executeSMSTool(action, tool, context);
    case "email":
      return executeEmailTool(action, tool, context);
    case "voice":
      return executeVoiceTool(action, tool, context);
    default:
      return executeGenericTool(toolId, tool, context);
  }
}

// ============================================================================
// Tool Category Executors
// ============================================================================

async function executeKnowledgeBaseTool(
  action: string,
  tool: ToolConfig["enabled_tools"][0],
  context: RuntimeContext
): Promise<ToolExecutionInternalResult> {
  // TODO: Implement KB search
  // This would call the knowledge retriever with specific parameters

  if (action === "search") {
    return {
      data: { results: [], query: "" },
      summary: "Searched knowledge base (stub in v1).",
    };
  }

  return {
    data: null,
    summary: `Unknown KB action: ${action}`,
  };
}

async function executeCRMTool(
  action: string,
  tool: ToolConfig["enabled_tools"][0],
  context: RuntimeContext
): Promise<ToolExecutionInternalResult> {
  // TODO: Implement CRM integration
  // This would connect to the CRM (HubSpot, Salesforce, etc.)

  if (action === "upsert_lead") {
    // Extract contact info from context
    const lead = extractLeadFromContext(context);

    return {
      data: { lead, action: "upserted" },
      summary: lead.email
        ? `Saved lead information for ${lead.email}.`
        : "Saved lead information.",
    };
  }

  if (action === "lookup_lead") {
    return {
      data: { found: false },
      summary: "Lead lookup (stub in v1).",
    };
  }

  return {
    data: null,
    summary: `Unknown CRM action: ${action}`,
  };
}

async function executeCalendarTool(
  action: string,
  tool: ToolConfig["enabled_tools"][0],
  context: RuntimeContext
): Promise<ToolExecutionInternalResult> {
  // TODO: Implement calendar integration
  // This would connect to Google Calendar, Calendly, etc.

  if (action === "book") {
    return {
      data: { booking_url: "https://calendly.com/example" },
      summary: "Generated booking link (stub in v1).",
    };
  }

  if (action === "check_availability") {
    return {
      data: { available_slots: [] },
      summary: "Checked calendar availability (stub in v1).",
    };
  }

  return {
    data: null,
    summary: `Unknown calendar action: ${action}`,
  };
}

async function executeSMSTool(
  action: string,
  tool: ToolConfig["enabled_tools"][0],
  context: RuntimeContext
): Promise<ToolExecutionInternalResult> {
  // TODO: Implement SMS integration
  // This would connect to Twilio, etc.

  if (action === "send") {
    const phone = context.entities.find((e) => e.type === "phone")?.value;

    return {
      data: { sent: false, phone },
      summary: phone
        ? `SMS sending prepared for ${phone} (stub in v1).`
        : "No phone number available for SMS.",
    };
  }

  return {
    data: null,
    summary: `Unknown SMS action: ${action}`,
  };
}

async function executeEmailTool(
  action: string,
  tool: ToolConfig["enabled_tools"][0],
  context: RuntimeContext
): Promise<ToolExecutionInternalResult> {
  // TODO: Implement email integration

  if (action === "send") {
    const email = context.entities.find((e) => e.type === "email")?.value;

    return {
      data: { sent: false, email },
      summary: email
        ? `Email prepared for ${email} (stub in v1).`
        : "No email address available.",
    };
  }

  return {
    data: null,
    summary: `Unknown email action: ${action}`,
  };
}

async function executeVoiceTool(
  action: string,
  tool: ToolConfig["enabled_tools"][0],
  context: RuntimeContext
): Promise<ToolExecutionInternalResult> {
  // Voice tool execution via transfer-to-human
  const { transferToHuman } = await import("./tools/transfer-to-human");

  if (action === "transfer") {
    // Extract channel from context metadata
    const channel = context.channelMetadata?.channel as string | undefined;

    if (!channel) {
      return {
        data: { transferred: false, error: "No channel available" },
        summary: "Voice transfer failed: no active channel.",
      };
    }

    try {
      const result = await transferToHuman({
        channel,
        context: context.channelMetadata?.transfer_context as string || "sales_queue",
        exten: context.channelMetadata?.transfer_exten as string || "1",
        priority: context.channelMetadata?.transfer_priority as number | undefined || 1,
        reason: "Tool-initiated transfer",
      });

      return {
        data: result,
        summary: result.ok
          ? `Successfully transferred call to ${result.redirected_to.context}.`
          : `Transfer failed: ${result.message}`,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      return {
        data: { transferred: false, error: errorMsg },
        summary: `Voice transfer failed: ${errorMsg}`,
      };
    }
  }

  return {
    data: null,
    summary: `Unknown voice action: ${action}`,
  };
}

async function executeGenericTool(
  toolId: string,
  tool: ToolConfig["enabled_tools"][0],
  context: RuntimeContext
): Promise<ToolExecutionInternalResult> {
  // Generic tool execution for custom tools
  return {
    data: { tool_id: toolId, executed: false },
    summary: `Generic tool ${toolId} (stub in v1).`,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function isSensitiveAction(toolId: string): boolean {
  const sensitiveTools = [
    "crm.delete_lead",
    "calendar.cancel",
    "sms.send",
    "email.send",
    "voice.transfer",
  ];
  return sensitiveTools.includes(toolId);
}

function extractLeadFromContext(context: RuntimeContext): {
  name?: string;
  email?: string;
  phone?: string;
} {
  const name = context.entities.find((e) => e.type === "person")?.value;
  const email = context.entities.find((e) => e.type === "email")?.value;
  const phone = context.entities.find((e) => e.type === "phone")?.value;

  return {
    name: name ?? context.userProfile?.name,
    email: email ?? context.userProfile?.email,
    phone: phone ?? context.userProfile?.phone,
  };
}

async function logToolUsage(
  agentId: string,
  toolId: string,
  result: ToolExecutionInternalResult,
  context: RuntimeContext
): Promise<void> {
  // TODO: Implement usage logging
  // This would write to a tool_usage table or send to analytics

  console.log(`[ToolUsage] agent=${agentId} tool=${toolId} session=${context.sessionId}`);
}

// ============================================================================
// Tool List Helpers
// ============================================================================

/**
 * Get list of available tool IDs for this agent.
 */
export function getAvailableTools(toolConfig: ToolConfig): string[] {
  return toolConfig.enabled_tools
    .filter((t) => t.enabled !== false)
    .map((t) => t.id);
}

/**
 * Get preferred tools based on tool_preferences.
 */
export function getPreferredTools(toolConfig: ToolConfig): string[] {
  return toolConfig.tool_preferences?.preferred_tools ?? [];
}

/**
 * Check if a specific tool is available and enabled.
 */
export function isToolAvailable(toolConfig: ToolConfig, toolId: string): boolean {
  const tool = toolConfig.enabled_tools.find((t) => t.id === toolId);
  return !!tool && tool.enabled !== false;
}
