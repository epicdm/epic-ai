/**
 * Learning Layer
 *
 * Records learning signals from agent interactions
 * to enable continuous improvement.
 *
 * @module runtime/learning-layer
 */

import { prisma } from "@epic-ai/database";
import type {
  LearningConfig,
  RuntimeContext,
  BrainDecision,
  ToolExecutionResult,
  FlowState,
  LearningEvent,
} from "./types";

// ============================================================================
// Types
// ============================================================================

export interface RecordLearningParams {
  learningConfig: LearningConfig;
  agentId: string;
  sessionId: string;
  decision: BrainDecision;
  toolResult: ToolExecutionResult | null;
  flowState: FlowState;
  userInput: string;
  agentResponse: string;
  responseTimeMs: number;
}

/**
 * Internal signal type for categorizing events.
 * Maps to LearningEvent.type when saved:
 * - intent_detection, flow_transition, response_generated -> conversation_outcome
 * - tool_execution -> tool_usage
 * - escalation -> escalation
 * - conversation_end -> conversation_outcome
 */
export type InternalSignalType =
  | "intent_detection"
  | "tool_execution"
  | "flow_transition"
  | "escalation"
  | "conversation_end"
  | "response_generated";

export interface LearningSignal {
  type: InternalSignalType;
  intent?: string;
  action: string;
  outcome: "success" | "failure" | "partial" | "unknown";
  confidence: number;
  metadata: Record<string, unknown>;
}

/**
 * Map internal signal types to valid LearningEvent types.
 */
function mapToEventType(signalType: InternalSignalType): LearningEvent["type"] {
  switch (signalType) {
    case "tool_execution":
      return "tool_usage";
    case "escalation":
      return "escalation";
    case "intent_detection":
    case "flow_transition":
    case "conversation_end":
    case "response_generated":
    default:
      return "conversation_outcome";
  }
}

// ============================================================================
// Learning Recording
// ============================================================================

/**
 * Record learning signals from the current turn.
 */
export async function recordLearning(params: RecordLearningParams): Promise<void> {
  const {
    learningConfig,
    agentId,
    sessionId,
    decision,
    toolResult,
    flowState,
    userInput,
    agentResponse,
    responseTimeMs,
  } = params;

  if (!learningConfig.learning_enabled) {
    return;
  }

  const signals = extractLearningSignals({
    decision,
    toolResult,
    flowState,
    userInput,
    agentResponse,
  });

  // Save learning events to database
  const now = new Date();

  for (const signal of signals) {
    await saveLearningEvent({
      agentId,
      sessionId,
      signal,
      responseTimeMs,
      timestamp: now,
    });
  }

  // Check for patterns that should trigger improvements
  // Uses outcome_learning from feedback_loops as indicator for auto-improvement
  if (learningConfig.feedback_loops?.outcome_learning) {
    await checkForImprovementOpportunities(agentId, learningConfig);
  }
}

// ============================================================================
// Signal Extraction
// ============================================================================

interface ExtractSignalsParams {
  decision: BrainDecision;
  toolResult: ToolExecutionResult | null;
  flowState: FlowState;
  userInput: string;
  agentResponse: string;
}

