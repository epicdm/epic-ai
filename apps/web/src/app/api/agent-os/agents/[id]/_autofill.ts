/**
 * Shared Auto-fill Logic for Agent OS
 *
 * Extracted from auto-fill-next-step/route.ts so both
 * single-step and loop endpoints can reuse the same dispatcher.
 */

import type { GapItem, WarningItem, ConfidenceMap } from "@epic-ai/shared";
import type { Prisma } from "@prisma/client";

// Workers: engines
import {
  runToolsEngine,
  runFlowEngine,
  runPersonalityEngine,
  runBrainEngine,
  runKnowledgeEngine,
  runLearningEngine,
  runMemoryEngine,
  type WizardStepKey,
  type ToolConfig,
  type FlowConfig,
  type FlowNode,
  type FlowEdge,
  type FlowIntent,
  type ToolHook,
  type FlowGuardrails,
} from "@epic-ai/workers/lib";

import { updateAgentModule } from "./_helpers";

// ============================================================================
// Types
// ============================================================================

export interface AutoFillEnvelope {
  did_save: boolean;
  reason: string | null;
  saved_module: string | null;
  config: Record<string, unknown> | null;
  confidence: ConfidenceMap;
  gaps: GapItem[];
  warnings: WarningItem[];
}

export interface AutoFillContext {
  agentId: string;
  step: WizardStepKey;
  templateKey: string | null;
  channels: Array<"VOICE" | "CHAT" | "SMS" | "EMAIL">;
  companyProfile: Record<string, unknown> | null;
  brandVoice: Record<string, unknown> | null;
  tools: string[];
}

// Step to Prisma field mapping
const STEP_TO_FIELD: Record<string, string> = {
  tools: "toolConfig",
  flow: "flowConfig",
  personality: "personalityConfig",
  brain: "brainConfig",
  knowledge: "knowledgeConfig",
  memory: "memoryConfig",
  learning: "learningConfig",
  governance: "governanceConfig",
  economics: "economicsConfig",
};

// ============================================================================
// Non-auto-fillable helper
// ============================================================================

function notAutoFillable(step: string, reason: string): AutoFillEnvelope {
  return {
    did_save: false,
    reason,
    saved_module: null,
    config: null,
    confidence: {},
    gaps: [
      {
        gap_type: "missing_required",
        field_path: `wizard.${step}`,
        severity: "high",
        impact: reason,
        recommended_fix: reason,
      },
    ],
    warnings: [],
  };
}

// ============================================================================
// Sales Qualifier v1 - Production Defaults
// ============================================================================

// ============================================================================
// Template Engine v1 - Sales Qualifier Auto-Select
// ============================================================================

/**
 * Build governance config with template_key = sales_qualifier.
 *
 * This is the minimal Template Engine v1 implementation:
 * - Always selects sales_qualifier template
 * - Stores template_key in governance_config JSONB
 * - Future versions will select based on company profile/industry
 */
function buildGovernanceWithTemplateKeySalesQualifierV1(): Record<string, unknown> {
  return {
    template_key: "sales_qualifier",

    compliance_rules: [],
    risk_thresholds: {
      low_confidence: 0.6,
      high_sensitivity: 0.8,
      sensitive_topics: ["legal", "medical", "financial"],
    },
    audit_settings: {
      log_conversations: true,
      log_tool_usage: true,
      log_decisions: false,
      retention_days: 90,
    },
    escalation_paths: [],
    pii_handling: {
      auto_detect: true,
      action: "mask",
      types: ["email", "phone", "ssn", "credit_card"],
      log_detections: true,
    },
    content_moderation: {
      enabled: true,
      categories: ["hate", "violence", "sexual", "self_harm"],
      action: "block",
    },
  };
}

// ============================================================================
// Sales Qualifier v1 - Production Defaults
// ============================================================================

/**
 * Build production-ready tools config for sales_qualifier template.
 *
 * Includes:
 * - Calendar booking for demos
 * - CRM for lead management
 * - Messaging (SMS/Email) for follow-ups
 * - Human handoff for escalation
 */
