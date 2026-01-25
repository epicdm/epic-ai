/**
 * Worker Library Exports
 *
 * Central export point for worker utility modules.
 *
 * @module lib
 */

// Redis connection
export { redis, createRedisConnection, closeRedisConnection } from './redis';

// Logging utilities
export {
  logJob,
  log,
  logJobStart,
  logJobComplete,
  logJobFailed,
  logJobRetry,
  logJobProgress,
  logger,
  type JobLog,
  type GenericLog,
  type LogLevel,
  type JobEvent,
} from './logger';

// Error classes
export {
  JobError,
  JobProcessingError,
  TooManyJobsError,
  PayloadValidationError,
  RateLimitError,
  TokenExpiredError,
  ExternalServiceError,
  UnknownJobTypeError,
  isJobError,
  isRetryableError,
} from './errors';

// Agent OS helpers
export {
  ensureDraftAgent,
  updateDraftAgentConfig,
  type EnsureDraftAgentInput,
  type DraftAgentResult,
} from './agent-helpers';

// Wizard snapshot builder
export {
  buildWizardSnapshotFromAgentId,
  buildWizardSnapshotFromAgent, // deprecated alias
  buildEmptyWizardSnapshot,
  type WizardSnapshot,
  type WizardSnapshotResult,
  type WizardSnapshotError,
  type BuildWizardSnapshotResult,
  type WizardSnapshotData,
  type WizardConfidence,
  type WizardGap,
  type WizardWarning,
  type WizardEvidence,
  type DeploymentState,
  type GapItem,
  type WarningItem,
  type ConfidenceMap,
} from './wizard-snapshot';

// Company enrichment helpers
export {
  ensureCompanyEnriched,
  needsEnrichment,
  getEnrichmentStatus,
  type EnrichedData,
  type EnrichmentGap as CompanyEnrichmentGap,
  type EnsureEnrichedResult,
  type EnsureEnrichedOptions,
} from './company-enrichment';

// Enrichment Engine v1 (modular)
export {
  runEnrichmentEngine,
  scrapeWebsiteText,
  extractCompanyIntel,
  mapToCompanyProfile,
  detectEnrichmentGaps,
  getGapsBySeverity,
  hasBlockingGaps,
  type EnrichmentEngineParams,
  type EnrichmentEngineResult,
  type ScrapeResult,
  type AIExtractionParams,
  type AIExtractionResult,
  type EvidenceItem,
  type ExtractedCompanyData,
  type CompanyProfile,
  type BrandVoiceProfile,
  type MappedProfile,
  type EnrichmentGap,
} from '../engines/enrichment';

// Template Engine v1 (modular)
export {
  runTemplateEngine,
  scoreTemplates,
  buildTemplateSeeds,
  aiSuggestTemplate,
  TEMPLATE_CATALOG,
  getTemplateByKey,
  getAllTemplateKeys,
  type TemplateEngineParams,
  type TemplateEngineResult,
  type TemplateDefinition,
  type TemplateSignals,
  type ChannelType,
  type ScoreTemplatesInput,
  type TemplateMatch,
  type BuildSeedsInput,
  type TemplateSeeds,
  type AITemplateCandidate,
  type AITemplateSuggestion,
  type AISuggestParams,
  type CompanyProfileLite,
  type BrandVoiceProfileLite,
  type EvidenceItemLite,
  type SelectedTemplate,
  type RoleCardSeed,
  type BrainConfigSeed,
  type KnowledgeConfigSeed,
  type PersonalitySeed,
  type ResponseRule,
  type TemplateGap,
  type TemplateWarning,
} from '../engines/template';

// Tools Engine v1 (modular)
export {
  runToolsEngine,
  scoreTools,
  clamp01,
  TOOL_CATALOG,
  getToolById,
  getToolsByCategory,
  getToolsForTemplate,
  getAllToolIds,
  aiSuggestTools,
  type ToolsEngineParams,
  type ToolDefinition,
  type ToolCategory,
  type AIToolCandidate,
  type AIToolSuggestion,
  type AIToolSuggestParams,
  type ToolRecommendationInput,
  type ToolMatch,
  type EnabledTool,
  type ToolPermissions,
  type ToolRateLimits,
  type ToolPolicies,
  type ToolPreferences,
  type ToolConfig,
  type ToolsEngineResult,
  type ToolsEvidence,
  type ToolsGap,
  type ToolsWarning,
} from '../engines/tools';

// Flow Engine v1 (modular)
export {
  runFlowEngine,
  clamp01 as flowClamp01,
  getBaseFlowSkeleton,
  getFlowSupportedTemplates,
  hasCustomFlow,
  buildToolHooks,
  getHooksForNode,
  getHooksForEvent,
  hasToolHook,
  validateFlow,
  checkFlowWarnings,
  getReachableNodes,
  canReachExit,
  FlowValidationError,
  detectFlowGaps,
  getGapsBySeverity as getFlowGapsBySeverity,
  hasBlockingGaps as hasBlockingFlowGaps,
  getGapQuestions,
  type FlowEngineParams,
  type FlowNodeType,
  type FlowNode,
  type FlowEdgeCondition,
  type FlowEdge,
  type FlowIntent,
  type ToolHookEvent,
  type ToolHookTrigger,
  type ToolHook,
  type EscalationConfig,
  type FallbackConfig,
  type FlowGuardrails,
  type FlowConfig,
  type FlowEngineInput,
  type FlowEvidence,
  type FlowGap,
  type FlowWarning,
  type FlowEngineResult,
  type FlowSkeleton,
  type BuildToolHooksParams,
} from '../engines/flow';

