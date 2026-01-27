/**
 * Brain Decision Engine
 *
 * Makes runtime decisions based on brain_config policies,
 * user input, and conversation context.
 *
 * @module runtime/brain-engine
 */

import type {
  BrainConfig,
  RuntimeContext,
  BrainDecision,
  FlowState,
} from "./types";

// ============================================================================
// Decision Engine
// ============================================================================

export interface BrainDecideParams {
  brainConfig: BrainConfig;
  userInput: string;
  context: RuntimeContext;
  flowState: FlowState;
  availableTools: string[];
}

/**
 * Make a decision about how to handle the user's input.
 * Uses brain_config policies, reasoning strategy, and context.
 */
export async function brainDecide(
  params: BrainDecideParams
): Promise<BrainDecision> {
  const { brainConfig, userInput, context, flowState, availableTools } = params;

  // 1. Check for escalation triggers first (highest priority)
  const escalation = checkEscalationTriggers(brainConfig, userInput, context);
  if (escalation) {
    return {
      action: "escalate",
      confidence: escalation.confidence,
      reasoning: escalation.reasoning,
      escalation: {
        reason: escalation.reason,
        target: escalation.target,
        urgency: escalation.urgency,
      },
    };
  }

  // 2. Check decision policies (in priority order)
  const policyMatch = matchDecisionPolicy(brainConfig.decision_policies, userInput, context);
  if (policyMatch) {
    return buildDecisionFromPolicy(policyMatch, availableTools);
  }

  // 3. Detect intent from user input
  const detectedIntent = detectIntent(userInput, context, flowState);

  // 4. Determine if we should use a tool
  const toolDecision = shouldUseTool(userInput, detectedIntent, availableTools, flowState);
  if (toolDecision.shouldUse) {
    return {
      action: "use_tool",
      confidence: toolDecision.confidence,
      reasoning: toolDecision.reasoning,
      tool: toolDecision.tool,
      detectedIntent,
    };
  }

  // 5. Check if we need clarification
  if (needsClarification(userInput, context, brainConfig)) {
    return {
      action: "ask_clarification",
      confidence: 0.6,
      reasoning: "User input is ambiguous or missing required information.",
      detectedIntent,
      responseApproach: "empathetic",
    };
  }

  // 6. Check if conversation should end
  if (shouldEndConversation(userInput, flowState, detectedIntent)) {
    return {
      action: "end",
      confidence: 0.85,
      reasoning: "User indicated they want to end the conversation or we reached a natural conclusion.",
      detectedIntent,
    };
  }

  // 7. Default: respond normally
  const responseApproach = determineResponseApproach(
    brainConfig.reasoning_strategy,
    detectedIntent,
    context
  );

  return {
    action: "respond",
    confidence: 0.8,
    reasoning: "Standard conversational response based on user input and context.",
    detectedIntent,
    responseApproach,
  };
}

// ============================================================================
// Escalation Detection
// ============================================================================

interface EscalationResult {
  confidence: number;
  reasoning: string;
  reason: string;
  target: "human" | "supervisor" | "manager";
  urgency: "low" | "medium" | "high";
}

function checkEscalationTriggers(
  brainConfig: BrainConfig,
  userInput: string,
  context: RuntimeContext
): EscalationResult | null {
  const inputLower = userInput.toLowerCase();

  // Explicit request for human
  if (
    inputLower.includes("speak to a human") ||
    inputLower.includes("talk to someone") ||
    inputLower.includes("real person") ||
    inputLower.includes("customer service") ||
    inputLower.includes("manager")
  ) {
    return {
      confidence: 0.95,
      reasoning: "User explicitly requested human assistance.",
      reason: "User requested human agent",
      target: "human",
      urgency: "medium",
    };
  }

  // Frustration indicators
  const frustrationIndicators = [
    "this is ridiculous",
    "i'm frustrated",
    "terrible",
    "worst",
    "useless",
    "not working",
    "give up",
    "can't help",
  ];

  if (frustrationIndicators.some((f) => inputLower.includes(f))) {
    return {
      confidence: 0.8,
      reasoning: "User is showing signs of frustration.",
      reason: "User frustration detected",
      target: "human",
      urgency: "high",
    };
  }

  // Check for sensitive topics
  const sensitiveTopics = [
    "legal",
    "lawyer",
    "lawsuit",
    "refund",
    "cancel subscription",
    "complaint",
    "discrimination",
  ];

  if (sensitiveTopics.some((t) => inputLower.includes(t))) {
    return {
      confidence: 0.75,
      reasoning: "User mentioned sensitive topic requiring human review.",
      reason: "Sensitive topic detected",
      target: "supervisor",
      urgency: "medium",
    };
  }

  // Check fallback behavior settings
  if (brainConfig.fallback_behavior?.on_uncertainty === "escalate") {
    // Multiple clarification attempts without progress
    const recentClarifications = context.messages.filter(
      (m) =>
        m.role === "assistant" &&
        (m.content.toLowerCase().includes("could you clarify") ||
          m.content.toLowerCase().includes("i'm not sure"))
    );

    const maxClarifications = brainConfig.fallback_behavior?.max_clarifications ?? 3;
    if (recentClarifications.length >= maxClarifications) {
      return {
        confidence: 0.7,
        reasoning: `Exceeded ${maxClarifications} clarification attempts.`,
        reason: "Unable to resolve user request",
        target: "human",
        urgency: "low",
      };
    }
  }

  return null;
}

