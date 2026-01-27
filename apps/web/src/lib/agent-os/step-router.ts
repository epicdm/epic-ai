/**
 * Wizard Step Router
 *
 * Pure function that determines the next wizard step based on:
 * - gaps[] (prioritized by severity)
 * - confidence scores
 * - deployment state
 *
 * This makes the wizard "drive itself" - the UI becomes a renderer
 * of whatever the step router decides.
 */

import type { GapItem, ConfidenceMap } from "@epic-ai/shared";

// ============================================================================
// Types
// ============================================================================

export type WizardStepId =
  | "company"
  | "template"
  | "tools"
  | "flow"
  | "personality"
  | "knowledge"
  | "governance"
  | "economics"
  | "review";

export interface StepRouteDecision {
  /** The step the user should navigate to */
  nextStepId: WizardStepId;
  /** Human-readable reason (from gap.impact or default) */
  reason: string;
  /** Primary action button label */
  cta: string;
  /** Optional field path for deep-linking to specific field/tab */
  focusPath?: string;
  /** Count of remaining gaps */
  remainingGaps: number;
  /** Count of high-severity gaps */
  highSeverityCount: number;
  /** Overall completion percentage (0-100) */
  completionPercent: number;
}

export interface StepMetadata {
  id: WizardStepId;
  label: string;
  description: string;
  modules: string[]; // field_path prefixes this step handles
}

// ============================================================================
// Step Configuration
// ============================================================================