// Personality Engine v1 (modular)
export {
  runPersonalityEngine,
  clamp01 as personalityClamp01,
  hasValidPersonality,
  getOverallConfidence,
  needsReview,
  getTemplatePersonalityDefaults,
  getPersonalityDescription,
  getPersonalitySupportedTemplates,
  normalizeVoiceTone,
  normalizeSentenceComplexity,
  buildPersonalityConfig,
  hasBrandVoiceData,
  getBrandVoiceConfidence,
  detectPersonalityGaps,
  detectPersonalityWarnings,
  getGapsBySeverity as getPersonalityGapsBySeverity,
  hasBlockingGaps as hasBlockingPersonalityGaps,
  getWarningsBySeverity,
  hasErrorWarnings,
  type VoiceTone,
  type LanguageComplexity,
  type SentenceLength,
  type LanguageStyle,
  type ConversationPace,
  type PersonalityConfig,
  type BrandVoiceHints,
  type PersonalityCompanyInfo,
  type PersonalityEngineInput,
  type PersonalityEngineParams,
  type PersonalityEvidence,
  type PersonalityGap,
  type PersonalityWarning,
  type PersonalityEngineResult,
  type TemplatePersonalityDefaults,
  type BuildPersonalityResult,
} from '../engines/personality';

// Brain Engine v1 (modular)
export {
  runBrainEngine,
  clamp01 as brainClamp01,
  hasValidBrain,
  getBrainConfidence,
  needsBrainReview,
  getPolicySummary,
  getHighPriorityPolicies,
  getTemplateBrainDefaults,
  getBrainDescription,
  getBrainSupportedTemplates,
  normalizeReasoningApproach,
  normalizeUncertaintyAction,
  buildBrainConfig,
  hasGovernanceData,
  getHighPriorityPolicies as getRulePriorityPolicies,
  detectBrainGaps,
  detectBrainWarnings,
  getGapsBySeverity as getBrainGapsBySeverity,
  hasBlockingGaps as hasBlockingBrainGaps,
  getWarningsBySeverity as getBrainWarningsBySeverity,
  hasErrorWarnings as hasBrainErrorWarnings,
  type DecisionPolicy,
  type ResponseRule as BrainResponseRule,
  type ContextHandling,
  type ReasoningApproach,
  type ReasoningStrategy,
  type UncertaintyAction,
  type FallbackBehavior,
  type BrainConfig,
  type GovernanceHints,
  type BrainCompanyInfo,
  type BrainEngineInput,
  type BrainEngineParams,
  type BrainEvidence,
  type BrainGap,
  type BrainWarning,
  type BrainEngineResult,
  type TemplateBrainDefaults,
  type BuildBrainResult,
} from '../engines/brain';

// Knowledge Engine v1 (modular)
export {
  runKnowledgeEngine,
  generateKnowledgeConfig,
  type KnowledgeEngineInput,
  type KnowledgeEngineResult,
  type KnowledgeEngineGap,
  type KnowledgeEvidence,
  type KnowledgeCompanyProfile,
} from './engines';

// Learning Engine v1 (modular)
export {
  runLearningEngine,
  generateLearningConfig,
  type LearningEngineInput,
  type LearningEngineResult,
  type LearningEngineGap,
  type LearningWarning,
  type LearningEvidence,
  type LearningCompanyProfile,
  type ChannelType as LearningChannelType,
} from './engines';

// Memory Engine v1 (modular)
export {
  runMemoryEngine,
  generateMemoryConfig,
  type MemoryEngineInput,
  type MemoryEngineResult,
  type MemoryEngineGap,
  type MemoryWarning,
  type MemoryEvidence,
  type MemoryCompanyProfile,
  type MemoryChannelType,
} from './engines';

// Assembly Orchestrator v1
export {
  assembleAgentV1,
  // Types
  type AssemblyPhase,
  type DeploymentState as AssemblyDeploymentState,
  type AssemblyEvidence,
  type AssemblyAuditEntry,
  type WizardSnapshot as AssemblyWizardSnapshot,
  type AssemblyRequest,
  type AssemblyContext,
  type AssemblyResult,
  type CompanyProfile as AssemblyCompanyProfile,
  // Errors
  AssemblyError,
  AgentImmutableError,
} from './assembly';

// Next-step Resolver v1
export {
  buildNextStepFromAgentId,
  resolveNextStepV1,
  type NextStepData,
  type NextStepSuccessResult,
  type NextStepErrorResult,
  type BuildNextStepResult,
  type WizardStepKey,
  type ChannelType as NextStepChannelType,
  type NextStepResult,
  type Gap as NextStepGap,
  type Warning as NextStepWarning,
  type ConfidenceMap as NextStepConfidenceMap,
  type WizardSnapshot as NextStepWizardSnapshot,
  type ResolveArgs as NextStepResolveArgs,
} from './next-step';

// Next-step Explain v1
export {
  buildNextStepExplainFromAgentId,
  type NextStepExplainSuccessResult,
  type NextStepExplainErrorResult,
  type BuildNextStepExplainResult,
} from './next-step';