function extractLearningSignals(params: ExtractSignalsParams): LearningSignal[] {
  const { decision, toolResult, flowState, userInput, agentResponse } = params;
  const signals: LearningSignal[] = [];

  // 1. Intent detection signal
  if (decision.detectedIntent) {
    signals.push({
      type: "intent_detection",
      intent: decision.detectedIntent,
      action: decision.action,
      outcome: decision.confidence > 0.8 ? "success" : "partial",
      confidence: decision.confidence,
      metadata: {
        userInput: userInput.slice(0, 200),
        triggeredPolicy: decision.triggeredPolicy,
      },
    });
  }

  // 2. Tool execution signal
  if (toolResult) {
    signals.push({
      type: "tool_execution",
      action: `tool:${toolResult.toolId}`,
      outcome: toolResult.success ? "success" : "failure",
      confidence: decision.confidence,
      metadata: {
        toolId: toolResult.toolId,
        durationMs: toolResult.durationMs,
        error: toolResult.error,
        requiredConfirmation: toolResult.requiredConfirmation,
      },
    });
  }

  // 3. Flow transition signal
  if (flowState.previousNode && flowState.previousNode !== flowState.currentNode) {
    signals.push({
      type: "flow_transition",
      action: `flow:${flowState.previousNode}->${flowState.currentNode}`,
      outcome: "success",
      confidence: 1.0,
      metadata: {
        fromNode: flowState.previousNode,
        toNode: flowState.currentNode,
        turnsInPreviousNode: flowState.turnsInNode,
        transitionIntent: flowState.transitionIntent,
      },
    });
  }

  // 4. Escalation signal
  if (decision.action === "escalate" && decision.escalation) {
    signals.push({
      type: "escalation",
      action: "escalate",
      outcome: "success", // Escalation itself is a valid outcome
      confidence: decision.confidence,
      metadata: {
        reason: decision.escalation.reason,
        target: decision.escalation.target,
        urgency: decision.escalation.urgency,
      },
    });
  }

  // 5. Conversation end signal
  if (decision.action === "end") {
    signals.push({
      type: "conversation_end",
      action: "end",
      outcome: flowState.isExit ? "success" : "partial",
      confidence: decision.confidence,
      metadata: {
        atExitNode: flowState.isExit,
        fieldsCollected: Object.keys(flowState.collectedFields),
      },
    });
  }

  // 6. Response quality signal (heuristic)
  const responseQuality = estimateResponseQuality(userInput, agentResponse);
  signals.push({
    type: "response_generated",
    action: decision.action,
    outcome: responseQuality.outcome,
    confidence: responseQuality.score,
    metadata: {
      responseLength: agentResponse.length,
      approach: decision.responseApproach,
      hasQuestion: agentResponse.includes("?"),
    },
  });

  return signals;
}

// ============================================================================
// Response Quality Estimation
// ============================================================================

interface QualityEstimate {
  score: number;
  outcome: "success" | "partial" | "failure";
}

function estimateResponseQuality(
  userInput: string,
  agentResponse: string
): QualityEstimate {
  // Basic heuristics for response quality
  let score = 0.7; // Base score

  // Length check
  if (agentResponse.length < 10) {
    score -= 0.3; // Too short
  } else if (agentResponse.length > 2000) {
    score -= 0.1; // Maybe too long
  }

  // Engagement check (ends with question for non-goodbye)
  if (agentResponse.includes("?") && !userInput.toLowerCase().includes("bye")) {
    score += 0.1;
  }

  // Acknowledgment check
  const acknowledgments = ["understand", "got it", "i see", "thank you", "thanks for"];
  if (acknowledgments.some((a) => agentResponse.toLowerCase().includes(a))) {
    score += 0.1;
  }

  // Error indicators
  const errorIndicators = ["i'm sorry, i cannot", "i don't know", "i'm not sure"];
  if (errorIndicators.some((e) => agentResponse.toLowerCase().includes(e))) {
    score -= 0.1;
  }

  // Cap score
  score = Math.max(0, Math.min(1, score));

  return {
    score,
    outcome: score >= 0.7 ? "success" : score >= 0.4 ? "partial" : "failure",
  };
}

// ============================================================================
// Event Storage
// ============================================================================

interface SaveEventParams {
  agentId: string;
  sessionId: string;
  signal: LearningSignal;
  responseTimeMs: number;
  timestamp: Date;
}

async function saveLearningEvent(params: SaveEventParams): Promise<void> {
  const { agentId, sessionId, signal, responseTimeMs, timestamp } = params;

  // Map outcome to signal (positive/negative/neutral)
  const signalValue = signal.outcome === "success" ? "positive"
    : signal.outcome === "failure" ? "negative"
    : "neutral";

  // Map internal signal type to valid LearningEvent type
  const eventType = mapToEventType(signal.type);

  await prisma.agentLearningEvent.create({
    data: {
      agentId,
      sessionId,
      eventType,
      signal: signalValue,
      category: signal.intent ?? undefined,
      outcome: signal.outcome,
      learningValue: signal.confidence,
      data: {
        action: signal.action,
        intent: signal.intent,
        confidence: signal.confidence,
        responseTimeMs,
        originalType: signal.type, // Preserve original type for analysis
        ...signal.metadata,
      },
      timestamp,
    },
  });
}

