/**
 * Flywheel Types - Core TypeScript interfaces for the 5-Phase Wizard System
 *
 * The flywheel follows this sequence:
 * UNDERSTAND → CREATE → DISTRIBUTE → LEARN → AUTOMATE
 */

// Re-export the Prisma PhaseStatus enum for convenience
export { PhaseStatus } from "@epic-ai/database";

/**
 * The 5 phases of the Epic AI flywheel
 */
export type FlywheelPhase = "UNDERSTAND" | "CREATE" | "DISTRIBUTE" | "LEARN" | "AUTOMATE";

/**
 * Phase status values (mirrors Prisma enum)
 */
export type PhaseStatusType = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

/**
 * Phase metadata with display information
 */
export interface PhaseInfo {
  id: FlywheelPhase;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
  totalSteps: number;
  dependencies: FlywheelPhase[];
}

/**
 * Current state of a single phase
 */
export interface PhaseState {
  phase: FlywheelPhase;
  status: PhaseStatusType;
  currentStep: number; // -1 = not started
  totalSteps: number;
  data: Record<string, unknown> | null;
  isBlocked: boolean;
  blockedBy: FlywheelPhase[];
  completedAt?: Date;
}

/**
 * Overall flywheel progress
 */
export interface FlywheelState {
  phases: Record<FlywheelPhase, PhaseState>;
  overallProgress: number; // 0-100
  flywheelActive: boolean;
  activatedAt?: Date;
  lastActivePhase?: FlywheelPhase;
  lastActiveAt: Date;
  websiteAnalysis?: WebsiteAnalysis;
  industryAnalysis?: IndustryAnalysis;
}

// ============================================================================
// UNDERSTAND Phase Types (8 Steps)
// ============================================================================

export interface UnderstandWizardData {
  // Step 1: Industry Selection
  industry?: string;
  industryTemplate?: string;

  // Step 2: Website Analysis
  websiteUrl?: string;
  websiteAnalyzed?: boolean;

  // Step 3: Brand Identity
  brandName?: string;
  brandDescription?: string;
  mission?: string;

  // Step 4: Voice & Tone
  formality?: number; // 1-5
  personality?: string[];
  writingStyle?: string;

  // Step 5: Target Audience
  audiences?: AudienceData[];

  // Step 6: Content Pillars
  contentPillars?: ContentPillarData[];

  // Step 7: Competitors
  competitors?: CompetitorData[];

  // Step 8: Social Profiles
  socialProfiles?: ConnectedAccountData[];

  // Step 9: Review
  confirmed?: boolean;
}

export interface AudienceData {
  id?: string;
  name: string;
  description: string;
  demographics?: string;
  painPoints?: string[];
  goals?: string[];
  platforms?: string[];
}

// Alias for wizard components
export type AudiencePersona = AudienceData;

export interface ContentPillarData {
  id?: string;
  name: string;
  description: string;
  topics?: string[];
  frequency?: number; // percentage
}

export interface CompetitorData {
  id?: string;
  name: string;
  website?: string;
  socialHandles?: Record<string, string>;
  notes?: string;
  strengths?: string[];
  weaknesses?: string[];
}

// ============================================================================
// CREATE Phase Types (6 Steps)
// ============================================================================

export interface CreateWizardData {
  // Step 1: Content Templates
  templates?: ContentTemplateData[];

  // Step 2: First Content
  generatedContent?: GeneratedContentData[];

  // Step 3: Content Types
  enabledTypes?: ContentType[];

  // Step 4: Media Settings
  imageStyle?: string;
  imageGeneration?: boolean;
  brandColors?: string[];

  // Step 5: Hashtag Strategy
  hashtagStrategy?: "none" | "minimal" | "moderate" | "heavy";
  savedHashtags?: string[];

  // Step 6: Review
  confirmed?: boolean;
}

export type ContentType = "text" | "image" | "carousel" | "video" | "story" | "poll";

export interface ContentTemplateData {
  id?: string;
  name: string;
  structure: string;
  contentType: ContentType;
  platforms: string[];
}

export interface GeneratedContentData {
  id?: string;
  topic: string;
  content: string;
  platform: string;
  status: "draft" | "approved" | "scheduled";
}

// ============================================================================
// DISTRIBUTE Phase Types (6 Steps)
// ============================================================================

export type FirstPostOption = "skip" | "schedule" | "publish";

export interface DistributeWizardData {
  // Step 1: Connect Accounts
  connectedAccounts?: ConnectedAccountData[];

  // Step 2: Platform Settings
  platformSettings?: Record<string, PlatformSettings>;

  // Step 3: Schedule Setup
  schedule?: ScheduleData;

