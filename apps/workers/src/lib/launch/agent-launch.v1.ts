/**
 * Agent Launch Eligibility Engine v1
 *
 * Evaluates agent readiness for deployment and enforces launch rules:
 * - TESTING: requires >=70 readiness score, no high-severity gaps
 * - PUBLISHED: requires >=85 readiness score, no high-severity gaps
 * - VOICE agents require a DID mapping before launch
 * - PUBLISHED/ARCHIVED agents are immutable
 *
 * @module lib/launch/agent-launch.v1
 */

import { z } from "zod";

// ============================================================================
// Types
// ============================================================================

/**
 * Launch target states
 * - TESTING: callable, internal QA mode
 * - PUBLISHED: production, immutable after transition
 */
export type LaunchTarget = "TESTING" | "PUBLISHED";

/**
 * Readiness states for agent deployment
 */
export type ReadinessState = "not_ready" | "needs_review" | "ready";

/**
 * Launch blocker codes with specific remediation paths
 */
export type LaunchBlockerCode =
  | "MISSING_REQUIRED_MODULE"
  | "LOW_CONFIDENCE"
  | "BLOCKING_GAPS"
  | "MISSING_DID"
  | "AGENT_IMMUTABLE"
  | "AGENT_NOT_FOUND";

/**
 * A blocker preventing agent launch
 */
