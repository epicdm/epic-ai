/**
 * Template Engine v1
 *
 * The "brain" that turns company context into the best agent type + config seeds.
 * Deterministic-first, with optional AI assist.
 *
 * @module engines/template
 */

// Main engine
export {
  runTemplateEngine,
  type TemplateEngineParams,
} from "./template.engine";

// Template catalog
export {
  TEMPLATE_CATALOG,
  getTemplateByKey,
  getAllTemplateKeys,
  type TemplateDefinition,
  type TemplateSignals,
  type ChannelType,
} from "./template.catalog";

// Scoring
export {
  scoreTemplates,
  type ScoreTemplatesInput,
} from "./template.scoring";

// Seeds
export { buildTemplateSeeds, type BuildSeedsInput } from "./template.seeds";

// AI assist
export {
  aiSuggestTemplate,
  type AITemplateCandidate,
  type AITemplateSuggestion,
  type AISuggestParams,
} from "./template.ai";

// Types
export type {
  CompanyProfileLite,
  BrandVoiceProfileLite,
  EvidenceItemLite,
  TemplateMatch,
  SelectedTemplate,
  TemplateSeeds,
  TemplateEngineResult,
  RoleCardSeed,
  BrainConfigSeed,
  KnowledgeConfigSeed,
  PersonalitySeed,
  ResponseRule,
  TemplateGap,
  TemplateWarning,
} from "./template.types";
