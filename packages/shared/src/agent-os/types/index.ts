/**
 * Agent OS Type Definitions
 *
 * @module agent-os/types
 */

// ============================================
// RE-EXPORTS
// ============================================

export * from "./config-modules";

// ============================================
// CORE TYPES
// ============================================

/** Confidence scores by field path */
export type ConfidenceMap = Record<string, number>;

/** Evidence supporting a generated value */
export interface EvidenceItem {
  field_path: string;
  source_type:
    | "website_scrape"
    | "manual_input"
    | "api_response"
    | "document"
    | "inference"
    | "default_value";
  source_url?: string;
  extracted_text?: string;
  confidence: number;
  reasoning?: string;
  timestamp?: string;
}

/** Gap type enum for data gaps */
export type GapType =
  | "missing_required"
  | "missing_recommended"
  | "missing_config"
  | "missing_data"
  | "missing_profile"
  | "missing_pricing"
  | "missing_hours"
  | "missing_service_area"
  | "missing_contact"
  | "incomplete"
  | "invalid"
  | "missing_context"
  | "no_compliance"
  | "no_knowledge"
  | "no_tools"
  | "no_learning"
  | "no_escalation";

/** Gap in data requiring user input */
export interface GapItem {
  gap_type: GapType;
  field_path: string;
  severity: "low" | "medium" | "high";
  impact: string;
  recommended_fix: string;
  question_to_user?: string;
  suggestions?: string[];
}

/** Warning about potential issues */
export interface WarningItem {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  field_path?: string;
  suggestion?: string;
}

// ============================================
// PROMPT ENVELOPE (AI Request/Response Wrappers)
// ============================================

/**
 * Standardized wrapper for AI prompt requests.
 * Ensures all AI calls have proper context, governance, and tracking.
 */
export interface PromptRequestEnvelope {
  /** System prompt with instructions */
  system_prompt: string;
  /** User/task prompt */
  user_prompt: string;
  /** Context for the AI call */
  context: {
    agent_id?: string;
    company_profile_id?: string;
    job_id?: string;
    session_id?: string;
  };
  /** Evidence/data used as input */
  input_evidence: EvidenceItem[];
  /** Expected output schema (JSON schema string) */
  expected_output_schema?: string;
  /** Governance constraints */
  governance: {
    pii_allowed: boolean;
    max_tokens?: number;
    temperature: number;
    model: string;
  };
  /** Tracking metadata */
  created_at?: string;
  request_id?: string;
}

/**
 * Standardized wrapper for AI-generated responses.
 * Contains the result plus metadata about confidence and gaps.
 */
export interface PromptEnvelope<T> {
  /** The generated result */
  result: T;
  /** Confidence scores for each field (0-1) */
  confidence: ConfidenceMap;
  /** Evidence supporting the generated values */
  evidence: EvidenceItem[];
  /** Gaps that need user input */
  gaps: GapItem[];
  /** Warnings about potential issues */
  warnings?: WarningItem[];
}

// ============================================
// API RESPONSE ENVELOPE
// ============================================

/**
 * Standardized API response envelope.
 * All Agent OS API endpoints return this shape.
 */
