/**
 * Agent OS Components
 *
 * Reusable components for the Agent OS wizard UI.
 */

export { FocusAnchor } from "./FocusAnchor";
export { WizardEntryClient, useWizardNavigation } from "./WizardEntryClient";
export { NextStepPanel } from "./NextStepPanel";

// Auto-fill loop (fast path: template -> tools -> flow)
export {
  AutoFillFastButton,
  AutoFillFastButtonCompact,
  type AutoFillFastButtonProps,
} from "./AutoFillFastButton";

export {
  useAutoFillLoop,
  type AutoFillLoopTrace,
  type AutoFillLoopResult,
  type AutoFillLoopResponse,
  type UseAutoFillLoopOptions,
} from "./hooks/useAutoFillLoop";

// Auto-fill single step (knowledge, brain, personality, etc.)
export {
  useAutoFillStep,
  type WizardStepKey,
  type AutoFillStepResult,
  type AutoFillStepResponse,
  type UseAutoFillStepOptions,
  type UseAutoFillStepReturn,
} from "./hooks/useAutoFillStep";

// Knowledge auto-fill button
export {
  KnowledgeAutoFillButton,
  KnowledgeAutoFillButtonCompact,
  type KnowledgeAutoFillButtonProps,
} from "./KnowledgeAutoFillButton";

// Answer-to-PATCH helper
export {
  answerToPatchV1,
  extractAnsweredFields,
  buildModulePatches,
  applyModulePatches,
  extractCompanyHints,
  inferModuleFromFieldPath,
  setByPath,
  MODULE_ENDPOINTS,
  type AgentOSModule,
  type PatchResult,
  type ApplyPatchesResult,
  type AnswerToPatchResult,
} from "./answer-to-patch.v1";
