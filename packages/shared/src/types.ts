// Plan Types
export type PlanType = "starter" | "growth" | "pro" | "agency" | "enterprise";

// Role Types
export type UserRole = "owner" | "admin" | "member" | "viewer";

// Social Platforms
export type SocialPlatform =
  | "twitter"
  | "instagram"
  | "linkedin"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "threads"
  | "bluesky"
  | "reddit"
  | "discord"
  | "pinterest"
  | "mastodon";

// Voice Providers
export type LLMProvider = "openai" | "anthropic" | "google" | "groq";
export type STTProvider = "deepgram" | "whisper" | "assemblyai";
export type TTSProvider = "openai" | "elevenlabs" | "cartesia" | "playht";

// Lead Status
export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

// Call Direction
export type CallDirection = "inbound" | "outbound";

// Post Status
export type PostStatus = "draft" | "scheduled" | "published" | "failed";

// Subscription Status
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing";