function buildSalesQualifierToolsV1(): ToolConfig {
  return {
    enabled_tools: [
      {
        id: "calendar.booking",
        name: "Calendar Booking",
        enabled: true,
        permissions: { read: true, write: true, delete: false },
        rate_limits: { calls_per_conversation: 5 },
        config: {
          default_duration_minutes: 30,
          buffer_minutes: 15,
          max_advance_days: 30,
        },
      },
      {
        id: "calendar.availability",
        name: "Availability Checker",
        enabled: true,
        permissions: { read: true },
        config: {
          timezone: "America/Los_Angeles",
          business_hours: { start: "09:00", end: "17:00" },
        },
      },
      {
        id: "crm.lead_create",
        name: "CRM Lead Create",
        enabled: true,
        permissions: { write: true },
        config: {
          default_source: "voice_agent",
          auto_assign: true,
        },
      },
      {
        id: "crm.lead_update",
        name: "CRM Lead Update",
        enabled: true,
        permissions: { read: true, write: true },
        config: {
          track_qualification_stage: true,
        },
      },
      {
        id: "sms.send",
        name: "SMS Follow-up",
        enabled: true,
        permissions: { write: true, requires_confirmation: true },
        rate_limits: { calls_per_conversation: 2, calls_per_day: 10 },
        config: {
          template_type: "follow_up",
          require_opt_in: true,
        },
      },
      {
        id: "email.send",
        name: "Email Follow-up",
        enabled: true,
        permissions: { write: true, requires_confirmation: true },
        rate_limits: { calls_per_conversation: 2, calls_per_day: 20 },
        config: {
          template_type: "meeting_summary",
          include_calendar_link: true,
        },
      },
      {
        id: "handoff.human",
        name: "Human Handoff",
        enabled: true,
        permissions: { write: true },
        config: {
          escalation_triggers: ["user_requests_human", "high_stakes_decision", "frustrated_user"],
          handoff_message: "I'm connecting you with a team member who can help further.",
        },
      },
    ],
    tool_policies: {
      confirm_sensitive_actions: true,
      max_tools_per_turn: 3,
      log_all_usage: true,
    },
    tool_preferences: {
      preferred_tools: [
        "calendar.booking",
        "crm.lead_create",
        "crm.lead_update",
        "handoff.human",
      ],
      strategy: "balanced",
    },
  };
}

/**
 * Build production-ready flow config for sales_qualifier template.
 *
 * BANT-inspired qualification flow:
 * - Greeting & rapport building
 * - Contact collection
 * - Need discovery
 * - Budget/Authority/Need/Timeline qualification
 * - Lead scoring & routing
 * - Demo booking or nurture path
 */
