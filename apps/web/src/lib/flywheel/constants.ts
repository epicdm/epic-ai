/**
 * Flywheel Constants - Phase definitions, dependencies, and step configurations
 *
 * The flywheel follows this sequence:
 * UNDERSTAND → CREATE → DISTRIBUTE → LEARN → AUTOMATE
 */

import type { FlywheelPhase, PhaseInfo, WizardStep } from "./types";

/**
 * All flywheel phases in order
 */
export const FLYWHEEL_PHASES: FlywheelPhase[] = [
  "UNDERSTAND",
  "CREATE",
  "DISTRIBUTE",
  "LEARN",
  "AUTOMATE",
];

/**
 * Phase dependencies - what must be completed before each phase
 */
export const PHASE_DEPENDENCIES: Record<FlywheelPhase, FlywheelPhase[]> = {
  UNDERSTAND: [], // No dependencies - always available
  CREATE: ["UNDERSTAND"], // Needs Brand Brain
  DISTRIBUTE: ["CREATE"], // Needs content
  LEARN: ["DISTRIBUTE"], // Needs published posts
  AUTOMATE: ["LEARN"], // Needs analytics
};

/**
 * Phase metadata with display information
 */
export const PHASE_INFO: Record<FlywheelPhase, PhaseInfo> = {
  UNDERSTAND: {
    id: "UNDERSTAND",
    name: "Understand",
    description: "Build your Brand Brain - voice, tone, audiences, and content pillars",
    icon: "Brain",
    color: "purple",
    totalSteps: 9,
    dependencies: [],
  },
  CREATE: {
    id: "CREATE",
    name: "Create",
    description: "Set up your Content Factory - templates, first content, AI settings",
    icon: "Sparkles",
    color: "blue",
    totalSteps: 6,
    dependencies: ["UNDERSTAND"],
  },
  DISTRIBUTE: {
    id: "DISTRIBUTE",
    name: "Distribute",
    description: "Connect your Publishing Engine - social accounts and schedules",
    icon: "Share2",
    color: "green",
    totalSteps: 6,
    dependencies: ["CREATE"],
  },
  LEARN: {
    id: "LEARN",
    name: "Learn",
    description: "Configure Analytics - metrics, goals, and reporting preferences",
    icon: "TrendingUp",
    color: "orange",
    totalSteps: 5,
    dependencies: ["DISTRIBUTE"],
  },
  AUTOMATE: {
    id: "AUTOMATE",
    name: "Automate",
    description: "Activate AI Workflows - autopilot, triggers, and learning loop",
    icon: "Zap",
    color: "pink",
    totalSteps: 6,
    dependencies: ["LEARN"],
  },
};

// ============================================================================
// UNDERSTAND Phase Steps (8 Steps)
// ============================================================================

export const UNDERSTAND_STEPS: WizardStep[] = [
  {
    id: "industry",
    title: "Industry Selection",
    description: "Pick your industry to get tailored templates and suggestions",
    aiAssisted: true,
  },
  {
    id: "social-profiles",
    title: "Social Profiles",
    description: "Connect Facebook/Instagram to pull business info (logo, description, etc.)",
    optional: true,
    aiAssisted: true,
  },
  {
    id: "website",
    title: "Website Analysis",
    description: "Add your website URL for additional brand context",
    optional: true,
    aiAssisted: true,
  },
  {
    id: "identity",
    title: "Brand Identity",
    description: "Define your brand name, description, and mission",
    aiAssisted: true,
  },
  {
    id: "voice",
    title: "Voice & Tone",
    description: "Set your communication style - formality, personality, and writing style",
    aiAssisted: true,
  },
  {
    id: "audiences",
    title: "Target Audiences",
    description: "Create 1-3 personas representing your ideal customers",
    aiAssisted: true,
  },
  {
    id: "pillars",
    title: "Content Pillars",
    description: "Define 3-5 themes you'll consistently create content about",
    aiAssisted: true,
  },
  {
    id: "competitors",
    title: "Competitors",
    description: "Add 2-3 competitors for AI to analyze and differentiate from",
    optional: true,
    aiAssisted: true,
  },
  {
    id: "review",
    title: "Review & Save",
    description: "Confirm all your Brand Brain settings",
  },
];

