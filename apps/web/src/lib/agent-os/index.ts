/**
 * Agent OS Client Library
 *
 * Utilities for the wizard UI to interact with Agent OS.
 */

// Step router logic
export {
  decideNextWizardStep,
  getStepsWithStatus,
  getStepConfidence,
  getGapsForStep,
  WIZARD_STEPS,
  type WizardStepId,
  type StepRouteDecision,
  type StepMetadata,
} from "./step-router";

// Re-export wizard utilities for convenience
export * from "./wizard";