function buildSalesQualifierFlowV1(): FlowConfig {
  const nodes: FlowNode[] = [
    {
      id: "greet",
      type: "greeting",
      title: "Greeting + Set Expectations",
      instructions:
        "Greet the caller warmly. Introduce yourself and the company briefly. " +
        "Set expectations: 'I'll ask a few questions to understand your needs, " +
        "then we can see if there's a good fit and schedule time with a specialist if helpful.'",
      max_turns: 2,
    },
    {
      id: "collect_contact",
      type: "intake",
      title: "Collect Contact Info",
      instructions:
        "Collect name, email, and phone. Keep it conversational. " +
        "Explain briefly why: 'So I can send you relevant info and our team can follow up.'",
      required_fields: ["name", "email", "phone"],
      max_turns: 4,
    },
    {
      id: "discover_need",
      type: "intake",
      title: "Discover Primary Need",
      instructions:
        "Ask open-ended questions to understand their main challenge or goal. " +
        "'What brought you to us today?' or 'What problem are you trying to solve?' " +
        "Listen actively and confirm understanding.",
      required_fields: ["primary_need", "current_situation"],
      max_turns: 4,
    },
    {
      id: "qualify_budget",
      type: "qualify",
      title: "Budget Qualification",
      instructions:
        "Gently explore budget range. Frame positively: " +
        "'To recommend the right solution, it helps to know your budget range. " +
        "Are you thinking starter level, mid-range, or enterprise?' " +
        "Don't push if they're hesitant - note as 'budget_unknown'.",
      required_fields: ["budget_range"],
      max_turns: 3,
    },
    {
      id: "qualify_authority",
      type: "qualify",
      title: "Authority Qualification",
      instructions:
        "Determine decision-making authority. Ask naturally: " +
        "'Who else would be involved in this decision?' or " +
        "'Are you the primary decision-maker for this type of purchase?' " +
        "Capture stakeholder info if multiple parties involved.",
      required_fields: ["decision_maker", "stakeholders"],
      max_turns: 3,
    },
    {
      id: "qualify_timeline",
      type: "qualify",
      title: "Timeline Qualification",
      instructions:
        "Understand their timeline: 'When are you looking to have a solution in place?' " +
        "Capture urgency level. Urgent timelines may fast-track to demo.",
      required_fields: ["timeline", "urgency"],
      max_turns: 2,
    },
    {
      id: "score_lead",
      type: "triage",
      title: "Lead Scoring",
      instructions:
        "Based on BANT criteria, determine lead quality: " +
        "HOT: clear budget, decision-maker, urgent timeline → book_demo. " +
        "WARM: some criteria met → offer_resources. " +
        "COLD: doesn't meet criteria → nurture path.",
      max_turns: 1,
    },
    {
      id: "book_demo",
      type: "book",
      title: "Book Demo/Meeting",
      instructions:
        "Offer to book a demo or consultation. Check calendar availability. " +
        "'I'd love to set up a call with one of our specialists. " +
        "I have availability [times]. What works for you?'",
      required_fields: ["meeting_time"],
      max_turns: 4,
    },
    {
      id: "offer_resources",
      type: "followup",
      title: "Offer Resources",
      instructions:
        "For warm leads not ready to book: offer relevant content, case studies, " +
        "or a follow-up call. 'Let me send you some info that might help. " +
        "Can I follow up in a week to see if you have questions?'",
      max_turns: 3,
    },
    {
      id: "nurture",
      type: "followup",
      title: "Nurture Path",
      instructions:
        "For cold leads: thank them, offer newsletter/content, leave door open. " +
        "'Thanks for your time today. I'll add you to our list for helpful updates. " +
        "Feel free to reach out when timing is better.'",
      max_turns: 2,
    },
    {
      id: "create_lead",
      type: "capture",
      title: "Create/Update CRM Record",
      instructions:
        "Create or update lead in CRM with all collected information. " +
        "Include qualification score, notes, and next steps.",
      max_turns: 1,
    },
    {
      id: "send_followup",
      type: "followup",
      title: "Send Follow-up",
      instructions:
        "If meeting booked, send confirmation. If resources offered, send email. " +
        "Confirm with user before sending.",
      max_turns: 2,
    },
    {
      id: "handoff",
      type: "handoff",
      title: "Human Handoff",
      instructions:
        "Transfer to human agent when requested or for complex situations. " +
        "Summarize the conversation for the human agent.",
      max_turns: 2,
    },
    {
      id: "wrap_up",
      type: "close",
      title: "Wrap Up",
      instructions:
        "Thank them for their time. Confirm next steps clearly. " +
        "'Thanks for chatting! You'll receive [confirmation/resources]. " +
        "Our team will [follow up / see you at the meeting]. Have a great day!'",
      max_turns: 1,
    },
    {
      id: "fallback",
      type: "fallback",
      title: "Fallback/Clarification",
      instructions:
        "If conversation goes off-track or intent is unclear, gently redirect. " +
        "Ask a clarifying question then route back to appropriate stage.",
      max_turns: 3,
    },
  ];

  const intents: FlowIntent[] = [
    {
      id: "user_wants_pricing",
      description: "User asks about pricing or cost",
      examples: ["how much is it", "what's the pricing", "cost", "price", "budget"],
    },
    {
      id: "user_ready_to_book",
      description: "User wants to schedule a meeting",
      examples: ["book a call", "schedule", "set up a demo", "let's talk", "meet"],
    },
    {
      id: "user_requests_human",
      description: "User requests to speak with a human",
      examples: ["talk to a person", "human please", "real person", "agent", "someone else"],
    },
    {
      id: "unclear_intent",
      description: "User intent is unclear",
      examples: ["not sure", "just browsing", "looking around", "maybe", "I don't know"],
    },
    {
      id: "user_not_qualified",
      description: "User doesn't meet qualification criteria",
      examples: ["no budget", "just researching", "not the decision maker", "no timeline"],
    },
    {
      id: "user_objection",
      description: "User raises an objection",
      examples: ["too expensive", "not interested", "bad timing", "we already have"],
    },
  ];

  const edges: FlowEdge[] = [
    // Main flow
    { id: "e1", from: "greet", to: "collect_contact", when: { condition: "greeting_complete" }, priority: 10 },
    { id: "e2", from: "collect_contact", to: "discover_need", when: { condition: "contact_collected" }, priority: 10 },
    { id: "e3", from: "discover_need", to: "qualify_budget", when: { condition: "need_captured" }, priority: 10 },
    { id: "e4", from: "qualify_budget", to: "qualify_authority", when: { condition: "budget_discussed" }, priority: 10 },
    { id: "e5", from: "qualify_authority", to: "qualify_timeline", when: { condition: "authority_checked" }, priority: 10 },
    { id: "e6", from: "qualify_timeline", to: "score_lead", when: { condition: "timeline_captured" }, priority: 10 },

    // Scoring outcomes
    { id: "e7", from: "score_lead", to: "book_demo", when: { condition: "lead_is_qualified" }, priority: 10 },
    { id: "e8", from: "score_lead", to: "offer_resources", when: { condition: "lead_is_warm" }, priority: 20 },
    { id: "e9", from: "score_lead", to: "nurture", when: { condition: "lead_is_cold" }, priority: 30 },

    // Post-action flows
    { id: "e10", from: "book_demo", to: "create_lead", when: { condition: "meeting_booked" }, priority: 10 },
    { id: "e11", from: "offer_resources", to: "create_lead", when: { condition: "resources_offered" }, priority: 10 },
    { id: "e12", from: "nurture", to: "create_lead", when: { condition: "nurture_path_set" }, priority: 10 },
    { id: "e13", from: "create_lead", to: "send_followup", when: { condition: "lead_created" }, priority: 10 },
    { id: "e14", from: "send_followup", to: "wrap_up", when: { condition: "followup_sent" }, priority: 10 },

    // Human handoff (global)
    { id: "e15", from: "*", to: "handoff", when: { intent: "user_requests_human" }, priority: 100 },
    { id: "e16", from: "handoff", to: "wrap_up", when: { condition: "handoff_complete" }, priority: 10 },

    // Fallback routes
    { id: "e17", from: "discover_need", to: "fallback", when: { intent: "unclear_intent" }, priority: 50 },
    { id: "e18", from: "qualify_budget", to: "fallback", when: { intent: "unclear_intent" }, priority: 50 },
    { id: "e19", from: "fallback", to: "discover_need", when: { condition: "clarified" }, priority: 10 },

    // Skip to booking if eager
    { id: "e20", from: "discover_need", to: "book_demo", when: { intent: "user_ready_to_book" }, priority: 80 },
    { id: "e21", from: "qualify_budget", to: "book_demo", when: { intent: "user_ready_to_book" }, priority: 80 },

    // Early exit for unqualified
    { id: "e22", from: "qualify_budget", to: "nurture", when: { intent: "user_not_qualified" }, priority: 40 },
  ];

  const toolHooks: ToolHook[] = [
    {
      id: "hook_book_calendar",
      tool_id: "calendar.booking",
      when: { node_id: "book_demo", event: "on_confirm" },
      input_mapping: {
        meeting_time: "meeting_time",
        attendee_name: "name",
        attendee_email: "email",
      },
      output_mapping: {
        booking_id: "booking_id",
        confirmation_url: "confirmation_url",
      },
      requires_confirmation: true,
    },
    {
      id: "hook_create_lead",
      tool_id: "crm.lead_create",
      when: { node_id: "create_lead", event: "on_enter" },
      input_mapping: {
        name: "name",
        email: "email",
        phone: "phone",
        primary_need: "primary_need",
        budget_range: "budget_range",
        decision_maker: "decision_maker",
        timeline: "timeline",
        qualification_score: "lead_score",
      },
      output_mapping: {
        lead_id: "crm_lead_id",
      },
    },
    {
      id: "hook_send_email",
      tool_id: "email.send",
      when: { node_id: "send_followup", event: "on_confirm" },
      input_mapping: {
        to_email: "email",
        to_name: "name",
        template_type: "followup_type",
        booking_id: "booking_id",
      },
      requires_confirmation: true,
    },
    {
      id: "hook_handoff",
      tool_id: "handoff.human",
      when: { node_id: "handoff", event: "on_enter" },
      input_mapping: {
        conversation_summary: "conversation_summary",
        caller_name: "name",
        caller_phone: "phone",
        reason: "handoff_reason",
      },
    },
  ];

  const guardrails: FlowGuardrails = {
    escalation: {
      on_user_requests_human: true,
      on_high_stakes_topics: true,
      on_low_confidence: true,
    },
    fallback: {
      max_clarifications: 3,
      fallback_node_id: "fallback",
    },
  };

  return {
    version: "v1",
    templateKey: "sales_qualifier",
    entry_node_id: "greet",
    exit_node_ids: ["wrap_up"],
    nodes,
    edges,
    intents,
    tool_hooks: toolHooks,
    guardrails,
  };
}

