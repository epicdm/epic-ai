/**
 * Auto-Fill Next-Step Orchestrator v1
 *
 * Worker-side orchestrator that:
 * 1. Reads current wizard snapshot
 * 2. Determines next step
 * 3. Runs the appropriate engine
 * 4. Returns a write plan for the web route to execute
 *
 * V1 design: thin stubs for engines, progressively replaced with real implementations.
 *
 * @module lib/auto-fill/auto-fill-next-step.v1
 */

import {
  AutoFillNextStepRequestSchema,
  type AutoFillNextStepRequest,
  type WritePlanItem,
  type AutoFillStepResult,
  type GapItem,
} from "@epic-ai/shared";
import { buildWizardSnapshotFromAgentId } from "../wizard-snapshot";
import { buildNextStepExplainFromAgentId } from "../next-step/next-step-explain.v1";
import type { GapItemBase, WarningItem } from "../normalizeGapFieldPaths";
import {
  toolsEngineSalesQualifierV1,
  type ToolsEngineResult as SalesQualifierToolsEngineResult,
} from "../tools";
import {
  runFlowEngine,
  hasCustomFlow,
  type FlowEngineResult,
} from "../../engines/flow";

// ============================================================================
// Types
// ============================================================================

export interface AutoFillPlanResult {
  agentId: string;
  ran_step: string;
  did_write: boolean;
  write_plan: WritePlanItem[];
  engine_result?: AutoFillStepResult;
  confidence: {
    overall: number;
    by_module: Record<string, number>;
  };
  gaps: GapItemBase[];
  warnings: WarningItem[];
  metadata: {
    started_at: string;
    finished_at: string;
    duration_ms: number;
  };
}

// ============================================================================
// V1 Engine Stubs
// ============================================================================

/**
 * Enrichment engine stub (company step).
 * In v1: returns a stub warning. Replace with real enrichment engine.
 */
async function runEnrichmentV1(_params: {
  agentId: string;
  websiteUrl?: string;
  companyHints?: { websiteUrl?: string; companyName?: string; industry?: string };
  answers?: Record<string, unknown>;
  dryRun: boolean;
}): Promise<{ writes: WritePlanItem[]; warnings: WarningItem[] }> {
  return {
    writes: [],
    warnings: [
      {
        code: "ENRICHMENT_V1_STUB",
        message: "Enrichment engine v1 not yet wired. Use the company setup page to enter details.",
        severity: "info",
      },
    ],
  };
}

/**
 * Template selection engine.
 * Sets the template_key in governance_config.
 */
async function runTemplateAutoSelectV1(params: {
  agentId: string;
  desiredTemplateKey?: string;
  dryRun: boolean;
}): Promise<{ writes: WritePlanItem[]; warnings: WarningItem[] }> {
  const { desiredTemplateKey } = params;

  if (!desiredTemplateKey) {
    return {
      writes: [],
      warnings: [
        {
          code: "NO_TEMPLATE_KEY",
          message: "No template key provided. Select a template manually.",
          severity: "warning",
        },
      ],
    };
  }

  // Write template_key to governance_config
  return {
    writes: [
      {
        module: "governance",
        payload: {
          template_key: desiredTemplateKey,
        },
      },
    ],
    warnings: [],
  };
}

// ============================================================================
// Sales Qualifier Template Configs (v1)
// ============================================================================

/**
 * Tool config for sales_qualifier template.
 * Enables: telephony, calendar booking, CRM sync, SMS, email, knowledge search.
 */