// ============================================================================
// Policy Matching
// ============================================================================

interface PolicyMatch {
  policy: BrainConfig["decision_policies"][0];
  confidence: number;
  matchedConditions: string[];
}

function matchDecisionPolicy(
  policies: BrainConfig["decision_policies"],
  userInput: string,
  context: RuntimeContext
): PolicyMatch | null {
  if (!policies || policies.length === 0) return null;

  const inputLower = userInput.toLowerCase();
  const sortedPolicies = [...policies].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
  );

  for (const policy of sortedPolicies) {
    const matchedConditions: string[] = [];

    for (const condition of policy.conditions) {
      const conditionLower = condition.toLowerCase();

      // Simple keyword matching for v1
      // In v2, this would use more sophisticated NLU
      if (
        inputLower.includes(conditionLower) ||
        conditionMatches(conditionLower, inputLower, context)
      ) {
        matchedConditions.push(condition);
      }
    }

    // Policy matches if at least half of conditions are met
    if (matchedConditions.length >= Math.ceil(policy.conditions.length / 2)) {
      return {
        policy,
        confidence: matchedConditions.length / policy.conditions.length,
        matchedConditions,
      };
    }
  }

  return null;
}

function conditionMatches(
  condition: string,
  input: string,
  context: RuntimeContext
): boolean {
  // Special condition patterns
  if (condition.startsWith("user_is_")) {
    const profileField = condition.replace("user_is_", "");
    return !!context.userProfile?.tags?.includes(profileField);
  }

  if (condition.startsWith("channel_is_")) {
    const channel = condition.replace("channel_is_", "");
    return context.channelContext.channel === channel;
  }

  if (condition === "is_first_turn") {
    return context.turnNumber === 0;
  }

  if (condition === "has_contact_info") {
    return context.entities.some((e) => e.type === "email" || e.type === "phone");
  }

  return false;
}

function buildDecisionFromPolicy(
  match: PolicyMatch,
  availableTools: string[]
): BrainDecision {
  const { policy, confidence } = match;
  const actionLower = policy.action.toLowerCase();

  // Parse action string
  if (actionLower.startsWith("use_tool:")) {
    const toolId = actionLower.replace("use_tool:", "").trim();
    if (availableTools.includes(toolId)) {
      return {
        action: "use_tool",
        confidence,
        reasoning: `Policy "${policy.name}" triggered: ${policy.description ?? ""}`,
        tool: toolId,
        triggeredPolicy: policy.name,
      };
    }
  }

  if (actionLower === "escalate") {
    return {
      action: "escalate",
      confidence,
      reasoning: `Policy "${policy.name}" triggered escalation.`,
      triggeredPolicy: policy.name,
      escalation: {
        reason: policy.description ?? policy.name,
        target: "human",
        urgency: "medium",
      },
    };
  }

  if (actionLower === "handoff") {
    return {
      action: "handoff",
      confidence,
      reasoning: `Policy "${policy.name}" triggered handoff.`,
      triggeredPolicy: policy.name,
    };
  }

  // Default: respond
  return {
    action: "respond",
    confidence,
    reasoning: `Policy "${policy.name}" matched.`,
    triggeredPolicy: policy.name,
    responseApproach: "direct",
  };
}

// ============================================================================
// Intent Detection
// ============================================================================

function detectIntent(
  userInput: string,
  context: RuntimeContext,
  flowState: FlowState
): string {
  const inputLower = userInput.toLowerCase();

  // Greeting intents
  if (
    context.turnNumber === 0 ||
    /^(hi|hello|hey|good\s+(morning|afternoon|evening))/.test(inputLower)
  ) {
    return "greeting";
  }

  // Booking/scheduling intents
  if (
    inputLower.includes("book") ||
    inputLower.includes("schedule") ||
    inputLower.includes("appointment") ||
    inputLower.includes("available")
  ) {
    return "book_appointment";
  }

  // Pricing intents
  if (
    inputLower.includes("price") ||
    inputLower.includes("cost") ||
    inputLower.includes("how much") ||
    inputLower.includes("quote")
  ) {
    return "pricing_inquiry";
  }

  // Information intents
  if (
    inputLower.includes("what is") ||
    inputLower.includes("how does") ||
    inputLower.includes("can you explain") ||
    inputLower.includes("tell me about")
  ) {
    return "information_request";
  }

  // Contact/communication intents
  if (
    inputLower.includes("call me") ||
    inputLower.includes("email me") ||
    inputLower.includes("text me") ||
    inputLower.includes("contact")
  ) {
    return "contact_request";
  }

  // Goodbye intents
  if (
    inputLower.includes("bye") ||
    inputLower.includes("goodbye") ||
    inputLower.includes("thanks") ||
    inputLower.includes("that's all")
  ) {
    return "goodbye";
  }

  // Help intents
  if (inputLower.includes("help") || inputLower.includes("assist")) {
    return "help_request";
  }

  // Based on flow stage
  if (flowState.currentNode === "qualify") {
    return "qualification_response";
  }

  if (flowState.currentNode === "intake") {
    return "intake_response";
  }

  return "general";
}