export interface ApiResponse<T> {
  /** The response data */
  data: T | null;
  /** Confidence scores for generated/updated fields */
  confidence?: ConfidenceMap;
  /** Known gaps requiring user action */
  gaps?: GapItem[];
  /** Warnings about potential issues */
  warnings?: WarningItem[];
  /** Error information if request failed */
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/** Helper type for successful responses */
export type ApiSuccess<T> = ApiResponse<T> & { data: T; error?: never };

/** Helper type for error responses */
export type ApiFailure = ApiResponse<null> & { data: null; error: ApiError };

// ============================================
// WIZARD TYPES
// ============================================

/** Wizard step definitions */
export enum WizardStep {
  COMPANY_INFO = 0,
  TEMPLATE = 1,
  AGENT_SETUP = 2,
  VOICE_PERSONALITY = 3,
  TOOLS = 4,
  KNOWLEDGE = 5,
  TEST = 6,
  LAUNCH = 7,
}

/** Data for each wizard step */
export interface WizardStepData {
  [WizardStep.COMPANY_INFO]: CompanyInfoStepData;
  [WizardStep.TEMPLATE]: TemplateStepData;
  [WizardStep.AGENT_SETUP]: AgentSetupStepData;
  [WizardStep.VOICE_PERSONALITY]: VoicePersonalityStepData;
  [WizardStep.TOOLS]: ToolsStepData;
  [WizardStep.KNOWLEDGE]: KnowledgeStepData;
  [WizardStep.TEST]: TestStepData;
  [WizardStep.LAUNCH]: LaunchStepData;
}

export interface CompanyInfoStepData {
  name: string;
  website?: string;
  industry?: string;
  description?: string;
}

export interface TemplateStepData {
  selectedTemplateId: string;
  templateSlug: string;
}

export interface AgentSetupStepData {
  name: string;
  description?: string;
  channels: string[];
}

export interface VoicePersonalityStepData {
  tone: string;
  formality: number;
  customInstructions?: string;
}

export interface ToolsStepData {
  enabledToolIds: string[];
  toolConfigs: Record<string, unknown>;
}

export interface KnowledgeStepData {
  knowledgeBaseIds: string[];
  documents: string[];
  websites: string[];
}

export interface TestStepData {
  simulationId?: string;
  testResults?: unknown;
}

export interface LaunchStepData {
  confirmations: {
    terms: boolean;
    governance: boolean;
  };
}

// ============================================
// TEMPLATE TYPES
// ============================================

export interface AgentTemplateInfo {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  useCases: string[];
  industries: string[];
  channels: string[];
  complexity: string;
  popularity: number;
  featured: boolean;
}

export interface TemplateRecommendation {
  template: AgentTemplateInfo;
  matchScore: number;
  reasons: string[];
}

// ============================================
// COMPANY PROFILE TYPES
// ============================================

export interface CompanyProfileData {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  companySize?: string;
  mission?: string;
  values: string[];
  products: ProductInfo[];
  services: ServiceInfo[];
  targetMarkets: string[];
  competitors: string[];
  socialLinks: SocialLinks;
}

export interface ProductInfo {
  name: string;
  description: string;
  category?: string;
}

export interface ServiceInfo {
  name: string;
  description: string;
  category?: string;
}

export interface SocialLinks {
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
}

// ============================================
// SIMULATION TYPES
// ============================================

export interface SimulationConfig {
  name: string;
  scenario: string;
  testInputs: TestInput[];
}

export interface TestInput {
  type: "message" | "call";
  content: string;
  metadata?: Record<string, unknown>;
}

export interface SimulationResult {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  score?: number;
  responses: SimulationResponse[];
  issues: SimulationIssue[];
  riskFlags: RiskFlag[];
}

export interface SimulationResponse {
  inputIndex: number;
  response: string;
  latency: number;
  tokensUsed: number;
  toolsUsed: string[];
}

export interface SimulationIssue {
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  inputIndex?: number;
}

export interface RiskFlag {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  recommendation: string;
}

// ============================================
// JOB TYPES
// ============================================

export enum AgentJobType {
  ENRICH_COMPANY = "ENRICH_COMPANY",
  GENERATE_ROLE_CARD = "GENERATE_ROLE_CARD",
  GENERATE_BRAIN_CONFIG = "GENERATE_BRAIN_CONFIG",
  GENERATE_PERSONALITY = "GENERATE_PERSONALITY",
  PROCESS_KNOWLEDGE = "PROCESS_KNOWLEDGE",
  RUN_SIMULATION = "RUN_SIMULATION",
  VALIDATE_GOVERNANCE = "VALIDATE_GOVERNANCE",
  PROCESS_FEEDBACK = "PROCESS_FEEDBACK",
  UPDATE_MEMORY = "UPDATE_MEMORY",
  PROPOSE_IMPROVEMENTS = "PROPOSE_IMPROVEMENTS",
}

export interface JobResult<T = unknown> {
  jobId: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  result?: T;
  error?: string;
}