// ============================================================================
// CREATE Phase Steps (6 Steps)
// ============================================================================

export const CREATE_STEPS: WizardStep[] = [
  {
    id: "templates",
    title: "Content Templates",
    description: "Select or create templates for your content types",
    aiAssisted: true,
  },
  {
    id: "first-content",
    title: "First Content",
    description: "Generate your first 3 posts using Brand Brain",
    aiAssisted: true,
  },
  {
    id: "content-types",
    title: "Content Types",
    description: "Enable the post types you want to create",
  },
  {
    id: "media",
    title: "Media Settings",
    description: "Configure image generation preferences and brand colors",
    aiAssisted: true,
  },
  {
    id: "hashtags",
    title: "Hashtag Strategy",
    description: "Set up your hashtag approach and save frequently used tags",
    aiAssisted: true,
  },
  {
    id: "review",
    title: "Review",
    description: "Preview your generated content and confirm settings",
  },
];

// ============================================================================
// DISTRIBUTE Phase Steps (6 Steps)
// ============================================================================

export const DISTRIBUTE_STEPS: WizardStep[] = [
  {
    id: "connect",
    title: "Connect Accounts",
    description: "Link your social media accounts via OAuth",
  },
  {
    id: "platform-settings",
    title: "Platform Settings",
    description: "Configure preferences for each connected platform",
  },
  {
    id: "schedule",
    title: "Schedule Setup",
    description: "Create your weekly posting schedule",
    aiAssisted: true,
  },
  {
    id: "timezone",
    title: "Timezone",
    description: "Confirm your timezone for accurate scheduling",
  },
  {
    id: "first-post",
    title: "First Post",
    description: "Schedule or publish your first piece of content",
  },
  {
    id: "review",
    title: "Review",
    description: "Confirm your schedule and preview the content calendar",
  },
];

// ============================================================================
// LEARN Phase Steps (5 Steps)
// ============================================================================

export const LEARN_STEPS: WizardStep[] = [
  {
    id: "intro",
    title: "Analytics Intro",
    description: "Understand how the learning loop improves your content",
  },
  {
    id: "metrics",
    title: "Metrics Preferences",
    description: "Choose which metrics matter most to you",
  },
  {
    id: "reporting",
    title: "Reporting Schedule",
    description: "Set up your weekly or monthly performance reports",
  },
  {
    id: "goals",
    title: "Learning Goals",
    description: "Tell AI what to optimize for",
  },
  {
    id: "review",
    title: "Review",
    description: "Confirm settings and see a sample report",
  },
];

// ============================================================================
// AUTOMATE Phase Steps (6 Steps)
// ============================================================================

export const AUTOMATE_STEPS: WizardStep[] = [
  {
    id: "intro",
    title: "Autopilot Intro",
    description: "Learn about automation levels and AI workflows",
  },
  {
    id: "approval",
    title: "Approval Mode",
    description: "Choose between Review, Auto-Queue, or Auto-Post",
  },
  {
    id: "content-mix",
    title: "Content Mix",
    description: "Set the ratio of content types (educational, promotional, etc.)",
    aiAssisted: true,
  },
  {
    id: "frequency",
    title: "Frequency",
    description: "Configure posts per week, per platform",
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Set up your alert preferences",
  },
  {
    id: "activate",
    title: "Review & Activate",
    description: "Final confirmation to activate your flywheel",
  },
];

/**
 * All wizard steps by phase
 */
export const WIZARD_STEPS: Record<FlywheelPhase, WizardStep[]> = {
  UNDERSTAND: UNDERSTAND_STEPS,
  CREATE: CREATE_STEPS,
  DISTRIBUTE: DISTRIBUTE_STEPS,
  LEARN: LEARN_STEPS,
  AUTOMATE: AUTOMATE_STEPS,
};

// ============================================================================
// Industry Templates
// ============================================================================