function salesQualifierToolConfigV1(): Record<string, unknown> {
  return {
    enabled_tools: [
      {
        id: "telephony.call",
        name: "Voice Calling",
        enabled: true,
        permissions: { read: true, write: true, delete: false, requires_confirmation: false },
        config: { provider: "livekit", record: true },
      },
      {
        id: "calendar.book",
        name: "Calendar Booking",
        enabled: true,
        permissions: { read: true, write: true, delete: false, requires_confirmation: true },
        config: { provider: "cal_com", default_duration_minutes: 30 },
      },
      {
        id: "crm.upsert_lead",
        name: "CRM Lead Sync",
        enabled: true,
        permissions: { read: true, write: true, delete: false, requires_confirmation: false },
        config: { auto_sync: true },
      },
      {
        id: "sms.send",
        name: "SMS Follow-up",
        enabled: true,
        permissions: { read: true, write: true, delete: false, requires_confirmation: true },
        config: { provider: "twilio" },
      },
      {
        id: "email.send",
        name: "Email Follow-up",
        enabled: true,
        permissions: { read: true, write: true, delete: false, requires_confirmation: true },
        config: { provider: "sendgrid" },
      },
      {
        id: "kb.search",
        name: "Knowledge Search",
        enabled: true,
        permissions: { read: true, write: false, delete: false, requires_confirmation: false },
        config: { top_k: 5 },
      },
    ],
    tool_policies: {
      confirm_sensitive_actions: true,
      max_tools_per_turn: 3,
      log_all_usage: true,
    },
    tool_preferences: {
      preferred_tools: ["kb.search", "crm.upsert_lead", "calendar.book", "sms.send"],
      strategy: "proactive",
    },
  };
}

/**
 * Flow config for sales_qualifier template.
 * BANT-lite qualification flow: greeting -> qualify -> route -> book/nurture -> end
 */
function salesQualifierFlowConfigV1(): Record<string, unknown> {
  return {
    version: "v1",
    templateKey: "sales_qualifier",
    entry_node_id: "n1_greeting",
    exit_node_ids: ["n7_end"],
    nodes: [
      {
        id: "n1_greeting",
        type: "greeting",
        title: "Welcome & Context",
        instructions: "Greet the caller warmly, introduce yourself as the AI assistant, and ask how you can help them today.",
        max_turns: 2,
      },
      {
        id: "n2_qualify",
        type: "qualify",
        title: "BANT Qualification",
        instructions: "Gather Budget, Authority, Need, and Timeline. Ask open-ended questions to understand their situation. Track: budget_range, decision_maker, pain_points, timeline.",
        required_fields: ["budget_range", "decision_maker", "pain_points", "timeline"],
        max_turns: 8,
      },
      {
        id: "n3_route",
        type: "triage",
        title: "Route Decision",
        instructions: "Based on qualification data, determine if lead is qualified (score >= 60) or needs nurturing. Route accordingly.",
        max_turns: 1,
      },
      {
        id: "n4_book",
        type: "book",
        title: "Schedule Meeting",
        instructions: "Offer available meeting slots and book a discovery call with the sales team. Confirm date, time, and send calendar invite.",
        max_turns: 4,
      },
      {
        id: "n5_nurture",
        type: "followup",
        title: "Nurture Path",
        instructions: "Thank them for their interest, offer to send relevant resources via email, and schedule a follow-up in 2-4 weeks.",
        max_turns: 3,
      },
      {
        id: "n6_handoff",
        type: "handoff",
        title: "Human Escalation",
        instructions: "Transfer to a human representative. Provide context summary before handoff.",
        max_turns: 2,
      },
      {
        id: "n7_end",
        type: "close",
        title: "End Conversation",
        instructions: "Thank the caller, summarize next steps, and end the conversation gracefully.",
        max_turns: 1,
      },
      {
        id: "fallback",
        type: "fallback",
        title: "Fallback Handler",
        instructions: "When confused or unable to proceed, apologize and offer to connect with a human or restart the conversation.",
        max_turns: 2,
      },
    ],
    edges: [
      { id: "e1", from: "n1_greeting", to: "n2_qualify", when: { condition: "greeting_complete" }, priority: 0 },
      { id: "e2", from: "n2_qualify", to: "n3_route", when: { condition: "qualification_complete" }, priority: 0 },
      { id: "e3", from: "n3_route", to: "n4_book", when: { condition: "lead_score >= 60" }, priority: 1 },
      { id: "e4", from: "n3_route", to: "n5_nurture", when: { condition: "lead_score < 60" }, priority: 0 },
      { id: "e5", from: "n4_book", to: "n7_end", when: { condition: "meeting_booked" }, priority: 0 },
      { id: "e6", from: "n5_nurture", to: "n7_end", when: { condition: "nurture_complete" }, priority: 0 },
      { id: "e7", from: "n2_qualify", to: "n6_handoff", when: { intent: "request_human" }, priority: 2 },
      { id: "e8", from: "n4_book", to: "n6_handoff", when: { intent: "request_human" }, priority: 2 },
      { id: "e9", from: "n6_handoff", to: "n7_end", when: { condition: "handoff_complete" }, priority: 0 },
    ],
    intents: [
      { id: "request_human", description: "User explicitly requests to speak with a human", examples: ["Let me talk to a person", "I want a human", "Transfer me"] },
      { id: "schedule_meeting", description: "User wants to schedule a meeting", examples: ["Can we set up a call?", "I'd like to schedule a demo"] },
      { id: "ask_pricing", description: "User asks about pricing", examples: ["How much does it cost?", "What are your prices?"] },
    ],
    tool_hooks: [
      { id: "th1", tool_id: "crm.upsert_lead", when: { node_id: "n2_qualify", event: "on_exit" }, input_mapping: { lead_data: "collected_fields" } },
      { id: "th2", tool_id: "calendar.book", when: { node_id: "n4_book", event: "on_confirm" }, input_mapping: { slot: "selected_slot" }, requires_confirmation: true },
      { id: "th3", tool_id: "email.send", when: { node_id: "n5_nurture", event: "on_exit" }, input_mapping: { template: "nurture_email", recipient: "lead_email" } },
    ],
    guardrails: {
      escalation: {
        on_user_requests_human: true,
        on_high_stakes_topics: true,
        on_low_confidence: true,
      },
      fallback: {
        max_clarifications: 3,
        fallback_node_id: "fallback",
      },
    },
  };
}