export interface LaunchBlocker {
  code: LaunchBlockerCode;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Gap item from wizard snapshot
 */
export interface GapItem {
  gap_type: string;
  field_path: string;
  severity: "low" | "medium" | "high";
  impact?: string;
  recommended_fix?: string;
}

/**
 * Readiness evaluation result
 */
export interface ReadinessEvaluation {
  readiness_state: ReadinessState;
  readiness_score: number;
  missingRequiredModules: string[];
  blockingGaps: GapItem[];
}

/**
 * Launch eligibility result
 */
export type LaunchEligibilityResult =
  | { ok: true; blockers: never[]; readiness: ReadinessEvaluation }
  | { ok: false; blockers: LaunchBlocker[]; readiness?: ReadinessEvaluation };

// ============================================================================
// Constants
// ============================================================================

/**
 * Required modules that must have >=0.6 confidence for launch
 */
const REQUIRED_MODULES = ["role_card", "brain", "personality", "tools", "flow"] as const;

/**
 * Minimum readiness scores by target
 */
const MIN_READINESS_SCORES: Record<LaunchTarget, number> = {
  TESTING: 70,
  PUBLISHED: 85,
};

// ============================================================================
// Readiness Evaluation
// ============================================================================

/**
 * Evaluate agent readiness based on confidence scores and gaps.
 *
 * Rules:
 * - Required modules must have >=0.6 confidence
 * - No high-severity gaps allowed
 * - Overall score is average of required module confidences
 *
 * @param snapshot - Agent snapshot with confidence and gaps
 * @returns Readiness evaluation result
 */
export function evaluateAgentReadinessV1(snapshot: {
  data?: unknown;
  confidence?: Record<string, number>;
  gaps?: GapItem[];
}): ReadinessEvaluation {
  const gaps = snapshot.gaps ?? [];
  const conf = snapshot.confidence ?? {};

  // Find modules below minimum confidence threshold
  const missingRequired = REQUIRED_MODULES.filter((m) => (conf[m] ?? 0) < 0.6);

  // Find blocking (high-severity) gaps
  const blockingGaps = gaps.filter((g) => g.severity === "high");

  // Calculate overall readiness score (average of required module confidences)
  const moduleScore =
    REQUIRED_MODULES.reduce((sum, m) => sum + (conf[m] ?? 0), 0) / REQUIRED_MODULES.length;

  const readiness_score = Math.round(moduleScore * 100);

  // Determine readiness state
  let readiness_state: ReadinessState = "not_ready";

  if (blockingGaps.length > 0 || missingRequired.length > 0) {
    readiness_state = "not_ready";
  } else if (moduleScore >= 0.8) {
    readiness_state = "ready";
  } else {
    readiness_state = "needs_review";
  }

  return {
    readiness_state,
    readiness_score,
    missingRequiredModules: missingRequired,
    blockingGaps,
  };
}

// ============================================================================
// Launch Eligibility
// ============================================================================

/**
 * Check if an agent can be launched to a target state.
 *
 * Enforces rules:
 * 1. PUBLISHED/ARCHIVED agents cannot be modified (immutable)
 * 2. No high-severity gaps allowed
 * 3. Required modules must have sufficient confidence
 * 4. Readiness score must meet target minimum (70 for TESTING, 85 for PUBLISHED)
 * 5. VOICE agents require an active DID mapping
 *
 * @param args - Launch check arguments
 * @returns Eligibility result with blockers if not eligible
 */
export function canLaunchAgentV1(args: {
  target: LaunchTarget;
  snapshot: { confidence?: Record<string, number>; gaps?: GapItem[] };
  hasVoiceChannel: boolean;
  didMapped: boolean;
  agentStatus: string;
}): LaunchEligibilityResult {
  const blockers: LaunchBlocker[] = [];

  // Rule 1: PUBLISHED/ARCHIVED agents are immutable
  if (args.agentStatus === "PUBLISHED" || args.agentStatus === "ARCHIVED") {
    blockers.push({
      code: "AGENT_IMMUTABLE",
      message: `Agent is ${args.agentStatus} and cannot be launched/modified.`,
    });
    return { ok: false, blockers };
  }

  // Evaluate readiness
  const readiness = evaluateAgentReadinessV1(args.snapshot);

  // Rule 2: No blocking gaps
  if (readiness.blockingGaps.length > 0) {
    blockers.push({
      code: "BLOCKING_GAPS",
      message: "Agent has blocking gaps (severity=high) and cannot be launched.",
      details: {
        blockingGaps: readiness.blockingGaps.map((g) => ({
          field_path: g.field_path,
          impact: g.impact,
        })),
      },
    });
  }

  // Rule 3: Required modules must have sufficient confidence
  if (readiness.missingRequiredModules.length > 0) {
    blockers.push({
      code: "MISSING_REQUIRED_MODULE",
      message: "Agent is missing confidence in required modules.",
      details: { missingRequiredModules: readiness.missingRequiredModules },
    });
  }

  // Rule 4: Readiness score must meet target minimum
  const minScore = MIN_READINESS_SCORES[args.target];
  if (readiness.readiness_score < minScore) {
    blockers.push({
      code: "LOW_CONFIDENCE",
      message: `Readiness score too low for ${args.target} launch (min ${minScore}, current ${readiness.readiness_score}).`,
      details: { readiness_score: readiness.readiness_score, required: minScore },
    });
  }

  // Rule 5: DID required if VOICE channel
  if (args.hasVoiceChannel && !args.didMapped) {
    blockers.push({
      code: "MISSING_DID",
      message: "VOICE agents require a DID mapping before launch.",
    });
  }

  if (blockers.length > 0) {
    return { ok: false, blockers, readiness };
  }

  return { ok: true, blockers: [] as never[], readiness };
}

// ============================================================================
// Request Schema
// ============================================================================

/**
 * Launch request body schema
 */
export const LaunchRequestSchema = z
  .object({
    /** Target state: TESTING or PUBLISHED */
    target: z.enum(["TESTING", "PUBLISHED"]).default("TESTING"),
    /** Force launch, bypassing low-confidence blockers (NOT blocking gaps or missing DID) */
    force: z.boolean().default(false),
  })
  .strict();

export type LaunchRequest = z.infer<typeof LaunchRequestSchema>;

// ============================================================================
// Blocker Classification
// ============================================================================

/**
 * Blockers that can be bypassed with force=true
 * (Only low-confidence, not structural issues)
 */
const FORCE_BYPASSABLE_CODES: Set<LaunchBlockerCode> = new Set([
  "LOW_CONFIDENCE",
  "MISSING_REQUIRED_MODULE",
]);

/**
 * Check if a blocker can be bypassed with force=true
 */
export function isForceBypassable(blocker: LaunchBlocker): boolean {
  return FORCE_BYPASSABLE_CODES.has(blocker.code);
}

/**
 * Filter blockers to only those that cannot be bypassed
 */
export function getNonBypassableBlockers(blockers: LaunchBlocker[]): LaunchBlocker[] {
  return blockers.filter((b) => !isForceBypassable(b));
}