export const INDUSTRY_TEMPLATES = [
  {
    id: "saas",
    name: "SaaS / Software",
    description: "Perfect for tech companies and software products",
    suggestedVoice: { formality: 3, personality: ["professional", "innovative"] },
  },
  {
    id: "ecommerce",
    name: "E-Commerce / Retail",
    description: "Great for online stores and product brands",
    suggestedVoice: { formality: 2, personality: ["friendly", "enthusiastic"] },
  },
  {
    id: "agency",
    name: "Marketing Agency",
    description: "Ideal for marketing, creative, and consulting agencies",
    suggestedVoice: { formality: 3, personality: ["creative", "results-driven"] },
  },
  {
    id: "healthcare",
    name: "Healthcare / Wellness",
    description: "For healthcare providers, fitness, and wellness brands",
    suggestedVoice: { formality: 4, personality: ["caring", "trustworthy"] },
  },
  {
    id: "finance",
    name: "Finance / Insurance",
    description: "For financial services, fintech, and insurance companies",
    suggestedVoice: { formality: 5, personality: ["professional", "trustworthy"] },
  },
  {
    id: "education",
    name: "Education / Training",
    description: "For educators, course creators, and training providers",
    suggestedVoice: { formality: 3, personality: ["helpful", "knowledgeable"] },
  },
  {
    id: "real-estate",
    name: "Real Estate",
    description: "For realtors, property managers, and real estate agencies",
    suggestedVoice: { formality: 3, personality: ["professional", "personable"] },
  },
  {
    id: "restaurant",
    name: "Restaurant / Food",
    description: "For restaurants, food brands, and hospitality",
    suggestedVoice: { formality: 2, personality: ["warm", "inviting"] },
  },
  {
    id: "nonprofit",
    name: "Non-Profit / Cause",
    description: "For charities, foundations, and mission-driven organizations",
    suggestedVoice: { formality: 3, personality: ["passionate", "authentic"] },
  },
  {
    id: "personal",
    name: "Personal Brand",
    description: "For individuals, influencers, and thought leaders",
    suggestedVoice: { formality: 2, personality: ["authentic", "relatable"] },
  },
  {
    id: "other",
    name: "Other",
    description: "Custom industry - we'll help you define your voice",
    suggestedVoice: { formality: 3, personality: ["professional"] },
  },
];

// ============================================================================
// Voice & Tone Options
// ============================================================================

export const FORMALITY_LEVELS = [
  { value: 1, label: "Very Casual", description: "Like texting a friend" },
  { value: 2, label: "Casual", description: "Friendly and approachable" },
  { value: 3, label: "Balanced", description: "Professional yet personable" },
  { value: 4, label: "Formal", description: "Business professional" },
  { value: 5, label: "Very Formal", description: "Corporate or academic" },
];

export const PERSONALITY_TRAITS = [
  { id: "professional", label: "Professional", emoji: "💼" },
  { id: "friendly", label: "Friendly", emoji: "😊" },
  { id: "innovative", label: "Innovative", emoji: "💡" },
  { id: "creative", label: "Creative", emoji: "🎨" },
  { id: "trustworthy", label: "Trustworthy", emoji: "🤝" },
  { id: "bold", label: "Bold", emoji: "🔥" },
  { id: "witty", label: "Witty", emoji: "😏" },
  { id: "caring", label: "Caring", emoji: "❤️" },
  { id: "enthusiastic", label: "Enthusiastic", emoji: "🎉" },
  { id: "authentic", label: "Authentic", emoji: "✨" },
  { id: "educational", label: "Educational", emoji: "📚" },
  { id: "inspiring", label: "Inspiring", emoji: "🌟" },
];

export const WRITING_STYLES = [
  { id: "conversational", label: "Conversational", description: "Like talking to a friend" },
  { id: "storytelling", label: "Storytelling", description: "Narrative and engaging" },
  { id: "educational", label: "Educational", description: "Informative and teaching" },
  { id: "persuasive", label: "Persuasive", description: "Compelling and action-oriented" },
  { id: "minimal", label: "Minimal", description: "Short and punchy" },
  { id: "detailed", label: "Detailed", description: "Comprehensive and thorough" },
];

// ============================================================================
// Content Types
// ============================================================================