/**
 * Check if existing tool config is non-empty and functional.
 */
function isNonEmptyToolConfig(toolConfig: unknown): boolean {
  if (!toolConfig || typeof toolConfig !== "object") return false;
  const tools = (toolConfig as Record<string, unknown>)?.enabled_tools;
  return Array.isArray(tools) && tools.length > 0;
}

/**
 * Determine if we should skip overwriting existing tools config.
 * Skip if: not forced AND existing config looks good (non-empty AND high confidence).
 */
function shouldSkipToolsOverwrite(
  existingToolConfig: unknown,
  engineResult: SalesQualifierToolsEngineResult,
  force?: boolean
): boolean {
  if (force) return false;
  if (!isNonEmptyToolConfig(existingToolConfig)) return false;

  // If existing tools confidence is already high (>=0.85), don't overwrite
  const toolsConfidence = engineResult.confidence?.tools ?? 0;
  return toolsConfidence >= 0.85;
}

/**
 * Check if existing flow config has non-trivial user content.
 * We consider it non-empty if it has at least 2 nodes (entry + exit minimum).
 */
function isNonEmptyFlowConfig(flowConfig: unknown): boolean {
  if (!flowConfig || typeof flowConfig !== "object") return false;
  const nodes = (flowConfig as Record<string, unknown>)?.nodes;
  return Array.isArray(nodes) && nodes.length >= 2;
}

/**
 * Determine if we should skip overwriting existing flow config.
 * Skip if: not forced AND existing config appears user-edited (has nodes AND high confidence).
 */
function shouldSkipFlowOverwrite(
  existingFlowConfig: unknown,
  engineResult: FlowEngineResult,
  force?: boolean
): boolean {
  if (force) return false;
  if (!isNonEmptyFlowConfig(existingFlowConfig)) return false;

  // If existing flow confidence is already high (>=0.80), don't overwrite
  const flowsConfidence = engineResult.confidence?.flows ?? 0;
  return flowsConfidence >= 0.80;
}

/**
 * Run template-specific auto-fill for tools step.
 * Uses toolsEngineSalesQualifierV1 for sales_qualifier template with:
 * - Schema-validated ToolConfig generation
 * - Gap detection (missing/disabled required tools, missing integration auth)
 * - Warning generation (integration status unknown in v1)
 * - Confidence scoring per-tool and overall
 * - Evidence tracking for audit trail
 * - Overwrite protection (skip if existing config is already good unless force=true)
 */
