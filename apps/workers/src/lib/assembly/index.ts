/**
 * Agent Assembly Module
 *
 * End-to-end assembly orchestration for DRAFT agents.
 *
 * @module lib/assembly
 */

export {
  assembleAgentV1,
  // Types
  type AssemblyPhase,
  type DeploymentState,
  type AssemblyEvidence,
  type AssemblyAuditEntry,
  type WizardSnapshot,
  type AssemblyRequest,
  type AssemblyContext,
  type AssemblyResult,
  type CompanyProfile,
  // Errors
  AssemblyError,
  AgentImmutableError,
} from './assemble-agent.v1';