export const WIZARD_STEPS: StepMetadata[] = [
  {
    id: "company",
    label: "Company Discovery",
    description: "Business details, hours, pricing, service areas",
    modules: [
      "company",
      "brand_voice",
      "hours",
      "pricing",
      "service_area",
      "contact",
      "enrich",
      "missing_hours",
      "missing_pricing",
      "missing_service_area",
    ],
  },
  {
    id: "template",
    label: "Template Selection",
    description: "Choose an agent template that fits your use case",
    modules: ["template", "templatekey", "selected_template", "role_card"],
  },
  {
    id: "tools",
    label: "Tools & Integrations",
    description: "Connect calendars, CRMs, and other tools",
    modules: ["tools", "enabled_tools", "no_tools"],
  },
  {
    id: "flow",
    label: "Conversation Flow",
    description: "How the agent handles conversations",
    modules: ["flows", "brain", "decision_policies", "reasoning"],
  },
  {
    id: "personality",
    label: "Personality",
    description: "Voice, tone, and communication style",
    modules: ["personality", "voice", "tone", "style"],
  },
  {
    id: "knowledge",
    label: "Knowledge Base",
    description: "FAQs, quick answers, and domain knowledge",
    modules: ["knowledge", "quick_answers", "no_knowledge", "faq"],
  },
  {
    id: "governance",
    label: "Governance & Safety",
    description: "Escalation rules, boundaries, and compliance",
    modules: ["governance", "escalation", "no_escalation", "boundaries"],
  },
  {
    id: "economics",
    label: "Economics & Pricing",
    description: "Cost controls and usage limits",
    modules: ["economics", "budget", "limits"],
  },
  {
    id: "review",
    label: "Review & Launch",
    description: "Final review before publishing",
    modules: [],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function severityRank(severity: GapItem["severity"]): number {
  switch (severity) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

/**
 * Map a gap's field_path to the appropriate wizard step
 */
function stepForFieldPath(fieldPath: string): WizardStepId {
  const p = fieldPath.toLowerCase();

  // Check each step's modules for a match
  for (const step of WIZARD_STEPS) {
    if (step.id === "review") continue; // Skip review, it's the fallback

    for (const module of step.modules) {
      if (p.startsWith(module) || p.includes(module)) {
        return step.id;
      }
    }
  }

  // Special case: missing_config gaps map to their module name
  if (p.includes("missing_config")) {
    // The field_path for missing_config is the module name itself
    const moduleName = p.replace("missing_config", "").replace(/[._]/g, "");
    for (const step of WIZARD_STEPS) {
      if (step.modules.some((m) => moduleName.includes(m) || m.includes(moduleName))) {
        return step.id;
      }
    }
  }

  // Default to review
  return "review";
}

/**
 * Calculate completion percentage from confidence scores
 */
function calculateCompletionPercent(confidence?: ConfidenceMap): number {
  if (!confidence || Object.keys(confidence).length === 0) {
    return 0;
  }

  const values = Object.values(confidence).filter((v) => typeof v === "number");
  if (values.length === 0) return 0;

  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / values.length) * 100);
}

/**
 * Get step-level confidence from module confidence map
 */
export function getStepConfidence(
  stepId: WizardStepId,
  confidence?: ConfidenceMap
): number {
  if (!confidence || stepId === "review") return 1;

  const step = WIZARD_STEPS.find((s) => s.id === stepId);
  if (!step) return 0;

  // Find confidence values for any matching module
  const relevantConfidences: number[] = [];
  for (const [key, value] of Object.entries(confidence)) {
    if (typeof value !== "number") continue;
    const keyLower = key.toLowerCase();
    if (step.modules.some((m) => keyLower.startsWith(m) || keyLower.includes(m))) {
      relevantConfidences.push(value);
    }
  }

  if (relevantConfidences.length === 0) return 0;
  return relevantConfidences.reduce((a, b) => a + b, 0) / relevantConfidences.length;
}

/**
 * Get all gaps for a specific step
 */
export function getGapsForStep(stepId: WizardStepId, gaps: GapItem[]): GapItem[] {
  return gaps.filter((gap) => stepForFieldPath(gap.field_path) === stepId);
}

// ============================================================================
// Main Router Function
// ============================================================================

/**
 * Decide which wizard step the user should navigate to next
 *
 * Priority:
 * 1. If assembling → stay on review (progress screen)
 * 2. If no gaps → review (ready to launch)
 * 3. Otherwise → highest severity gap's step
 */
export function decideNextWizardStep(input: {
  gaps: GapItem[];
  confidence?: ConfidenceMap;
  deploymentState?: string;
}): StepRouteDecision {
  const gaps = Array.isArray(input.gaps) ? input.gaps : [];
  const highSeverityCount = gaps.filter((g) => g.severity === "high").length;
  const completionPercent = calculateCompletionPercent(input.confidence);

  // If we're assembling, keep user on review (progress screen)
  if (input.deploymentState === "assembling") {
    return {
      nextStepId: "review",
      reason: "Assembly in progress. Review will update as modules complete.",
      cta: "View progress",
      remainingGaps: gaps.length,
      highSeverityCount,
      completionPercent,
    };
  }

  // If published or archived, show review
  if (input.deploymentState === "published" || input.deploymentState === "archived") {
    return {
      nextStepId: "review",
      reason:
        input.deploymentState === "published"
          ? "Agent is live. Create a draft to make changes."
          : "Agent is archived.",
      cta: input.deploymentState === "published" ? "View agent" : "Restore agent",
      remainingGaps: gaps.length,
      highSeverityCount,
      completionPercent,
    };
  }

  // No gaps → ready for review
  if (gaps.length === 0) {
    return {
      nextStepId: "review",
      reason: "No gaps detected. You're ready to test and launch.",
      cta: "Review & launch",
      remainingGaps: 0,
      highSeverityCount: 0,
      completionPercent,
    };
  }

  // Sort gaps: highest severity first, then shortest field_path (module-level before nested)
  const sorted = [...gaps].sort((a, b) => {
    const severityDiff = severityRank(b.severity) - severityRank(a.severity);
    if (severityDiff !== 0) return severityDiff;
    return (a.field_path?.length ?? 999) - (b.field_path?.length ?? 999);
  });

  const topGap = sorted[0];
  const nextStepId = stepForFieldPath(topGap.field_path);

  return {
    nextStepId,
    reason: topGap.impact,
    cta: topGap.severity === "high" ? "Fix required" : "Continue setup",
    focusPath: topGap.field_path,
    remainingGaps: gaps.length,
    highSeverityCount,
    completionPercent,
  };
}

/**
 * Get ordered list of steps with their status
 */
export function getStepsWithStatus(input: {
  gaps: GapItem[];
  confidence?: ConfidenceMap;
}): Array<StepMetadata & { status: "complete" | "incomplete" | "error"; gapCount: number }> {
  const gaps = Array.isArray(input.gaps) ? input.gaps : [];

  return WIZARD_STEPS.map((step) => {
    const stepGaps = getGapsForStep(step.id, gaps);
    const hasHighSeverity = stepGaps.some((g) => g.severity === "high");
    const confidence = getStepConfidence(step.id, input.confidence);

    let status: "complete" | "incomplete" | "error";
    if (hasHighSeverity) {
      status = "error";
    } else if (stepGaps.length === 0 && confidence >= 0.7) {
      status = "complete";
    } else {
      status = "incomplete";
    }

    return {
      ...step,
      status,
      gapCount: stepGaps.length,
    };
  });
}
