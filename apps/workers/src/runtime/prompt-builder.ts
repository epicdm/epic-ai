/**
 * Prompt Builder
 *
 * Constructs the prompt envelope for LLM calls using agent configs,
 * context, knowledge, and flow state.
 *
 * @module runtime/prompt-builder
 */

import type {
  AgentFullConfig,
  RuntimeContext,
  FlowState,
  KnowledgeResult,
  ToolExecutionResult,
  BrainDecision,
  PromptEnvelope,
} from "./types";
import { formatContextForPrompt } from "./context-builder";
import { formatKnowledgeForPrompt } from "./knowledge-retriever";
import { getNodeInstructions, getMissingFields } from "./flow-controller";

// ============================================================================
// Prompt Building
// ============================================================================

export interface BuildPromptEnvelopeParams {
  agent: AgentFullConfig;
  context: RuntimeContext;
  knowledge: KnowledgeResult;
  flowState: FlowState;
  toolResult: ToolExecutionResult | null;
  decision: BrainDecision;
  userInput: string;
}

/**
 * Build the complete prompt envelope for the LLM call.
 */
export function buildPromptEnvelope(
  params: BuildPromptEnvelopeParams
): PromptEnvelope {
  const { agent, context, knowledge, flowState, toolResult, decision, userInput } = params;

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    agent,
    context,
    knowledge,
    flowState,
    toolResult,
    decision,
  });

  // Build user prompt
  const userPrompt = buildUserPrompt(userInput, toolResult);

  return {
    system_prompt: systemPrompt,
    user_prompt: userPrompt,
    context: {
      agent_id: agent.id,
      company_profile_id: agent.companyId ?? undefined,
      session_id: context.sessionId,
    },
    input_evidence: [],
    governance: {
      pii_allowed: agent.governance_config?.pii_handling?.auto_detect ?? false,
      max_tokens: 1024,
      temperature: 0.7,
      model: "gpt-4o",
    },
    created_at: new Date().toISOString(),
    request_id: `${context.sessionId}-${context.turnNumber}`,
  };
}

// ============================================================================
// System Prompt Building
// ============================================================================

interface BuildSystemPromptParams {
  agent: AgentFullConfig;
  context: RuntimeContext;
  knowledge: KnowledgeResult;
  flowState: FlowState;
  toolResult: ToolExecutionResult | null;
  decision: BrainDecision;
}

function buildSystemPrompt(params: BuildSystemPromptParams): string {
  const { agent, context, knowledge, flowState, toolResult, decision } = params;
  const { role_card, brain_config, personality_config, flow_config } = agent;

  const sections: string[] = [];

  // 1. Identity section
  sections.push(buildIdentitySection(role_card));

  // 2. Personality guidelines
  sections.push(buildPersonalitySection(personality_config));

  // 3. Response rules (from brain_config)
  if (brain_config.response_rules?.length) {
    sections.push(buildResponseRulesSection(brain_config.response_rules));
  }

  // 4. Current flow context
  sections.push(buildFlowSection(flow_config, flowState));

  // 5. Knowledge context (if available)
  if (knowledge.chunks.length > 0) {
    sections.push(formatKnowledgeForPrompt(knowledge.chunks, 5));
  }

  // 6. Tool result context (if tool was executed)
  if (toolResult) {
    sections.push(buildToolResultSection(toolResult));
  }

  // 7. Conversation context
  sections.push(formatContextForPrompt(context, 5));

  // 8. Decision guidance
  sections.push(buildDecisionGuidance(decision));

  // 9. Boundaries and escalation
  sections.push(buildBoundariesSection(role_card, brain_config));

  return sections.filter((s) => s.length > 0).join("\n\n");
}

function buildIdentitySection(roleCard: AgentFullConfig["role_card"]): string {
  const parts: string[] = [];

  parts.push(`# Your Identity`);
  parts.push(`You are ${roleCard.title} at ${roleCard.company}.`);

  if (roleCard.name) {
    parts.push(`Your name is ${roleCard.name}.`);
  }

  parts.push(`\nMission: ${roleCard.mission}`);

  if (roleCard.context) {
    parts.push(`\nContext: ${roleCard.context}`);
  }

  return parts.join("\n");
}

