/**
 * Wizard UI Utilities
 *
 * Focus handling, snapshot hooks, and step routing for the wizard.
 */

// Focus utilities for deep-linking
export {
  findElementByFocusPath,
  scrollToFocusPath,
  applyFocusPathAfterPaint,
  getFocusPathFromUrl,
  setFocusPathInUrl,
} from "./focus";

// React hooks for wizard state
export { useWizardSnapshot, useStepStatus } from "./useWizardSnapshot";

// Step router (re-export from parent for convenience)
export {
  decideNextWizardStep,
  getStepsWithStatus,
  getStepConfidence,
  getGapsForStep,
  WIZARD_STEPS,
  type WizardStepId,
  type StepRouteDecision,
  type StepMetadata,
} from "./stepRouter";
