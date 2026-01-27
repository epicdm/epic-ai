/**
 * Brain Engine v1 - Rules Builder
 *
 * Builds brain configuration from:
 * - Template defaults (base)
 * - Channel constraints (adjustments)
 * - Industry safety clamps
 * - Governance rules
 *
 * @module engines/brain/rules
 */

import type { AgentType } from "@epic-ai/shared";
import { getTemplateBrainDefaults } from "./brain.catalog";
import type {
  BrainConfig,
  DecisionPolicy,
  ResponseRule,
  ContextHandling,
  ReasoningStrategy,
  FallbackBehavior,
  GovernanceHints,
  BrainEvidence,
} from "./brain.types";

// ============================================
// CONSERVATIVE INDUSTRIES
// ============================================

/** Industries requiring conservative/safe handling */
const CONSERVATIVE_INDUSTRIES = [
  "legal",
  "law",
  "finance",
  "financial",
  "banking",
  "insurance",
  "healthcare",
  "medical",
  "pharmaceutical",
  "government",
  "compliance",
];

/** Check if industry requires conservative settings */
function isConservativeIndustry(industry?: string): boolean {
  if (!industry) return false;
  const normalized = industry.toLowerCase();
  return CONSERVATIVE_INDUSTRIES.some(
    (ind) => normalized.includes(ind) || ind.includes(normalized)
  );
}

// ============================================
// DECISION POLICIES BUILDER
// ============================================

/** Build core decision policies */
function buildDecisionPolicies(params: {
  industry?: string;
  governance?: GovernanceHints | null;
  evidence: BrainEvidence[];
}): DecisionPolicy[] {
  const { industry, governance, evidence } = params;
  const policies: DecisionPolicy[] = [];

  // Core policy: Human request escalation (highest priority)
  policies.push({
    name: "Human request escalation",
    description: "If user requests a human, comply and route to handoff.",
    conditions: ["user_requests_human"],
    action: "escalate_to_human",
    priority: 100,
  });

  // Core policy: PII handling
  policies.push({
    name: "PII handling",
    description: "If user shares PII, follow governance policy and confirm consent before storage/use.",
    conditions: ["pii_detected"],
    action: governance?.pii_allowed ? "apply_pii_policy" : "reject_pii_storage",
    priority: 95,
  });

  // Conservative industry: High-stakes safety clamp
  if (isConservativeIndustry(industry)) {
    policies.push({
      name: "High-stakes guidance safety",
      description: "Avoid definitive legal/medical/financial advice; encourage professional consultation.",
      conditions: ["high_stakes_topic_detected"],
      action: "provide_general_info_and_escalate",
      priority: 98,
    });

    evidence.push({
      source_type: "industry_clamp",
      field_path: "decision_policies",
      confidence: 1.0,
      reasoning: `Added high-stakes safety policy for ${industry} industry`,
    });
  }

  // Core policy: Low confidence fallback
  policies.push({
    name: "Low confidence fallback",
    description: "If the agent is uncertain, ask a focused clarifying question.",
    conditions: ["low_confidence_response"],
    action: "ask_clarifying_question",
    priority: 90,
  });

  // Core policy: Tool use gating
  policies.push({
    name: "Tool use gating",
    description: "Use tools only when necessary, and confirm sensitive actions.",
    conditions: ["tool_action_required"],
    action: governance?.require_confirmations ? "run_tool_with_confirmation" : "run_tool_with_policy",
    priority: 80,
  });

  // Governance: Sensitive topics handling
  if (governance?.sensitive_topics?.length) {
    policies.push({
      name: "Sensitive topics handling",
      description: `Handle these topics with extra care: ${governance.sensitive_topics.join(", ")}`,
      conditions: ["sensitive_topic_detected"],
      action: "apply_cautious_response",
      priority: 85,
    });

    evidence.push({
      source_type: "governance_rule",
      field_path: "decision_policies",
      confidence: 1.0,
      reasoning: `Added sensitive topics policy for: ${governance.sensitive_topics.join(", ")}`,
    });
  }

  // Governance: Max autonomous actions
  if (governance?.max_autonomous_actions !== undefined) {
    policies.push({
      name: "Autonomous action limit",
      description: `Limit autonomous actions to ${governance.max_autonomous_actions} per conversation.`,
      conditions: ["autonomous_action_limit_reached"],
      action: "require_user_confirmation",
      priority: 75,
    });
  }

  evidence.push({
    source_type: "inference",
    field_path: "decision_policies",
    confidence: 0.9,
    reasoning: `Generated ${policies.length} decision policies from template and governance rules`,
  });

  return policies;
}

