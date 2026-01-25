/**
 * Next-step module exports
 */

export {
  buildNextStepFromAgentId,
  type NextStepData,
  type NextStepSuccessResult,
  type NextStepErrorResult,
  type BuildNextStepResult,
  type WizardStepKey,
  type ChannelType,
  type NextStepResult,
} from './next-step.v1';

export {
  resolveNextStepV1,
  type Gap,
  type Warning,
  type ConfidenceMap,
  type WizardSnapshot,
  type ResolveArgs,
} from './resolve-next-step.v1';

export {
  buildNextStepExplainFromAgentId,
  type NextStepExplainSuccessResult,
  type NextStepExplainErrorResult,
  type BuildNextStepExplainResult,
} from './next-step-explain.v1';

export type { WizardStepKey as WizardStep } from './types';