export const CONTENT_TYPES = [
  { id: "text", label: "Text Posts", description: "Standard text updates", icon: "Type" },
  { id: "image", label: "Image Posts", description: "Single image with caption", icon: "Image" },
  { id: "carousel", label: "Carousels", description: "Multi-image slideshows", icon: "Layers" },
  { id: "video", label: "Videos", description: "Video content", icon: "Video" },
  { id: "story", label: "Stories", description: "24-hour ephemeral content", icon: "Clock" },
  { id: "poll", label: "Polls", description: "Interactive voting posts", icon: "BarChart2" },
];

// ============================================================================
// Social Platforms
// ============================================================================

export const SOCIAL_PLATFORMS = [
  {
    id: "twitter",
    name: "Twitter / X",
    icon: "Twitter",
    color: "#1DA1F2",
    maxLength: 280,
    supportsMedia: true,
    supportsScheduling: true,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "Linkedin",
    color: "#0A66C2",
    maxLength: 3000,
    supportsMedia: true,
    supportsScheduling: true,
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: "Facebook",
    color: "#1877F2",
    maxLength: 63206,
    supportsMedia: true,
    supportsScheduling: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: "Instagram",
    color: "#E4405F",
    maxLength: 2200,
    supportsMedia: true,
    supportsScheduling: true,
  },
];

// ============================================================================
// Metrics
// ============================================================================

export const METRIC_TYPES = [
  { id: "impressions", label: "Impressions", description: "How many times content was shown" },
  { id: "reach", label: "Reach", description: "Unique users who saw your content" },
  { id: "engagement", label: "Engagement", description: "Likes, comments, shares combined" },
  { id: "clicks", label: "Link Clicks", description: "Clicks on links in your content" },
  { id: "followers", label: "Follower Growth", description: "New followers gained" },
  { id: "conversions", label: "Conversions", description: "Goal completions from social" },
  { id: "leads", label: "Leads Generated", description: "New leads from social content" },
];

// ============================================================================
// Automation Levels
// ============================================================================

export const APPROVAL_MODES = [
  {
    id: "review",
    label: "Review Mode",
    description: "AI generates content, you approve before posting",
    icon: "Eye",
  },
  {
    id: "auto_queue",
    label: "Auto-Queue",
    description: "AI queues content, you can edit before scheduled time",
    icon: "List",
  },
  {
    id: "auto_post",
    label: "Auto-Post",
    description: "AI creates and posts automatically (full autopilot)",
    icon: "Zap",
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the next available phase based on completed phases
 */
export function getNextAvailablePhase(
  completedPhases: FlywheelPhase[]
): FlywheelPhase | null {
  for (const phase of FLYWHEEL_PHASES) {
    const deps = PHASE_DEPENDENCIES[phase];
    const allDepsMet = deps.every((dep) => completedPhases.includes(dep));
    if (allDepsMet && !completedPhases.includes(phase)) {
      return phase;
    }
  }
  return null;
}

/**
 * Check if a phase is blocked by unmet dependencies
 */
export function isPhaseBlocked(
  phase: FlywheelPhase,
  completedPhases: FlywheelPhase[]
): boolean {
  const deps = PHASE_DEPENDENCIES[phase];
  return !deps.every((dep) => completedPhases.includes(dep));
}

/**
 * Get which phases are blocking a given phase
 */
export function getBlockingPhases(
  phase: FlywheelPhase,
  completedPhases: FlywheelPhase[]
): FlywheelPhase[] {
  const deps = PHASE_DEPENDENCIES[phase];
  return deps.filter((dep) => !completedPhases.includes(dep));
}

/**
 * Calculate overall flywheel progress percentage
 */
export function calculateOverallProgress(
  phaseProgress: Record<FlywheelPhase, number>
): number {
  const totalSteps = FLYWHEEL_PHASES.reduce(
    (sum, phase) => sum + PHASE_INFO[phase].totalSteps,
    0
  );
  const completedSteps = FLYWHEEL_PHASES.reduce(
    (sum, phase) => sum + Math.max(0, phaseProgress[phase] || 0),
    0
  );
  return Math.round((completedSteps / totalSteps) * 100);
}