async function runToolsAutoFillV1(params: {
  agentId: string;
  templateKey?: string;
  existingToolConfig?: unknown;
  dryRun: boolean;
  force?: boolean;
}): Promise<{
  writes: WritePlanItem[];
  warnings: WarningItem[];
  gaps?: GapItemBase[];
  confidence?: Record<string, number>;
  engineResult?: SalesQualifierToolsEngineResult;
}> {
  const { agentId, templateKey, existingToolConfig, force } = params;

  // Use Tools Engine v1 for sales_qualifier template
  if (templateKey === "sales_qualifier") {
    const engineResult = await toolsEngineSalesQualifierV1({
      agentId,
      templateKey,
      existingToolConfig,
    });

    // Check if we should skip overwriting
    if (shouldSkipToolsOverwrite(existingToolConfig, engineResult, force)) {
      return {
        writes: [],
        warnings: [
          ...(engineResult.warnings ?? []),
          {
            code: "TOOLS_AUTOFILL_SKIPPED",
            message: "Auto-fill skipped because existing tools configuration appears complete (confidence >= 0.85).",
            severity: "info",
            field_path: "tool_config",
            suggestion: "Use force=true to overwrite tools with canonical defaults.",
          },
        ],
        gaps: engineResult.gaps,
        confidence: engineResult.confidence,
        engineResult,
      };
    }

    // Generate write plan with validated tool config
    if (engineResult.tool_config) {
      return {
        writes: [{ module: "tools", payload: engineResult.tool_config }],
        warnings: engineResult.warnings ?? [],
        gaps: engineResult.gaps,
        confidence: engineResult.confidence,
        engineResult,
      };
    }

    // Engine returned no config (unusual but handle gracefully)
    return {
      writes: [],
      warnings: [
        ...(engineResult.warnings ?? []),
        {
          code: "TOOLS_ENGINE_NO_CONFIG",
          message: "Tools engine returned no configuration. Using fallback defaults.",
          severity: "warning",
        },
      ],
      gaps: engineResult.gaps,
      confidence: engineResult.confidence,
      engineResult,
    };
  }

  // Fall back to generic defaults for other templates
  const payload = MODULE_DEFAULTS["tools"];
  return {
    writes: payload ? [{ module: "tools", payload }] : [],
    warnings: payload
      ? []
      : [{ code: "NO_DEFAULTS", message: "No default tools config available.", severity: "warning" }],
  };
}

/**
 * Run template-specific auto-fill for flow step.
 * Uses Flow Engine v1 for templates with custom flow support.
 * Features:
 * - Template-based flow skeleton generation
 * - Tool hooks bound to flow nodes based on enabled tools
 * - Gap detection for incomplete flows
 * - Warning generation for validation issues
 * - Confidence scoring per field and overall
 * - Overwrite protection (skip if existing flow is already good unless force=true)
 */