// ============================================
// RESPONSE RULES BUILDER
// ============================================

/** Build response rules based on template and channels */
function buildResponseRules(params: {
  templateKey: AgentType;
  channels: string[];
  evidence: BrainEvidence[];
}): ResponseRule[] {
  const { channels, evidence } = params;
  const rules: ResponseRule[] = [];

  // Core rule: Be concise
  rules.push({
    name: "Be concise by default",
    when: "user asks a question",
    do: "Answer in 2-6 sentences, then ask 1 next best question if needed.",
    examples: ["Here's the main answer…", "To tailor this, can I ask…?"],
  });

  // Core rule: Confirm before irreversible actions
  rules.push({
    name: "Confirm before irreversible actions",
    when: "about to send message, book, charge, delete, or create ticket",
    do: "Summarize action and ask for confirmation unless explicitly allowed by policy.",
    examples: ["I can book that for Tuesday at 2pm—should I confirm it?"],
  });

  // Core rule: Summarize and checkpoint
  rules.push({
    name: "Summarize and checkpoint",
    when: "conversation exceeds context window or user seems confused",
    do: "Summarize what you know + what you still need, then proceed.",
    examples: ["So far I have… The only missing piece is…"],
  });

  // Core rule: One question at a time
  rules.push({
    name: "One question at a time",
    when: "gathering information from user",
    do: "Ask one focused question, wait for response, then continue.",
    examples: ["What day works best for you?"],
  });

  // Channel-specific: SMS brevity
  if (channels.some((c) => c.toLowerCase() === "sms")) {
    rules.push({
      name: "SMS brevity",
      when: "channel is SMS",
      do: "Use short sentences, 1 question at a time, avoid long lists.",
      examples: ["What day works best—Mon or Tue?"],
    });

    evidence.push({
      source_type: "channel_constraint",
      field_path: "response_rules",
      confidence: 1.0,
      reasoning: "Added SMS brevity rule for short message channel",
    });
  }

  // Channel-specific: Voice pacing
  if (channels.some((c) => ["voice", "phone"].includes(c.toLowerCase()))) {
    rules.push({
      name: "Voice pacing",
      when: "channel is VOICE",
      do: "Avoid dense paragraphs; pause for confirmations; read back key details.",
      examples: ["Just to confirm: your name is… and you prefer… right?"],
    });

    evidence.push({
      source_type: "channel_constraint",
      field_path: "response_rules",
      confidence: 1.0,
      reasoning: "Added voice pacing rule for voice channel",
    });
  }

  // Channel-specific: WhatsApp formatting
  if (channels.some((c) => c.toLowerCase() === "whatsapp")) {
    rules.push({
      name: "WhatsApp formatting",
      when: "channel is WhatsApp",
      do: "Use short messages, emojis sparingly, bullet points for lists.",
      examples: ["• Option 1\n• Option 2\n• Option 3"],
    });

    evidence.push({
      source_type: "channel_constraint",
      field_path: "response_rules",
      confidence: 1.0,
      reasoning: "Added WhatsApp formatting rule",
    });
  }

  // Channel-specific: Email formality
  if (channels.some((c) => c.toLowerCase() === "email")) {
    rules.push({
      name: "Email formality",
      when: "channel is EMAIL",
      do: "Use proper greeting, structured paragraphs, professional signoff.",
      examples: ["Dear [Name],\n\n[Body]\n\nBest regards,\n[Agent]"],
    });

    evidence.push({
      source_type: "channel_constraint",
      field_path: "response_rules",
      confidence: 1.0,
      reasoning: "Added email formality rule",
    });
  }

  evidence.push({
    source_type: "template_default",
    field_path: "response_rules",
    confidence: 0.85,
    reasoning: `Generated ${rules.length} response rules from template and channels`,
  });

  return rules;
}

// ============================================
// CONTEXT HANDLING BUILDER
// ============================================

/** Default entities to track */
const DEFAULT_TRACKED_ENTITIES = ["name", "email", "phone", "company", "intent"];