function buildPersonalitySection(
  personality: AgentFullConfig["personality_config"]
): string {
  const parts: string[] = [];

  parts.push(`# Communication Style`);

  // Voice tone
  if (personality.voice_tone) {
    parts.push(`- Tone: ${personality.voice_tone}`);
  }

  // Formality
  if (personality.formality !== undefined) {
    const formalityDesc =
      personality.formality >= 0.8
        ? "Very formal"
        : personality.formality >= 0.6
        ? "Professional"
        : personality.formality >= 0.4
        ? "Conversational"
        : "Casual";
    parts.push(`- Formality: ${formalityDesc}`);
  }

  // Language style
  if (personality.language_style) {
    const style = personality.language_style;
    if (style.complexity) parts.push(`- Complexity: ${style.complexity}`);
    if (style.sentence_length) parts.push(`- Sentences: ${style.sentence_length}`);
    if (style.use_contractions) parts.push(`- Use contractions`);
    if (style.use_jargon) parts.push(`- OK to use industry jargon`);
  }

  // Emojis
  if (personality.use_emojis) {
    parts.push(`- Use emojis sparingly for warmth`);
  }

  // Empathy
  if (personality.empathy_level) {
    parts.push(`- Empathy level: ${personality.empathy_level}`);
  }

  // Pace
  if (personality.pace) {
    parts.push(`- Response pace: ${personality.pace}`);
  }

  // Preferred phrases
  if (personality.preferred_phrases?.length) {
    parts.push(`- Preferred phrases: ${personality.preferred_phrases.slice(0, 5).join(", ")}`);
  }

  // Avoided phrases
  if (personality.avoided_phrases?.length) {
    parts.push(`- AVOID: ${personality.avoided_phrases.join(", ")}`);
  }

  // Greeting style
  if (personality.greeting_style) {
    parts.push(`- Greeting style: ${personality.greeting_style}`);
  }

  return parts.join("\n");
}

function buildResponseRulesSection(
  rules: AgentFullConfig["brain_config"]["response_rules"]
): string {
  const parts: string[] = [];

  parts.push(`# Response Rules`);

  for (const rule of rules.slice(0, 10)) {
    // Limit to 10 rules
    let ruleStr = `- ${rule.name}:`;
    if (rule.when) ruleStr += ` When ${rule.when},`;
    ruleStr += ` ${rule.do}`;
    parts.push(ruleStr);

    // Add example if available
    if (rule.examples?.[0]) {
      parts.push(`  Example: "${rule.examples[0]}"`);
    }
  }

  return parts.join("\n");
}

function buildFlowSection(
  flowConfig: AgentFullConfig["flow_config"],
  flowState: FlowState
): string {
  const parts: string[] = [];

  parts.push(`# Conversation Flow`);
  parts.push(`Current Stage: ${flowState.currentNode}`);
  parts.push(`Turn in stage: ${flowState.turnsInNode + 1}`);

  // Node instructions
  const nodeInstructions = getNodeInstructions(flowConfig, flowState);
  if (nodeInstructions) {
    parts.push(nodeInstructions);
  }

  // Missing fields
  const missingFields = getMissingFields(flowConfig, flowState);
  if (missingFields.length > 0) {
    parts.push(`\nNeed to collect: ${missingFields.join(", ")}`);
  }

  // Collected info
  const collected = Object.entries(flowState.collectedFields);
  if (collected.length > 0) {
    parts.push(`\nAlready collected:`);
    for (const [key, value] of collected.slice(0, 5)) {
      parts.push(`- ${key}: ${String(value).slice(0, 50)}`);
    }
  }

  return parts.join("\n");
}