async function runFlowAutoFillV1(params: {
  agentId: string;
  templateKey?: string;
  existingFlowConfig?: unknown;
  enabledTools?: { id: string; enabled: boolean }[];
  dryRun: boolean;
  force?: boolean;
}): Promise<{
  writes: WritePlanItem[];
  warnings: WarningItem[];
  gaps?: GapItemBase[];
  confidence?: Record<string, number>;
  engineResult?: FlowEngineResult;
}> {
  const { templateKey, existingFlowConfig, enabledTools, force } = params;

  // Cast templateKey to AgentType for type safety
  type AgentType = import("@epic-ai/shared").AgentType;
  const templateKeyAsAgentType = templateKey as AgentType;

  // Use Flow Engine v1 for templates with custom flow support
  if (templateKey && hasCustomFlow(templateKeyAsAgentType)) {
    const engineResult = await runFlowEngine({
      templateKey: templateKeyAsAgentType,
      tools: enabledTools ?? [],
      channels: [],
    });

    // Check if we should skip overwriting
    if (shouldSkipFlowOverwrite(existingFlowConfig, engineResult, force)) {
      return {
        writes: [],
        warnings: [
          ...engineResult.warnings.map((w) => ({
            code: w.code,
            message: w.message,
            severity: w.severity,
            field_path: w.node_id ? `flow.nodes.${w.node_id}` : undefined,
          })),
          {
            code: "FLOW_AUTOFILL_SKIPPED",
            message: "Auto-fill skipped because existing flow configuration appears complete (confidence >= 0.80).",
            severity: "info",
            field_path: "flow_config",
            suggestion: "Use force=true to overwrite flow with template defaults.",
          },
        ],
        gaps: engineResult.gaps as GapItemBase[],
        confidence: engineResult.confidence,
        engineResult,
      };
    }

    // Generate write plan with validated flow config
    if (engineResult.flows) {
      return {
        writes: [{ module: "flow", payload: engineResult.flows }],
        warnings: engineResult.warnings.map((w) => ({
          code: w.code,
          message: w.message,
          severity: w.severity,
          field_path: w.node_id ? `flow.nodes.${w.node_id}` : undefined,
        })),
        gaps: engineResult.gaps as GapItemBase[],
        confidence: engineResult.confidence,
        engineResult,
      };
    }

    // Engine returned no config (unusual but handle gracefully)
    return {
      writes: [],
      warnings: [
        ...engineResult.warnings.map((w) => ({
          code: w.code,
          message: w.message,
          severity: w.severity,
          field_path: w.node_id ? `flow.nodes.${w.node_id}` : undefined,
        })),
        {
          code: "FLOW_ENGINE_NO_CONFIG",
          message: "Flow engine returned no configuration. Using fallback defaults.",
          severity: "warning",
        },
      ],
      gaps: engineResult.gaps as GapItemBase[],
      confidence: engineResult.confidence,
      engineResult,
    };
  }

  // Fall back to generic defaults for templates without custom flow
  const payload = MODULE_DEFAULTS["flow"];
  return {
    writes: payload ? [{ module: "flow", payload }] : [],
    warnings: payload
      ? []
      : [{ code: "NO_DEFAULTS", message: "No default flow config available.", severity: "warning" }],
  };
}

/**
 * Module defaults for each step.
 * These are minimal sensible defaults that pass strict Zod validation.
 */
const MODULE_DEFAULTS: Record<string, Record<string, unknown>> = {
  tools: {
    enabled_tools: [],
    tool_policies: {
      confirm_sensitive_actions: true,
      max_tools_per_turn: 3,
      log_all_usage: true,
    },
    tool_preferences: {
      preferred_tools: [],
      strategy: "balanced",
    },
  },
  flow: {
    version: "v1",
    nodes: [],
    edges: [],
  },
  personality: {
    voice_tone: "friendly",
    formality: 3,
    humor_level: 1,
    empathy_level: 4,
    pace: "moderate",
    language_style: {
      complexity: "moderate",
      sentence_length: "medium",
      use_contractions: true,
      use_jargon: false,
    },
    preferred_phrases: [],
    avoided_phrases: [],
    use_emojis: false,
    greeting_style: "Hi! How can I help you today?",
    signoff_style: "Is there anything else I can help you with?",
  },
  brain: {
    decision_policies: [],
    response_rules: [],
    context_handling: {
      conversation_window: 10,
      summarize_long_conversations: true,
      track_entities: [],
    },
    reasoning_strategy: {
      approach: "direct",
      show_reasoning: false,
      max_reasoning_steps: 3,
    },
    fallback_behavior: {
      on_uncertainty: "ask_clarification",
      default_response: "I'm not sure I understand. Could you please clarify?",
      max_clarifications: 3,
    },
  },
  knowledge: {
    knowledge_bases: [],
    retrieval_settings: {
      top_k: 5,
      similarity_threshold: 0.7,
      rerank: false,
    },
    context_window: {
      max_knowledge_tokens: 4000,
      overflow_strategy: "truncate",
    },
    sources: [],
    quick_answers: [],
  },
  memory: {
    short_term: {
      enabled: true,
      window_size: 10,
      include_system: false,
    },
    long_term: {
      enabled: false,
      summary_strategy: "per_conversation",
      max_summaries: 100,
      extract_entities: ["name", "email", "phone"],
    },
    episodic: {
      enabled: false,
      store_interactions: true,
      store_outcomes: true,
      retention_days: 30,
    },
    persistence: {
      storage: "database",
      encrypt: true,
      auto_cleanup: true,
    },
  },
  learning: {
    learning_enabled: false,
    feedback_loops: {
      explicit_feedback: true,
      implicit_signals: false,
      outcome_learning: false,
      min_samples: 10,
    },
    safe_boundaries: {
      max_confidence_delta: 0.1,
      protected_categories: ["governance", "compliance"],
      review_threshold: 0.3,
      auto_rollback: true,
    },
    approval_required: true,
    approvers: [],
  },
};