// ============================================================================
// Improvement Detection
// ============================================================================

async function checkForImprovementOpportunities(
  agentId: string,
  learningConfig: LearningConfig
): Promise<void> {
  // Use safe_boundaries.review_threshold for improvement threshold
  const threshold = learningConfig.safe_boundaries?.review_threshold ?? 0.7;
  // Hardcode lookback days (not in schema)
  const lookbackDays = 7;
  // Use feedback_loops.min_samples
  const minSamples = learningConfig.feedback_loops?.min_samples ?? 50;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

  // Get recent events
  const events = await prisma.agentLearningEvent.findMany({
    where: {
      agentId,
      createdAt: { gte: cutoffDate },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  if (events.length < minSamples) {
    return; // Not enough data
  }

  // Analyze patterns
  const patterns = analyzePatterns(events);

  // Record improvement suggestions
  for (const pattern of patterns) {
    if (pattern.successRate < threshold) {
      await recordImprovementSuggestion(agentId, pattern);
    }
  }
}

interface Pattern {
  category: string;
  identifier: string;
  successRate: number;
  sampleCount: number;
  suggestion: string;
}

interface LearningEventRecord {
  eventType: string;
  outcome: string | null;
  category: string | null;
  data: unknown;
  learningValue: number;
}

function getEventData(event: LearningEventRecord): {
  action?: string;
  intent?: string;
  confidence?: number;
} {
  if (typeof event.data === "object" && event.data !== null) {
    return event.data as { action?: string; intent?: string; confidence?: number };
  }
  return {};
}

function analyzePatterns(events: LearningEventRecord[]): Pattern[] {
  const patterns: Pattern[] = [];

  // Group by intent (from category or data)
  const intentGroups = new Map<string, LearningEventRecord[]>();
  for (const event of events) {
    const data = getEventData(event);
    const intent = event.category ?? data.intent;
    if (intent) {
      const list = intentGroups.get(intent) ?? [];
      list.push(event);
      intentGroups.set(intent, list);
    }
  }

  // Analyze intent success rates
  for (const [intent, intentEvents] of intentGroups) {
    const successCount = intentEvents.filter((e) => e.outcome === "success").length;
    const successRate = successCount / intentEvents.length;

    if (intentEvents.length >= 10) {
      patterns.push({
        category: "intent",
        identifier: intent,
        successRate,
        sampleCount: intentEvents.length,
        suggestion:
          successRate < 0.5
            ? `Consider adding training examples for intent "${intent}"`
            : successRate < 0.7
            ? `Review response quality for "${intent}" intent`
            : "",
      });
    }
  }

  // Analyze tool success rates
  const toolEventsFiltered = events.filter((e) => e.eventType === "tool_execution");
  const toolGroups = new Map<string, LearningEventRecord[]>();
  for (const event of toolEventsFiltered) {
    const data = getEventData(event);
    const action = data.action ?? "unknown";
    const list = toolGroups.get(action) ?? [];
    list.push(event);
    toolGroups.set(action, list);
  }

  for (const [tool, toolEventList] of toolGroups) {
    const successCount = toolEventList.filter((e) => e.outcome === "success").length;
    const successRate = successCount / toolEventList.length;

    if (toolEventList.length >= 5) {
      patterns.push({
        category: "tool",
        identifier: tool,
        successRate,
        sampleCount: toolEventList.length,
        suggestion:
          successRate < 0.5
            ? `Tool "${tool}" is failing frequently. Check configuration.`
            : "",
      });
    }
  }

  // Analyze escalation frequency
  const escalationEvents = events.filter((e) => e.eventType === "escalation");
  if (escalationEvents.length > events.length * 0.2) {
    patterns.push({
      category: "escalation",
      identifier: "high_rate",
      successRate: 1 - escalationEvents.length / events.length,
      sampleCount: escalationEvents.length,
      suggestion: "High escalation rate. Consider expanding agent capabilities.",
    });
  }

  return patterns.filter((p) => p.suggestion.length > 0);
}

async function recordImprovementSuggestion(
  agentId: string,
  pattern: Pattern
): Promise<void> {
  await prisma.agentImprovement.create({
    data: {
      agentId,
      improvementType: pattern.category,
      targetConfig: pattern.identifier,
      description: pattern.suggestion,
      confidence: pattern.successRate,
      newValue: {
        successRate: pattern.successRate,
        sampleCount: pattern.sampleCount,
      },
      status: "proposed",
    },
  });
}

// ============================================================================
// Feedback Integration
// ============================================================================

export interface RecordFeedbackParams {
  agentId: string;
  sessionId?: string;
  rating: number; // 1-5
  feedback?: string;
  feedbackType: "thumbs" | "rating" | "text";
}

/**
 * Record explicit user feedback.
 */
export async function recordFeedback(params: RecordFeedbackParams): Promise<void> {
  const { agentId, sessionId, rating, feedback, feedbackType } = params;

  // Map rating to sentiment
  const sentiment = rating >= 4 ? "positive" : rating <= 2 ? "negative" : "neutral";

  await prisma.agentFeedback.create({
    data: {
      agentId,
      sessionId,
      rating,
      sentiment,
      comment: feedback,
      source: feedbackType,
    },
  });

  // Note: We don't update learning events directly since the schema
  // doesn't have hasFeedback/feedbackRating fields. The feedback is
  // linked via sessionId for analysis.
}

// ============================================================================
// Analytics Queries
// ============================================================================

/**
 * Get learning analytics for an agent.
 */
export async function getLearningAnalytics(
  agentId: string,
  days: number = 30
): Promise<{
  totalEvents: number;
  successRate: number;
  topIntents: Array<{ intent: string; count: number; successRate: number }>;
  toolUsage: Array<{ tool: string; count: number; successRate: number }>;
  escalationRate: number;
  averageConfidence: number;
}> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const events = await prisma.agentLearningEvent.findMany({
    where: {
      agentId,
      createdAt: { gte: cutoffDate },
    },
  });

  const totalEvents = events.length;
  const successEvents = events.filter((e) => e.outcome === "success").length;
  const successRate = totalEvents > 0 ? successEvents / totalEvents : 0;

  // Calculate average confidence (from learningValue)
  const avgConfidence =
    events.length > 0
      ? events.reduce((sum, e) => sum + e.learningValue, 0) / events.length
      : 0;

  // Group by intent (from category or data.intent)
  const intentMap = new Map<string, { total: number; success: number }>();
  for (const event of events) {
    const data = getEventData(event as LearningEventRecord);
    const intent = event.category ?? data.intent;
    if (intent) {
      const current = intentMap.get(intent) ?? { total: 0, success: 0 };
      current.total++;
      if (event.outcome === "success") current.success++;
      intentMap.set(intent, current);
    }
  }

  const topIntents = [...intentMap.entries()]
    .map(([intent, stats]) => ({
      intent,
      count: stats.total,
      successRate: stats.success / stats.total,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Group by tool (from data.action)
  const toolMap = new Map<string, { total: number; success: number }>();
  for (const event of events.filter((e) => e.eventType === "tool_execution")) {
    const data = getEventData(event as LearningEventRecord);
    const action = data.action ?? "unknown";
    const current = toolMap.get(action) ?? { total: 0, success: 0 };
    current.total++;
    if (event.outcome === "success") current.success++;
    toolMap.set(action, current);
  }

  const toolUsage = [...toolMap.entries()]
    .map(([tool, stats]) => ({
      tool,
      count: stats.total,
      successRate: stats.success / stats.total,
    }))
    .sort((a, b) => b.count - a.count);

  // Escalation rate
  const escalationEvents = events.filter((e) => e.eventType === "escalation").length;
  const escalationRate = totalEvents > 0 ? escalationEvents / totalEvents : 0;

  return {
    totalEvents,
    successRate,
    topIntents,
    toolUsage,
    escalationRate,
    averageConfidence: avgConfidence,
  };
}