// ============================================================================
// Engine Dispatcher
// ============================================================================

/**
 * Run the appropriate engine for a single step.
 * Pure function that returns the envelope - does NOT save to DB.
 */
export async function autoFillOneStep(ctx: AutoFillContext): Promise<AutoFillEnvelope> {
  const { step, templateKey, channels, companyProfile, brandVoice, tools } = ctx;

  // -------------------------------------------
  // Steps that are NOT auto-fillable
  // -------------------------------------------

  if (step === "company") {
    return notAutoFillable(
      step,
      "Company step requires enrichment or manual profile. Provide a website URL or complete company profile first."
    );
  }

  if (step === "template") {
    // Template Engine v1: auto-select sales_qualifier
    // Store template_key in governance_config for downstream steps to read
    const governanceConfig = buildGovernanceWithTemplateKeySalesQualifierV1();
    return {
      did_save: true,
      reason: null,
      saved_module: "governance",
      config: governanceConfig,
      confidence: {
        template_selection: 0.95,
        governance_defaults: 0.9,
      },
      gaps: [],
      warnings: [
        {
          code: "TEMPLATE_SELECTED_V1",
          message: "Template Engine v1 auto-selected sales_qualifier. Stored in governance_config.template_key.",
          severity: "info",
        },
      ],
    };
  }

  if (step === "governance") {
    return notAutoFillable(
      step,
      "Governance engine not yet implemented. Configure governance manually."
    );
  }

  if (step === "economics") {
    return notAutoFillable(
      step,
      "Economics engine not yet implemented. Configure economics manually."
    );
  }

  if (step === "review") {
    return {
      did_save: false,
      reason: "Review step does not produce a config. Agent is ready for review.",
      saved_module: null,
      config: null,
      confidence: {},
      gaps: [],
      warnings: [],
    };
  }

  // -------------------------------------------
  // Tools Engine
  // -------------------------------------------
  if (step === "tools") {
    // Use production defaults for sales_qualifier v1
    if (templateKey === "sales_qualifier") {
      const toolConfig = buildSalesQualifierToolsV1();
      return {
        did_save: true,
        reason: null,
        saved_module: "tools",
        config: toolConfig as unknown as Record<string, unknown>,
        confidence: {
          enabled_tools: 0.95,
          tool_selection: 0.95,
          tool_policies: 0.9,
        },
        gaps: [],
        warnings: [],
      };
    }

    // Generic engine for other templates
    const result = await runToolsEngine({
      templateKey: templateKey as Parameters<typeof runToolsEngine>[0]["templateKey"],
      channels,
      company: companyProfile as Parameters<typeof runToolsEngine>[0]["company"],
    });

    return {
      did_save: true,
      reason: null,
      saved_module: "tools",
      config: result.tool_config as unknown as Record<string, unknown>,
      confidence: result.confidence ?? { tools: 1 },
      gaps: (result.gaps ?? []) as GapItem[],
      warnings: (result.warnings ?? []) as WarningItem[],
    };
  }

  // -------------------------------------------
  // Flow Engine
  // -------------------------------------------
  if (step === "flow") {
    // Use production defaults for sales_qualifier v1
    if (templateKey === "sales_qualifier") {
      const flowConfig = buildSalesQualifierFlowV1();
      return {
        did_save: true,
        reason: null,
        saved_module: "flow",
        config: flowConfig as unknown as Record<string, unknown>,
        confidence: {
          flow_structure: 0.95,
          node_instructions: 0.9,
          edge_logic: 0.9,
          intents: 0.85,
          guardrails: 0.95,
        },
        gaps: [],
        warnings: [],
      };
    }

    // Generic engine for other templates
    const result = await runFlowEngine({
      templateKey: templateKey as Parameters<typeof runFlowEngine>[0]["templateKey"],
      channels,
      tools: tools.map((id) => ({ id, enabled: true })),
      company: companyProfile as Parameters<typeof runFlowEngine>[0]["company"],
    });

    return {
      did_save: true,
      reason: null,
      saved_module: "flow",
      config: result.flows as unknown as Record<string, unknown>,
      confidence: result.confidence ?? { flow: 1 },
      gaps: (result.gaps ?? []) as GapItem[],
      warnings: (result.warnings ?? []) as WarningItem[],
    };
  }

  // -------------------------------------------
  // Personality Engine
  // -------------------------------------------
  if (step === "personality") {
    const result = await runPersonalityEngine({
      templateKey: templateKey as Parameters<typeof runPersonalityEngine>[0]["templateKey"],
      channels,
      company: companyProfile as Parameters<typeof runPersonalityEngine>[0]["company"],
      brandVoice: brandVoice as Parameters<typeof runPersonalityEngine>[0]["brandVoice"],
    });

    return {
      did_save: true,
      reason: null,
      saved_module: "personality",
      config: result.personality_config as unknown as Record<string, unknown>,
      confidence: result.confidence ?? { personality: 1 },
      gaps: (result.gaps ?? []) as GapItem[],
      warnings: (result.warnings ?? []) as WarningItem[],
    };
  }

  // -------------------------------------------
  // Brain Engine
  // -------------------------------------------
  if (step === "brain") {
    const result = await runBrainEngine({
      templateKey: templateKey as Parameters<typeof runBrainEngine>[0]["templateKey"],
      channels,
      company: companyProfile as Parameters<typeof runBrainEngine>[0]["company"],
    });

    return {
      did_save: true,
      reason: null,
      saved_module: "brain",
      config: result.brain_config as unknown as Record<string, unknown>,
      confidence: result.confidence ?? { brain: 1 },
      gaps: (result.gaps ?? []) as GapItem[],
      warnings: (result.warnings ?? []) as WarningItem[],
    };
  }

  // -------------------------------------------
  // Knowledge Engine
  // -------------------------------------------
  if (step === "knowledge") {
    const result = runKnowledgeEngine({
      company_profile: companyProfile as Parameters<typeof runKnowledgeEngine>[0]["company_profile"],
    });

    return {
      did_save: true,
      reason: null,
      saved_module: "knowledge",
      config: result.knowledge_config as unknown as Record<string, unknown>,
      confidence: { knowledge: result.confidence ?? 1 },
      gaps: (result.gaps ?? []) as GapItem[],
      warnings: [],
    };
  }

  // -------------------------------------------
  // Memory Engine
  // -------------------------------------------
  if (step === "memory") {
    const result = runMemoryEngine({
      templateKey: templateKey ?? "sales_qualifier",
      channels: channels.map((c) => c.toLowerCase()) as Parameters<typeof runMemoryEngine>[0]["channels"],
      companyProfile: companyProfile as Parameters<typeof runMemoryEngine>[0]["companyProfile"],
    });

    return {
      did_save: true,
      reason: null,
      saved_module: "memory",
      config: result.memory_config as unknown as Record<string, unknown>,
      confidence: { memory: result.confidence ?? 1 },
      gaps: (result.gaps ?? []) as unknown as GapItem[],
      warnings: (result.warnings ?? []) as unknown as WarningItem[],
    };
  }

  // -------------------------------------------
  // Learning Engine
  // -------------------------------------------
  if (step === "learning") {
    const result = runLearningEngine({
      templateKey: templateKey ?? "sales_qualifier",
      channels: channels.map((c) => c.toLowerCase()) as Parameters<typeof runLearningEngine>[0]["channels"],
      companyProfile: companyProfile as Parameters<typeof runLearningEngine>[0]["companyProfile"],
    });

    return {
      did_save: true,
      reason: null,
      saved_module: "learning",
      config: result.learning_config as unknown as Record<string, unknown>,
      confidence: { learning: result.confidence ?? 1 },
      gaps: (result.gaps ?? []) as unknown as GapItem[],
      warnings: (result.warnings ?? []) as unknown as WarningItem[],
    };
  }

  // -------------------------------------------
  // Unknown step
  // -------------------------------------------
  return {
    did_save: false,
    reason: `Unknown or unsupported step: ${step}`,
    saved_module: null,
    config: null,
    confidence: {},
    gaps: [
      {
        gap_type: "invalid",
        field_path: `wizard.${step}`,
        severity: "medium",
        impact: `Unsupported step: ${step}`,
        recommended_fix: "Use a supported step key or update dispatcher.",
      },
    ],
    warnings: [],
  };
}