/**
 * Step -> module name mapping.
 */
const STEP_TO_MODULE: Record<string, string> = {
  tools: "tools",
  flow: "flow",
  personality: "personality",
  brain: "brain",
  knowledge: "knowledge",
  memory: "memory",
  learning: "learning",
};

/**
 * Module defaults engine stub.
 * Returns minimal sensible defaults for a given step.
 */
async function runModuleAutoFillDefaultsV1(params: {
  step: string;
  dryRun: boolean;
}): Promise<{ writes: WritePlanItem[]; warnings: WarningItem[] }> {
  const { step } = params;

  const payload = MODULE_DEFAULTS[step];
  if (!payload) {
    return {
      writes: [],
      warnings: [
        {
          code: "NO_DEFAULTS",
          message: `No default config available for step "${step}".`,
          severity: "warning",
        },
      ],
    };
  }

  const module = STEP_TO_MODULE[step] ?? step;

  return {
    writes: [{ module, payload }],
    warnings: [],
  };
}

// ============================================================================
// Main Orchestrator
// ============================================================================

/**
 * Plan the auto-fill for the next step.
 *
 * This function:
 * 1. Loads the current wizard snapshot
 * 2. Determines the next step (from explain or forced)
 * 3. Runs the appropriate engine stub
 * 4. Returns a write plan (does not execute writes)
 *
 * The web route executes the write plan via existing PATCH endpoints.
 */
