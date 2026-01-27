/**
 * Agent OS Engines
 *
 * Pure function engines that generate configuration for each assembly phase.
 * All engines follow the pattern: async runXEngine(input) -> EngineResult<ConfigShape>
 *
 * Orchestrator handles persistence - engines only compute.
 */

// Knowledge Seed Engine
export {
  runKnowledgeSeedEngine,
  generateKnowledgeSeed,
  type KnowledgeSeedInput,
  type KnowledgeSeedResult,
  type KnowledgeConfig,
  type KnowledgeGap,
  type KnowledgeEvidence,
} from './knowledge-seed';

// Governance Defaults Engine
export {
  runGovernanceDefaultsEngine,
  getDefaultGovernanceConfig,
  type GovernanceInput,
  type GovernanceResult,
  type GovernanceConfig,
  type GovernanceGap,
  type GovernanceEvidence,
  type ComplianceMode,
  type PIIHandling,
} from './governance-defaults';

// Economics Defaults Engine
export {
  runEconomicsDefaultsEngine,
  getDefaultEconomicsConfig,
  type EconomicsInput,
  type EconomicsResult,
  type EconomicsConfig,
  type EconomicsGap,
  type EconomicsEvidence,
  type ChannelType,
  type PriorityMode,
  type CompanySize,
} from './economics-defaults';

// Memory Defaults Engine
export {
  runMemoryDefaultsEngine,
  getDefaultMemoryConfig,
  type MemoryInput,
  type MemoryResult,
  type MemoryConfig,
  type MemoryGap,
  type MemoryEvidence,
  type MemoryScope,
  type RetentionPeriod,
} from './memory-defaults';

// Learning Defaults Engine
export {
  runLearningDefaultsEngine,
  getDefaultLearningConfig,
  type LearningInput,
  type LearningResult,
  type LearningConfig,
  type LearningGap,
  type LearningEvidence,
  type LearningMode,
  type FeedbackType,
  type ImprovementScope,
} from './learning-defaults';
