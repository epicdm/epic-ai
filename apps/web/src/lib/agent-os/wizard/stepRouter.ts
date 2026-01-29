/**
 * Step Router Re-export
 *
 * Re-exports step router from parent directory for cleaner imports.
 * Import from "@/lib/agent-os/wizard/stepRouter" in UI components.
 */

export {
  decideNextWizardStep,
  getStepsWithStatus,
  getStepConfidence,
  getGapsForStep,
  WIZARD_STEPS,
  type WizardStepId,
  type StepRouteDecision,
  type StepMetadata,
} from "../step-router";