export async function planAutoFillNextStepV1(
  agentId: string,
  input: AutoFillNextStepRequest
): Promise<AutoFillPlanResult> {
  const req = AutoFillNextStepRequestSchema.parse(input);
  const started = Date.now();

  // Load current state
  const snapResult = await buildWizardSnapshotFromAgentId(agentId);
  const explainResult = await buildNextStepExplainFromAgentId(agentId);

  // Determine which step to run
  const explainedNextStep = explainResult.ok
    ? (explainResult.data?.next_step as string | undefined)
    : undefined;
  const step =
    req.forceStep ??
    req.desiredStep ??
    explainedNextStep ??
    "unknown";

  // Compute effective dry run (either explicit or via applyImmediately=false)
  const dryRun = req.dryRun || req.applyImmediately === false;

  let writePlan: WritePlanItem[] = [];
  let warnings: WarningItem[] = [];
  let engineResult: AutoFillStepResult | undefined;

  // Extract template key from snapshot (if available)
  const templateKey = snapResult.ok
    ? ((snapResult.data as Record<string, unknown>)?.governance_config as Record<string, unknown>)?.template_key as string | undefined
    : undefined;

  // Route to appropriate engine
  if (step === "company" || step === "enrichment") {
    const websiteUrl = req.websiteUrl ?? req.companyHints?.websiteUrl;
    const r = await runEnrichmentV1({
      agentId,
      websiteUrl,
      companyHints: req.companyHints,
      answers: req.answers as Record<string, unknown>,
      dryRun,
    });
    writePlan = r.writes;
    warnings = r.warnings;
    engineResult = {
      step: "company",
      ok: true,
      config: {},
      warnings: r.warnings,
    };
  } else if (step === "template") {
    const r = await runTemplateAutoSelectV1({
      agentId,
      desiredTemplateKey: req.desiredTemplateKey,
      dryRun,
    });
    writePlan = r.writes;
    warnings = r.warnings;
    engineResult = {
      step: "template",
      ok: true,
      config: r.writes[0]?.payload as Record<string, unknown>,
      warnings: r.warnings,
    };
  } else if (step === "tools") {
    // Extract existing tools config from snapshot
    const existingToolConfig = snapResult.ok
      ? ((snapResult.data as Record<string, unknown>)?.tool_config as unknown)
      : undefined;

    // Use template-aware tools auto-fill with Tools Engine v1
    const r = await runToolsAutoFillV1({
      agentId,
      templateKey: templateKey ?? req.desiredTemplateKey,
      existingToolConfig,
      dryRun,
      force: req.force,
    });
    writePlan = r.writes;
    warnings = r.warnings;

    engineResult = {
      step: "tools",
      ok: true,
      config: r.writes[0]?.payload as Record<string, unknown>,
      confidence: r.confidence,
      gaps: r.gaps as GapItem[],
      warnings: r.warnings,
    };
  } else if (step === "flow") {
    // Extract existing flow config from snapshot
    const existingFlowConfig = snapResult.ok
      ? ((snapResult.data as Record<string, unknown>)?.flow_config as unknown)
      : undefined;

    // Extract enabled tools from snapshot for tool hooks
    const toolConfig = snapResult.ok
      ? ((snapResult.data as Record<string, unknown>)?.tool_config as Record<string, unknown>)
      : undefined;
    const enabledTools = Array.isArray(toolConfig?.enabled_tools)
      ? (toolConfig.enabled_tools as { id: string; enabled: boolean }[])
      : [];

    // Use template-aware flow auto-fill with Flow Engine v1
    const r = await runFlowAutoFillV1({
      agentId,
      templateKey: templateKey ?? req.desiredTemplateKey,
      existingFlowConfig,
      enabledTools,
      dryRun,
      force: req.force,
    });
    writePlan = r.writes;
    warnings = r.warnings;

    engineResult = {
      step: "flow",
      ok: true,
      config: r.writes[0]?.payload as Record<string, unknown>,
      confidence: r.confidence,
      gaps: r.gaps as GapItem[],
      warnings: r.warnings,
    };
  } else if (["personality", "brain", "knowledge", "memory", "learning"].includes(step)) {
    const r = await runModuleAutoFillDefaultsV1({ step, dryRun });
    writePlan = r.writes;
    warnings = r.warnings;
    engineResult = {
      step: step as "personality" | "brain" | "knowledge" | "memory" | "learning",
      ok: true,
      config: r.writes[0]?.payload as Record<string, unknown>,
      warnings: r.warnings,
    };
  } else if (step === "review" || step === "deploy") {
    warnings.push({
      code: "STEP_NOT_AUTOFILLABLE",
      message: `Step "${step}" requires manual review and cannot be auto-filled.`,
      severity: "info",
    });
  } else {
    warnings.push({
      code: "UNKNOWN_STEP",
      message: `Unknown step "${step}". No auto-fill action taken.`,
      severity: "warning",
    });
  }

  const finished = Date.now();

  // Extract snapshot data (if ok)
  const snapConfidence = snapResult.ok ? (snapResult.confidence as Record<string, number>) : {};
  const snapGaps = snapResult.ok ? (snapResult.gaps as GapItemBase[]) : [];

  // Merge engine-specific confidence and gaps if available
  const engineConfidence = (engineResult as Record<string, unknown>)?.confidence as Record<string, number> | undefined;
  const engineGaps = (engineResult as Record<string, unknown>)?.gaps as GapItemBase[] | undefined;

  const mergedConfidence = {
    ...snapConfidence,
    ...(engineConfidence ?? {}),
  };

  const mergedGaps = [
    ...snapGaps,
    ...(engineGaps ?? []),
  ];

  // Calculate overall confidence (prefer engine's module confidence for that step)
  const overallConfidence =
    mergedConfidence.overall ??
    mergedConfidence.tools ??
    mergedConfidence.flows ??
    0.6;

  return {
    agentId,
    ran_step: step,
    did_write: !dryRun && writePlan.length > 0,
    write_plan: writePlan,
    engine_result: engineResult,
    confidence: {
      overall: overallConfidence,
      by_module: mergedConfidence,
    },
    gaps: mergedGaps,
    warnings,
    metadata: {
      started_at: new Date(started).toISOString(),
      finished_at: new Date(finished).toISOString(),
      duration_ms: finished - started,
    },
  };
}

/**
 * Re-export for convenience.
 */
export { buildWizardSnapshotFromAgentId, buildNextStepExplainFromAgentId };