// ============================================================================
// Tool Decision
// ============================================================================

interface ToolDecision {
  shouldUse: boolean;
  tool?: string;
  confidence: number;
  reasoning: string;
}

function shouldUseTool(
  userInput: string,
  intent: string,
  availableTools: string[],
  flowState: FlowState
): ToolDecision {
  const inputLower = userInput.toLowerCase();

  // Booking intent + calendar tool available
  if (intent === "book_appointment" && availableTools.includes("calendar.book")) {
    return {
      shouldUse: true,
      tool: "calendar.book",
      confidence: 0.85,
      reasoning: "User wants to book appointment and calendar tool is available.",
    };
  }

  // Contact request + CRM tool
  if (intent === "contact_request" && availableTools.includes("crm.upsert_lead")) {
    return {
      shouldUse: true,
      tool: "crm.upsert_lead",
      confidence: 0.8,
      reasoning: "User provided contact info, should save to CRM.",
    };
  }

  // Check if user provided contact info
  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(userInput);
  const hasPhone = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(userInput);

  if ((hasEmail || hasPhone) && availableTools.includes("crm.upsert_lead")) {
    return {
      shouldUse: true,
      tool: "crm.upsert_lead",
      confidence: 0.75,
      reasoning: "Contact information detected, saving to CRM.",
    };
  }

  // SMS/notification based on explicit request
  if (
    inputLower.includes("text me") &&
    availableTools.includes("sms.send")
  ) {
    return {
      shouldUse: true,
      tool: "sms.send",
      confidence: 0.8,
      reasoning: "User requested text message.",
    };
  }

  // Knowledge search for information requests
  if (intent === "information_request" && availableTools.includes("kb.search")) {
    return {
      shouldUse: true,
      tool: "kb.search",
      confidence: 0.7,
      reasoning: "User asking for information, searching knowledge base.",
    };
  }

  return {
    shouldUse: false,
    confidence: 0,
    reasoning: "No tool needed for this turn.",
  };
}

// ============================================================================
// Clarification Detection
// ============================================================================

function needsClarification(
  userInput: string,
  context: RuntimeContext,
  brainConfig: BrainConfig
): boolean {
  // Very short input (less than 2 words)
  const wordCount = userInput.trim().split(/\s+/).length;
  if (wordCount < 2 && context.turnNumber > 0) {
    return true;
  }

  // Single word that's ambiguous
  if (wordCount === 1) {
    const ambiguous = ["yes", "no", "maybe", "ok", "sure", "what", "why", "how"];
    if (ambiguous.includes(userInput.toLowerCase())) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// Conversation End Detection
// ============================================================================

function shouldEndConversation(
  userInput: string,
  flowState: FlowState,
  intent: string
): boolean {
  // At exit node
  if (flowState.isExit) {
    return true;
  }

  // Goodbye intent
  if (intent === "goodbye") {
    return true;
  }

  // Explicit end phrases
  const endPhrases = [
    "no more questions",
    "that's all i needed",
    "thanks, bye",
    "talk later",
    "have a good day",
  ];

  const inputLower = userInput.toLowerCase();
  return endPhrases.some((phrase) => inputLower.includes(phrase));
}

// ============================================================================
// Response Approach
// ============================================================================

function determineResponseApproach(
  reasoningStrategy: BrainConfig["reasoning_strategy"],
  intent: string,
  context: RuntimeContext
): BrainDecision["responseApproach"] {
  // First turn should be welcoming
  if (context.turnNumber === 0) {
    return "empathetic";
  }

  // Based on intent
  switch (intent) {
    case "pricing_inquiry":
    case "information_request":
      return "informative";
    case "book_appointment":
    case "contact_request":
      return "direct";
    case "help_request":
      return "empathetic";
    default:
      // Use reasoning strategy preference
      // Valid approaches: "chain_of_thought" | "direct" | "deliberative"
      if (reasoningStrategy?.approach === "chain_of_thought" ||
          reasoningStrategy?.approach === "deliberative") {
        return "informative";
      }
      return "direct";
  }
}