function buildToolResultSection(toolResult: ToolExecutionResult): string {
  const parts: string[] = [];

  parts.push(`# Tool Execution Result`);
  parts.push(`Tool: ${toolResult.toolId}`);
  parts.push(`Status: ${toolResult.success ? "Success" : "Failed"}`);
  parts.push(`Summary: ${toolResult.summary}`);

  if (toolResult.error) {
    parts.push(`Error: ${toolResult.error}`);
  }

  if (toolResult.data && typeof toolResult.data === "object") {
    parts.push(`Data: ${JSON.stringify(toolResult.data).slice(0, 500)}`);
  }

  if (toolResult.requiredConfirmation) {
    parts.push(`Note: This action requires user confirmation before proceeding.`);
  }

  return parts.join("\n");
}

function buildDecisionGuidance(decision: BrainDecision): string {
  const parts: string[] = [];

  parts.push(`# Response Guidance`);
  parts.push(`Action: ${decision.action}`);
  parts.push(`Confidence: ${(decision.confidence * 100).toFixed(0)}%`);

  if (decision.detectedIntent) {
    parts.push(`Detected intent: ${decision.detectedIntent}`);
  }

  if (decision.responseApproach) {
    parts.push(`Approach: ${decision.responseApproach}`);
  }

  // Specific guidance based on action
  switch (decision.action) {
    case "respond":
      parts.push(`\nProvide a helpful, on-topic response.`);
      break;
    case "ask_clarification":
      parts.push(`\nAsk a clarifying question to better understand the user's needs.`);
      break;
    case "use_tool":
      parts.push(`\nA tool was executed. Incorporate the result naturally.`);
      break;
    case "escalate":
      parts.push(`\nPolitely transition to human support.`);
      break;
    case "end":
      parts.push(`\nProvide a warm closing message.`);
      break;
  }

  return parts.join("\n");
}

function buildBoundariesSection(
  roleCard: AgentFullConfig["role_card"],
  brainConfig: AgentFullConfig["brain_config"]
): string {
  const parts: string[] = [];

  parts.push(`# Boundaries`);

  // Role boundaries
  if (roleCard.boundaries?.length) {
    parts.push(`Stay within these bounds:`);
    for (const boundary of roleCard.boundaries.slice(0, 5)) {
      parts.push(`- ${boundary}`);
    }
  }

  // Escalation rules
  if (roleCard.escalation_rules?.length) {
    parts.push(`\nEscalate when:`);
    for (const rule of roleCard.escalation_rules.slice(0, 3)) {
      parts.push(`- ${rule.trigger}: ${rule.action}`);
    }
  }

  // Fallback behavior
  if (brainConfig.fallback_behavior) {
    const fb = brainConfig.fallback_behavior;
    if (fb.default_response) {
      parts.push(`\nIf uncertain, say: "${fb.default_response}"`);
    }
    if (fb.on_uncertainty) {
      parts.push(`On high uncertainty: ${fb.on_uncertainty}`);
    }
  }

  return parts.join("\n");
}

// ============================================================================
// User Prompt Building
// ============================================================================

function buildUserPrompt(
  userInput: string,
  toolResult: ToolExecutionResult | null
): string {
  if (!toolResult) {
    return userInput;
  }

  // If a tool was executed, include context
  if (toolResult.success && toolResult.requiredConfirmation) {
    return `${userInput}\n\n[System: Waiting for your confirmation to proceed with ${toolResult.toolId}]`;
  }

  return userInput;
}

// ============================================================================
// Prompt Helpers
// ============================================================================

/**
 * Estimate token count for a prompt.
 */
export function estimatePromptTokens(prompt: PromptEnvelope): number {
  const systemTokens = Math.ceil(prompt.system_prompt.length / 4);
  const userTokens = Math.ceil(prompt.user_prompt.length / 4);
  return systemTokens + userTokens;
}

/**
 * Truncate prompt if it exceeds max tokens.
 */
export function truncatePromptIfNeeded(
  prompt: PromptEnvelope,
  maxTokens: number
): PromptEnvelope {
  const estimated = estimatePromptTokens(prompt);

  if (estimated <= maxTokens) {
    return prompt;
  }

  // Calculate how much to trim
  const overageRatio = maxTokens / estimated;
  const targetSystemLength = Math.floor(prompt.system_prompt.length * overageRatio * 0.9);

  return {
    ...prompt,
    system_prompt: prompt.system_prompt.slice(0, targetSystemLength) + "\n[...truncated]",
  };
}