// ============================================================================
// Save Helper
// ============================================================================

/**
 * Save the auto-fill result to the agent's module config
 */
export async function saveAutoFillResult(
  agentId: string,
  envelope: AutoFillEnvelope
): Promise<void> {
  if (!envelope.did_save || !envelope.config || !envelope.saved_module) {
    return;
  }

  const field = STEP_TO_FIELD[envelope.saved_module];
  if (!field) {
    return;
  }

  await updateAgentModule(
    agentId,
    field as keyof Prisma.AgentUpdateInput,
    envelope.config,
    {
      confidence: envelope.confidence,
      gaps: envelope.gaps,
      warnings: envelope.warnings,
    }
  );
}

// ============================================================================
// Context Extractors
// ============================================================================

/**
 * Extract channels from snapshot data
 */
export function extractChannels(
  template: Record<string, unknown> | null
): Array<"VOICE" | "CHAT" | "SMS" | "EMAIL"> {
  if (!template) return ["VOICE"];
  const channels = template.channels as string[] | undefined;
  if (channels && Array.isArray(channels)) {
    return channels.map((c) => c.toUpperCase() as "VOICE" | "CHAT" | "SMS" | "EMAIL");
  }
  return ["VOICE"];
}

/**
 * Extract tool IDs from snapshot data
 */
export function extractTools(snapshot: Record<string, unknown> | null): string[] {
  if (!snapshot) return [];
  const tools = snapshot.tools as Record<string, unknown> | null;
  if (!tools) return [];
  const enabledTools = tools.enabled_tools as Array<{ id: string }> | null;
  if (enabledTools && Array.isArray(enabledTools)) {
    return enabledTools.map((t) => t.id);
  }
  return [];
}

// Re-export types
export type { WizardStepKey };