/** Build context handling config */
function buildContextHandling(params: {
  templateDefaults: { conversation_window?: number; summarize_long_conversations?: boolean };
  channels: string[];
  evidence: BrainEvidence[];
}): ContextHandling {
  const { templateDefaults, channels, evidence } = params;

  let conversationWindow = templateDefaults.conversation_window ?? 10;

  // Adjust for channel constraints
  if (channels.some((c) => ["sms", "whatsapp"].includes(c.toLowerCase()))) {
    // Shorter window for quick channels
    conversationWindow = Math.min(conversationWindow, 8);
  }

  if (channels.some((c) => ["voice", "phone"].includes(c.toLowerCase()))) {
    // Shorter window for voice (memory constraints)
    conversationWindow = Math.min(conversationWindow, 10);
  }

  evidence.push({
    source_type: "template_default",
    field_path: "context_handling",
    confidence: 0.9,
    reasoning: `Set conversation window to ${conversationWindow} messages`,
  });

  return {
    conversation_window: conversationWindow,
    summarize_long_conversations: templateDefaults.summarize_long_conversations ?? true,
    track_entities: DEFAULT_TRACKED_ENTITIES,
  };
}

// ============================================
// MAIN BUILD FUNCTION
// ============================================

/** Build result with config and evidence */
export interface BuildBrainResult {
  config: BrainConfig;
  evidence: BrainEvidence[];
}

/** Build brain configuration from all sources */
export function buildBrainConfig(params: {
  templateKey: AgentType;
  channels?: string[];
  industry?: string;
  governance?: GovernanceHints | null;
}): BuildBrainResult {
  const { templateKey, channels = [], industry, governance } = params;
  const evidence: BrainEvidence[] = [];

  // 1. Get template defaults
  const templateDefaults = getTemplateBrainDefaults(templateKey);

  evidence.push({
    source_type: "template_default",
    field_path: "*",
    confidence: 1.0,
    reasoning: `Applied ${templateKey} template brain defaults`,
  });

  // 2. Build decision policies
  const decision_policies = buildDecisionPolicies({
    industry,
    governance,
    evidence,
  });

  // 3. Build response rules
  const response_rules = buildResponseRules({
    templateKey,
    channels,
    evidence,
  });

  // 4. Build context handling
  const context_handling = buildContextHandling({
    templateDefaults: templateDefaults.context_handling,
    channels,
    evidence,
  });

  // 5. Apply reasoning strategy from template
  const reasoning_strategy: ReasoningStrategy = {
    approach: templateDefaults.reasoning_strategy.approach,
    show_reasoning: templateDefaults.reasoning_strategy.show_reasoning,
    max_reasoning_steps: templateDefaults.reasoning_strategy.max_reasoning_steps,
  };

  // Adjust reasoning for conservative industries
  if (isConservativeIndustry(industry)) {
    // Use deliberative approach for high-stakes
    if (reasoning_strategy.approach === "direct") {
      reasoning_strategy.approach = "deliberative";
      evidence.push({
        source_type: "industry_clamp",
        field_path: "reasoning_strategy.approach",
        confidence: 1.0,
        reasoning: `Upgraded reasoning to deliberative for ${industry} industry`,
      });
    }
  }

  // 6. Apply fallback behavior from template
  const fallback_behavior: FallbackBehavior = {
    on_uncertainty: templateDefaults.fallback_behavior.on_uncertainty,
    default_response: templateDefaults.fallback_behavior.default_response,
    max_clarifications: templateDefaults.fallback_behavior.max_clarifications,
  };

  // Conservative industries should escalate more readily
  if (isConservativeIndustry(industry) && fallback_behavior.on_uncertainty === "best_guess") {
    fallback_behavior.on_uncertainty = "ask_clarification";
    evidence.push({
      source_type: "industry_clamp",
      field_path: "fallback_behavior.on_uncertainty",
      confidence: 1.0,
      reasoning: `Changed uncertainty action to ask_clarification for ${industry} industry`,
    });
  }

  const config: BrainConfig = {
    decision_policies,
    response_rules,
    context_handling,
    reasoning_strategy,
    fallback_behavior,
  };

  return { config, evidence };
}

// ============================================
// HELPERS
// ============================================

/** Check if governance has meaningful data */
export function hasGovernanceData(governance?: GovernanceHints | null): boolean {
  if (!governance) return false;

  return !!(
    governance.pii_allowed !== undefined ||
    governance.sensitive_topics?.length ||
    governance.require_confirmations !== undefined ||
    governance.max_autonomous_actions !== undefined
  );
}

/** Get list of high-priority policies */
export function getHighPriorityPolicies(policies: DecisionPolicy[]): DecisionPolicy[] {
  return policies.filter((p) => p.priority >= 90);
}