  // Step 4: Timezone
  timezone?: string;
  autoDetected?: boolean;

  // Step 5: First Post
  firstPostOption?: FirstPostOption;
  firstPostContentId?: string;
  firstPostScheduled?: boolean;

  // Step 6: Review
  confirmed?: boolean;
}

export interface ConnectedAccountData {
  id?: string;
  platform: string;
  handle: string;
  connected: boolean;
  connectedAt?: Date;
}

export interface PlatformSettings {
  enabled: boolean;
  autoPost: boolean;
  postingFrequency?: number; // posts per week
  bestTimes?: string[];
}

export interface ScheduleData {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

export interface TimeSlot {
  time: string; // HH:MM format
  platforms: string[];
}

// ============================================================================
// LEARN Phase Types (5 Steps)
// ============================================================================

export interface LearnWizardData {
  // Step 1: Analytics Intro
  seenIntro?: boolean;

  // Step 2: Metrics Preferences
  priorityMetrics?: MetricType[];

  // Step 3: Reporting Schedule
  reportFrequency?: "daily" | "weekly" | "monthly";
  reportDay?: number; // 0-6 for day of week
  reportEmail?: boolean;

  // Step 4: Learning Goals
  optimizationGoals?: OptimizationGoal[];

  // Step 5: Review
  confirmed?: boolean;
}

export type MetricType =
  | "impressions"
  | "reach"
  | "engagement"
  | "clicks"
  | "followers"
  | "conversions"
  | "leads";

export interface OptimizationGoal {
  metric: MetricType;
  target?: number;
  priority: "high" | "medium" | "low";
}

// ============================================================================
// AUTOMATE Phase Types (6 Steps)
// ============================================================================

export interface AutomateWizardData {
  // Step 1: Autopilot Intro
  seenIntro?: boolean;

  // Step 2: Approval Mode
  approvalMode?: "review" | "auto_queue" | "auto_post";

  // Step 3: Content Mix
  contentMix?: ContentMixSettings;

  // Step 4: Frequency
  postsPerWeek?: number;
  platformFrequency?: Record<string, number>;

  // Step 5: Notifications
  notifications?: NotificationSettings;

  // Step 6: Review & Activate
  confirmed?: boolean;
  activated?: boolean;
}

export interface ContentMixSettings {
  educational: number; // percentage
  promotional: number;
  entertaining: number;
  engaging: number;
}

export interface NotificationSettings {
  email: boolean;
  inApp: boolean;
  contentGenerated: boolean;
  postPublished: boolean;
  weeklyReport: boolean;
  performanceAlerts: boolean;
}

// ============================================================================
// Smart Defaults / AI Analysis Types
// ============================================================================

export interface WebsiteAnalysis {
  url: string;
  title?: string;
  description?: string;
  logo?: string;
  colors?: string[];
  industry?: string;
  keywords?: string[];
  socialLinks?: Record<string, string>;
  analyzedAt: Date;
  confidence: number; // 0-1
}

export interface IndustryAnalysis {
  industry: string;
  suggestedVoice?: {
    formality: number;
    personality: string[];
  };
  suggestedPillars?: ContentPillarData[];
  suggestedAudiences?: AudienceData[];
  competitors?: CompetitorData[];
  analyzedAt: Date;
}

// ============================================================================
// API Types
// ============================================================================

export interface UpdatePhaseRequest {
  status?: PhaseStatusType;
  currentStep?: number;
  data?: Record<string, unknown>;
}

export interface PhaseAnalyzeRequest {
  websiteUrl?: string;
  industry?: string;
}

export interface PhaseAnalyzeResponse {
  websiteAnalysis?: WebsiteAnalysis;
  industryAnalysis?: IndustryAnalysis;
  suggestedData?: Partial<UnderstandWizardData>;
}

// ============================================================================
// Wizard Step Types
// ============================================================================

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  optional?: boolean;
  aiAssisted?: boolean;
}

export interface WizardNavigation {
  currentStep: number;
  totalSteps: number;
  canGoBack: boolean;
  canGoForward: boolean;
  canSkip: boolean;
  isComplete: boolean;
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface PhaseHubProps {
  flywheelState: FlywheelState;
  onPhaseSelect: (phase: FlywheelPhase) => void;
}

export interface PhaseCardProps {
  phaseInfo: PhaseInfo;
  phaseState: PhaseState;
  onClick: () => void;
}

export interface WizardProps<T extends Record<string, unknown>> {
  initialData?: T;
  onComplete: (data: T) => Promise<void>;
  onSaveProgress: (data: T, step: number) => Promise<void>;
  onClose: () => void;
}
