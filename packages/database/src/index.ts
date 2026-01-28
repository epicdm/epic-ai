// Explicitly export Prisma types to avoid Turbopack CommonJS warning
// Only export what's actually used in the codebase
export {
  Prisma,
  PrismaClient,
  // Enums
  AccountStatus,
  AgentStatus,
  AttributionModel,
  CallDirection,
  CallOutcome,
  CallStatus,
  CampaignLeadStatus,
  CampaignVoiceStatus,
  ChannelType,
  ContentStatus,
  ContentType,
  DocumentStatus,
  EmojiFrequency,
  HashtagStyle,
  KnowledgeDocType,
  PhaseStatus,
  SetupPath,
  SocialPlatform,
  TouchpointAction,
  VoiceTone,
  WorkflowAction,
  WorkflowCategory,
  WorkflowStatus,
  WorkflowTrigger,
} from "@prisma/client";

// Re-export types
export type {
  Brand,
  BrandBrain,
  ContentItem,
  Lead,
  Membership,
  Organization,
  SocialAccount,
  User,
  VoiceAgent,
} from "@prisma/client";

export { prisma } from "./client";
