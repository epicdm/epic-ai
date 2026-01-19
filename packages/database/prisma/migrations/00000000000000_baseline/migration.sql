-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SetupPath" AS ENUM ('AI_EXPRESS', 'GUIDED', 'EXPERT');

-- CreateEnum
CREATE TYPE "ContextSourceType" AS ENUM ('WEBSITE', 'RSS_FEED', 'PDF_UPLOAD', 'GOOGLE_DOCS', 'NOTION', 'EMAIL_FORWARD', 'MANUAL_NOTE', 'CRM_HUBSPOT', 'CRM_SALESFORCE', 'SOCIAL_MENTION', 'NEWS_SEARCH', 'COMPETITOR');

-- CreateEnum
CREATE TYPE "ContextSourceStatus" AS ENUM ('PENDING', 'ACTIVE', 'SYNCING', 'ERROR', 'PAUSED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('POST', 'STORY', 'REEL', 'THREAD', 'AD', 'BLOG_EXCERPT');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'AUTO_APPROVED');

-- CreateEnum
CREATE TYPE "VoiceTone" AS ENUM ('PROFESSIONAL', 'CASUAL', 'ENTHUSIASTIC', 'EDUCATIONAL', 'WITTY', 'INSPIRATIONAL', 'EMPATHETIC', 'BOLD');

-- CreateEnum
CREATE TYPE "EmojiFrequency" AS ENUM ('NONE', 'MINIMAL', 'MODERATE', 'FREQUENT');

-- CreateEnum
CREATE TYPE "HashtagStyle" AS ENUM ('NONE', 'MINIMAL', 'MODERATE', 'MIXED', 'COMPREHENSIVE');

-- CreateEnum
CREATE TYPE "LearningType" AS ENUM ('BEST_TIME', 'BEST_HASHTAG', 'BEST_TOPIC', 'BEST_FORMAT', 'AUDIENCE_INSIGHT', 'TONE_ADJUSTMENT', 'AVOID', 'PLATFORM_SPECIFIC');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'THREADS', 'BLUESKY');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('PENDING', 'PUBLISHING', 'SUCCESS', 'FAILED', 'RATE_LIMITED');

-- CreateEnum
CREATE TYPE "ApprovalMode" AS ENUM ('REVIEW', 'AUTO_QUEUE', 'AUTO_POST');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'CONNECTED', 'EXPIRED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "AdPlatform" AS ENUM ('META', 'GOOGLE', 'LINKEDIN', 'TIKTOK', 'TWITTER');

-- CreateEnum
CREATE TYPE "CampaignObjective" AS ENUM ('AWARENESS', 'TRAFFIC', 'ENGAGEMENT', 'LEAD_GENERATION', 'CONVERSIONS', 'SALES');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('MANUAL', 'META_ADS', 'GOOGLE_ADS', 'LINKEDIN_ADS', 'TIKTOK_ADS', 'ORGANIC_SOCIAL', 'WEBSITE', 'REFERRAL', 'IMPORT', 'WEBHOOK_META', 'WEBHOOK_GOOGLE', 'WEBHOOK_LINKEDIN', 'WEBHOOK_TIKTOK', 'WEBHOOK_GENERIC', 'API', 'ORGANIC');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('INBOUND', 'OUTBOUND', 'HYBRID');

-- CreateEnum
CREATE TYPE "ToolType" AS ENUM ('WEBHOOK', 'BUILTIN', 'FUNCTION');

-- CreateEnum
CREATE TYPE "RoutingStrategy" AS ENUM ('ROUND_ROBIN', 'LEAST_BUSY', 'PRIORITY', 'WEIGHTED', 'SKILLS_BASED', 'RANDOM');

-- CreateEnum
CREATE TYPE "KnowledgeDocType" AS ENUM ('TEXT', 'PDF', 'URL', 'MARKDOWN', 'DOCX', 'CSV');

-- CreateEnum
CREATE TYPE "FlowNodeType" AS ENUM ('START', 'MESSAGE', 'INPUT', 'CONDITION', 'INTENT', 'TOOL_CALL', 'TRANSFER', 'WAIT', 'SET_VARIABLE', 'END');

-- CreateEnum
CREATE TYPE "FlowEdgeType" AS ENUM ('DEFAULT', 'CONDITIONAL', 'INTENT_MATCH', 'FALLBACK', 'ERROR');

-- CreateEnum
CREATE TYPE "CallDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('ACTIVE', 'RINGING', 'IN_PROGRESS', 'ENDED');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED', 'VOICEMAIL', 'TRANSFERRED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CampaignVoiceStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CampaignLeadStatus" AS ENUM ('PENDING', 'CALLING', 'COMPLETED', 'FAILED', 'SKIPPED', 'DO_NOT_CALL');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('SCRAPE_WEBSITE', 'SYNC_RSS', 'PROCESS_DOCUMENT', 'GENERATE_CONTENT', 'GENERATE_IMAGE', 'PUBLISH_CONTENT', 'SYNC_ANALYTICS', 'REFRESH_TOKEN');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VariationStatus" AS ENUM ('PENDING', 'APPROVED', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "PublishingStatus" AS ENUM ('SUCCESS', 'FAILED', 'RETRYING', 'RATE_LIMITED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "AnalyticsPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('SOCIAL', 'VOICE', 'EMAIL', 'CHAT', 'WEBSITE', 'ADS');

-- CreateEnum
CREATE TYPE "TouchpointAction" AS ENUM ('VIEW', 'ENGAGE', 'CLICK', 'CALL', 'MESSAGE', 'FORM_SUBMIT', 'PURCHASE', 'SIGNUP', 'DEMO', 'MEETING');

-- CreateEnum
CREATE TYPE "WorkflowCategory" AS ENUM ('LEAD_NURTURE', 'CUSTOMER_ONBOARDING', 'RE_ENGAGEMENT', 'EVENT_PROMOTION', 'SUPPORT_ESCALATION', 'SALES_OUTREACH', 'RETENTION', 'FEEDBACK', 'CUSTOM');

-- CreateEnum
CREATE TYPE "WorkflowTrigger" AS ENUM ('MANUAL', 'SCHEDULED', 'EVENT', 'CONDITION', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WorkflowAction" AS ENUM ('SOCIAL_POST', 'SOCIAL_DM', 'SOCIAL_ENGAGE', 'VOICE_CALL_OUTBOUND', 'VOICE_CALL_SCHEDULE', 'VOICE_SMS', 'EMAIL_SEND', 'EMAIL_SEQUENCE_START', 'EMAIL_SEQUENCE_STOP', 'CHAT_MESSAGE', 'CHAT_ASSIGN', 'WAIT', 'CONDITION', 'UPDATE_LEAD', 'NOTIFY_TEAM', 'AI_ANALYZE', 'ATTRIBUTE', 'END');

-- CreateEnum
CREATE TYPE "AttributionModel" AS ENUM ('FIRST_TOUCH', 'LAST_TOUCH', 'LINEAR', 'TIME_DECAY', 'POSITION', 'CUSTOM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flywheel_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "brand_id" TEXT,
    "understand_phase" "PhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "create_phase" "PhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "distribute_phase" "PhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "learn_phase" "PhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "automate_phase" "PhaseStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "understand_step" INTEGER NOT NULL DEFAULT -1,
    "create_step" INTEGER NOT NULL DEFAULT -1,
    "distribute_step" INTEGER NOT NULL DEFAULT -1,
    "learn_step" INTEGER NOT NULL DEFAULT -1,
    "automate_step" INTEGER NOT NULL DEFAULT -1,
    "understand_data" JSONB,
    "create_data" JSONB,
    "distribute_data" JSONB,
    "learn_data" JSONB,
    "automate_data" JSONB,
    "website_analysis" JSONB,
    "industry_analysis" JSONB,
    "overall_progress" INTEGER NOT NULL DEFAULT 0,
    "flywheel_active" BOOLEAN NOT NULL DEFAULT false,
    "activated_at" TIMESTAMP(3),
    "setup_path" "SetupPath" NOT NULL DEFAULT 'EXPERT',
    "guided_current_step" INTEGER NOT NULL DEFAULT 0,
    "guided_step_data" JSONB,
    "ai_confidence" JSONB,
    "last_saved_at" TIMESTAMP(3),
    "last_active_phase" TEXT,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flywheel_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_onboarding_progress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "has_seen_welcome" BOOLEAN NOT NULL DEFAULT false,
    "has_chosen_goal" TEXT,
    "has_created_brand" BOOLEAN NOT NULL DEFAULT false,
    "has_completed_quick_win" BOOLEAN NOT NULL DEFAULT false,
    "has_seen_dashboard_tour" BOOLEAN NOT NULL DEFAULT false,
    "has_created_voice_agent" BOOLEAN NOT NULL DEFAULT false,
    "has_connected_social" BOOLEAN NOT NULL DEFAULT false,
    "has_created_campaign" BOOLEAN NOT NULL DEFAULT false,
    "has_generated_content" BOOLEAN NOT NULL DEFAULT false,
    "completion_percentage" INTEGER NOT NULL DEFAULT 0,
    "current_step" TEXT,
    "is_demo_mode" BOOLEAN NOT NULL DEFAULT false,
    "onboarding_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "onboarding_completed_at" TIMESTAMP(3),
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wizard_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wizard_type" TEXT NOT NULL,
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "total_steps" INTEGER NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "abandoned" BOOLEAN NOT NULL DEFAULT false,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wizard_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_discovery_state" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "has_seen_tooltip" BOOLEAN NOT NULL DEFAULT false,
    "has_dismissed" BOOLEAN NOT NULL DEFAULT false,
    "interaction_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_discovery_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_unlocks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unlockConditions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_features" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_mode_data" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "demo_voice_agent" JSONB,
    "demo_campaign" JSONB,
    "demo_leads" JSONB,
    "demo_call_logs" JSONB,
    "demo_content" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demo_mode_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "stripe_customer_id" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "magnus_user_id" TEXT,
    "magnus_username" TEXT,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "industry" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_brains" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "setup_complete" BOOLEAN NOT NULL DEFAULT false,
    "setup_step" INTEGER NOT NULL DEFAULT 0,
    "company_name" TEXT,
    "description" TEXT,
    "mission" TEXT,
    "values" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "unique_selling_points" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "industry" TEXT,
    "target_market" TEXT,
    "voice_tone" "VoiceTone" NOT NULL DEFAULT 'PROFESSIONAL',
    "voice_tone_custom" TEXT,
    "formality_level" INTEGER NOT NULL DEFAULT 3,
    "writing_style" TEXT,
    "do_not_mention" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "must_mention" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "use_emojis" BOOLEAN NOT NULL DEFAULT true,
    "emoji_frequency" "EmojiFrequency" NOT NULL DEFAULT 'MODERATE',
    "emoji_style" TEXT NOT NULL DEFAULT 'moderate',
    "use_hashtags" BOOLEAN NOT NULL DEFAULT true,
    "hashtag_style" "HashtagStyle" NOT NULL DEFAULT 'MIXED',
    "preferred_hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "banned_hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cta_style" TEXT NOT NULL DEFAULT 'soft',
    "content_pillars" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_audience" JSONB,
    "buyer_personas" JSONB,
    "competitors" JSONB,
    "differentiators" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "brand_summary" TEXT,
    "brand_embedding" JSONB,
    "learnings" JSONB,
    "key_messages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "last_analyzed_at" TIMESTAMP(3),
    "summary_generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_brains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_audiences" (
    "id" TEXT NOT NULL,
    "brain_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "demographics" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "age_range" TEXT,
    "gender" TEXT,
    "location" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "income" TEXT,
    "education" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pain_points" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "values" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "challenges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "platforms" "SocialPlatform"[] DEFAULT ARRAY[]::"SocialPlatform"[],
    "buying_behavior" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_audiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_pillars" (
    "id" TEXT NOT NULL,
    "brain_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tone" "VoiceTone",
    "priority" INTEGER NOT NULL DEFAULT 1,
    "frequency" INTEGER NOT NULL DEFAULT 20,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "avg_engagement" DECIMAL(5,4),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_pillars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_competitors" (
    "id" TEXT NOT NULL,
    "brain_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "twitter_handle" TEXT,
    "linkedin_url" TEXT,
    "instagram_handle" TEXT,
    "facebook_url" TEXT,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "weaknesses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "differentiators" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "content_strategy" TEXT,
    "is_monitored" BOOLEAN NOT NULL DEFAULT false,
    "last_analyzed" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_competitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_learnings" (
    "id" TEXT NOT NULL,
    "brain_id" TEXT NOT NULL,
    "type" "LearningType" NOT NULL,
    "insight" TEXT NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    "source_data" JSONB,
    "platform" "SocialPlatform",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "applied_count" INTEGER NOT NULL DEFAULT 0,
    "success_rate" DECIMAL(5,4),
    "valid_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valid_until" TIMESTAMP(3),
    "is_expired" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_learnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_sources" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "type" "ContextSourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "status" "ContextSourceStatus" NOT NULL DEFAULT 'PENDING',
    "last_sync" TIMESTAMP(3),
    "sync_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "context_items" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "url" TEXT,
    "content_type" TEXT NOT NULL DEFAULT 'text',
    "importance" INTEGER NOT NULL DEFAULT 5,
    "is_evergreen" BOOLEAN NOT NULL DEFAULT false,
    "embedding" JSONB,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "used_in_posts" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "context_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_uploads" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "context_source_id" TEXT,
    "processed_at" TIMESTAMP(3),
    "pages_count" INTEGER,
    "word_count" INTEGER,
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_items" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_html" TEXT,
    "media_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "media_type" TEXT,
    "variations" JSONB,
    "content_type" "ContentType" NOT NULL DEFAULT 'POST',
    "category" TEXT,
    "generated_from" JSONB,
    "ai_model" TEXT,
    "ai_prompt" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_for" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "target_platforms" "SocialPlatform"[] DEFAULT ARRAY[]::"SocialPlatform"[],
    "triggered_by_voice" BOOLEAN NOT NULL DEFAULT false,
    "voice_agent_id" TEXT,
    "call_log_id" TEXT,
    "workflow_instance_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_results" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "account_id" TEXT NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'PENDING',
    "platform_post_id" TEXT,
    "post_url" TEXT,
    "error" TEXT,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "publish_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "autopilot_configs" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "approval_mode" "ApprovalMode" NOT NULL DEFAULT 'REVIEW',
    "veto_window_hours" INTEGER NOT NULL DEFAULT 2,
    "posts_per_week" INTEGER NOT NULL DEFAULT 7,
    "posting_days" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "posting_times_utc" TEXT[] DEFAULT ARRAY['14:00', '18:00']::TEXT[],
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "content_mix" JSONB NOT NULL DEFAULT '{"educational": 40, "promotional": 20, "engagement": 20, "news": 20}',
    "enabled_platforms" "SocialPlatform"[] DEFAULT ARRAY[]::"SocialPlatform"[],
    "platform_priority" JSONB,
    "generate_images" BOOLEAN NOT NULL DEFAULT true,
    "image_style" TEXT NOT NULL DEFAULT 'modern',
    "notify_on_generation" BOOLEAN NOT NULL DEFAULT true,
    "notify_on_publish" BOOLEAN NOT NULL DEFAULT true,
    "notify_email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "autopilot_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "platform_id" TEXT,
    "username" TEXT,
    "display_name" TEXT,
    "avatar" TEXT,
    "profile_url" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires" TIMESTAMP(3),
    "token_scope" TEXT,
    "token_type" TEXT,
    "refresh_expires_at" TIMESTAMP(3),
    "last_refreshed" TIMESTAMP(3),
    "refresh_attempts" INTEGER NOT NULL DEFAULT 0,
    "refresh_error" TEXT,
    "code_verifier" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "last_used" TIMESTAMP(3),
    "last_error" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "follower_count" INTEGER,
    "following_count" INTEGER,
    "post_count" INTEGER,
    "platform_data" JSONB,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_states" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "brand_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_verifier" TEXT,
    "redirect_url" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_analytics" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" DECIMAL(5,4),
    "video_views" INTEGER,
    "avg_watch_time" INTEGER,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_accounts" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "platform" "AdPlatform" NOT NULL,
    "account_id" TEXT,
    "account_name" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMP(3),
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "last_sync" TIMESTAMP(3),
    "sync_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_campaigns" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "ad_account_id" TEXT,
    "external_id" TEXT,
    "name" TEXT NOT NULL,
    "platform" "AdPlatform" NOT NULL,
    "objective" "CampaignObjective" NOT NULL DEFAULT 'LEAD_GENERATION',
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "daily_budget" DECIMAL(10,2),
    "total_budget" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "targeting" JSONB,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "leads" INTEGER NOT NULL DEFAULT 0,
    "spend" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ad_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "company" TEXT,
    "job_title" TEXT,
    "source" "LeadSource" NOT NULL DEFAULT 'MANUAL',
    "source_platform" TEXT,
    "campaign_id" TEXT,
    "utm_params" JSONB,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "score" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "custom_fields" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_agents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "brand_id" TEXT,
    "persona_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "agent_type" "AgentType" NOT NULL DEFAULT 'INBOUND',
    "system_prompt" TEXT,
    "custom_instructions" TEXT,
    "llm_provider" TEXT NOT NULL DEFAULT 'openai',
    "llm_model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "language" TEXT NOT NULL DEFAULT 'en-US',
    "stt_provider" TEXT NOT NULL DEFAULT 'deepgram',
    "stt_model" TEXT NOT NULL DEFAULT 'nova-2',
    "stt_language" TEXT NOT NULL DEFAULT 'en',
    "tts_provider" TEXT NOT NULL DEFAULT 'openai',
    "tts_model" TEXT,
    "tts_voice_id" TEXT,
    "voice_id" TEXT,
    "realtime_voice" TEXT NOT NULL DEFAULT 'alloy',
    "vad_enabled" BOOLEAN NOT NULL DEFAULT true,
    "vad_provider" TEXT NOT NULL DEFAULT 'silero',
    "turn_detection_model" TEXT NOT NULL DEFAULT 'multilingual',
    "noise_cancellation_enabled" BOOLEAN NOT NULL DEFAULT true,
    "noise_cancellation_type" TEXT NOT NULL DEFAULT 'BVC',
    "preemptive_generation" BOOLEAN NOT NULL DEFAULT false,
    "resume_false_interruption" BOOLEAN NOT NULL DEFAULT false,
    "false_interruption_timeout" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "min_interruption_duration" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "greeting_enabled" BOOLEAN NOT NULL DEFAULT true,
    "greeting_message" TEXT,
    "channels" JSONB NOT NULL DEFAULT '{}',
    "deployment_mode" TEXT NOT NULL DEFAULT 'production',
    "file_path" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "use_brand_voice" BOOLEAN NOT NULL DEFAULT true,
    "linked_brand_brain_id" TEXT,
    "source_channel" "ChannelType",
    "source_content_id" TEXT,

    CONSTRAINT "voice_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tools" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ToolType" NOT NULL DEFAULT 'WEBHOOK',
    "webhook_url" TEXT,
    "webhook_method" TEXT NOT NULL DEFAULT 'POST',
    "webhook_headers" JSONB NOT NULL DEFAULT '{}',
    "auth_type" TEXT,
    "auth_config" JSONB NOT NULL DEFAULT '{}',
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "required_params" JSONB NOT NULL DEFAULT '[]',
    "response_mapping" JSONB NOT NULL DEFAULT '{}',
    "timeout_ms" INTEGER NOT NULL DEFAULT 10000,
    "retry_count" INTEGER NOT NULL DEFAULT 1,
    "builtin_type" TEXT,
    "builtin_config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_tool_usages" (
    "id" TEXT NOT NULL,
    "tool_id" TEXT NOT NULL,
    "call_log_id" TEXT,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_ms" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "input_params" JSONB NOT NULL DEFAULT '{}',
    "response" JSONB,
    "error_message" TEXT,

    CONSTRAINT "agent_tool_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_groups" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "routing_strategy" "RoutingStrategy" NOT NULL DEFAULT 'ROUND_ROBIN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "max_concurrent" INTEGER NOT NULL DEFAULT 5,
    "skills" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_routing_rules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "group_id" TEXT,
    "target_agent_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "fallback_agent_id" TEXT,
    "fallback_group_id" TEXT,
    "fallback_action" TEXT NOT NULL DEFAULT 'voicemail',
    "announcement_message" TEXT,
    "hold_music" TEXT,
    "max_wait_seconds" INTEGER NOT NULL DEFAULT 300,
    "schedule_enabled" BOOLEAN NOT NULL DEFAULT false,
    "schedule" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_routing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_bases" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "embedding_model" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "chunk_size" INTEGER NOT NULL DEFAULT 1000,
    "chunk_overlap" INTEGER NOT NULL DEFAULT 200,
    "document_count" INTEGER NOT NULL DEFAULT 0,
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "total_tokens" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "knowledge_base_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "KnowledgeDocType" NOT NULL DEFAULT 'TEXT',
    "source_url" TEXT,
    "file_path" TEXT,
    "mime_type" TEXT,
    "content" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "error_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "character_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "knowledge_base_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "embedding" BYTEA,
    "embedding_model" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "token_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_knowledge_bases" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "knowledge_base_id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "max_chunks" INTEGER NOT NULL DEFAULT 5,
    "min_score" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_flows" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "start_node_id" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "viewport" JSONB NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_nodes" (
    "id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "type" "FlowNodeType" NOT NULL DEFAULT 'MESSAGE',
    "label" TEXT NOT NULL,
    "content" TEXT,
    "position_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flow_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flow_edges" (
    "id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
    "edge_id" TEXT NOT NULL,
    "source_node_id" TEXT NOT NULL,
    "target_node_id" TEXT NOT NULL,
    "source_handle" TEXT,
    "target_handle" TEXT,
    "type" "FlowEdgeType" NOT NULL DEFAULT 'DEFAULT',
    "condition" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    "animated" BOOLEAN NOT NULL DEFAULT false,
    "style" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flow_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_personas" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "instructions" TEXT NOT NULL,
    "personality_traits" JSONB,
    "tone" TEXT,
    "language_style" TEXT,
    "voice_config" JSONB,
    "capabilities" JSONB NOT NULL DEFAULT '["voice"]',
    "tools" JSONB NOT NULL DEFAULT '[]',
    "is_template" BOOLEAN NOT NULL DEFAULT false,
    "agent_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_personas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sip_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'magnus',
    "magnus_trunk_id" TEXT,
    "magnus_account_id" TEXT,
    "sip_url" TEXT NOT NULL,
    "sip_username" TEXT,
    "sip_password" TEXT,
    "sip_transport" TEXT NOT NULL DEFAULT 'tcp',
    "inbound_enabled" BOOLEAN NOT NULL DEFAULT true,
    "outbound_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "last_checked" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sip_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_mappings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "sip_config_id" TEXT,
    "phone_number" TEXT NOT NULL,
    "country_code" TEXT,
    "area_code" TEXT,
    "magnus_did_id" TEXT,
    "magnus_status" TEXT,
    "livekit_trunk_id" TEXT,
    "livekit_outbound_trunk_id" TEXT,
    "livekit_dispatch_rule_id" TEXT,
    "routing_type" TEXT NOT NULL DEFAULT 'agent',
    "forward_to" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phone_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "phone_mapping_id" TEXT,
    "campaign_id" TEXT,
    "livekit_room_name" TEXT,
    "livekit_room_sid" TEXT,
    "sip_call_id" TEXT,
    "direction" "CallDirection" NOT NULL DEFAULT 'INBOUND',
    "phone_number" TEXT,
    "caller_number" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "duration" INTEGER,
    "status" "CallStatus" NOT NULL DEFAULT 'ACTIVE',
    "outcome" "CallOutcome",
    "recording_url" TEXT,
    "transcript_id" TEXT,
    "cost" DECIMAL(10,4),
    "cost_currency" TEXT NOT NULL DEFAULT 'USD',
    "magnus_cdr_id" TEXT,
    "metadata" JSONB,
    "triggered_by_social" BOOLEAN NOT NULL DEFAULT false,
    "social_post_id" TEXT,
    "workflow_instance_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_events" (
    "id" TEXT NOT NULL,
    "call_log_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "participant_id" TEXT,
    "participant_sid" TEXT,
    "raw_payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_transcripts" (
    "id" TEXT NOT NULL,
    "call_log_id" TEXT NOT NULL,
    "language" TEXT,
    "duration" DOUBLE PRECISION,
    "segment_count" INTEGER NOT NULL DEFAULT 0,
    "sentiment" TEXT,
    "summary" TEXT,
    "keywords" JSONB,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "call_transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_segments" (
    "id" TEXT NOT NULL,
    "transcript_id" TEXT NOT NULL,
    "sequence_number" INTEGER NOT NULL,
    "speaker" TEXT NOT NULL,
    "speaker_id" TEXT,
    "start_time" DOUBLE PRECISION NOT NULL,
    "end_time" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "language" TEXT,
    "is_final" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcript_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_campaigns" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CampaignVoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "call_window_start" TEXT,
    "call_window_end" TEXT,
    "call_days" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "max_concurrent_calls" INTEGER NOT NULL DEFAULT 1,
    "calls_per_hour" INTEGER NOT NULL DEFAULT 30,
    "retry_attempts" INTEGER NOT NULL DEFAULT 2,
    "retry_delay_minutes" INTEGER NOT NULL DEFAULT 60,
    "total_leads" INTEGER NOT NULL DEFAULT 0,
    "called_count" INTEGER NOT NULL DEFAULT 0,
    "answered_count" INTEGER NOT NULL DEFAULT 0,
    "converted_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_leads" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "company" TEXT,
    "custom_fields" JSONB,
    "status" "CampaignLeadStatus" NOT NULL DEFAULT 'PENDING',
    "call_attempts" INTEGER NOT NULL DEFAULT 0,
    "last_called_at" TIMESTAMP(3),
    "next_call_at" TIMESTAMP(3),
    "outcome" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "stripe_price_id" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "status" TEXT NOT NULL DEFAULT 'active',
    "brands_limit" INTEGER NOT NULL DEFAULT 1,
    "posts_per_month" INTEGER NOT NULL DEFAULT 30,
    "social_accounts" INTEGER NOT NULL DEFAULT 3,
    "social_accounts_limit" INTEGER NOT NULL DEFAULT 3,
    "users_limit" INTEGER NOT NULL DEFAULT 1,
    "voice_minutes_limit" INTEGER NOT NULL DEFAULT 100,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "posts_generated" INTEGER NOT NULL DEFAULT 0,
    "posts_published" INTEGER NOT NULL DEFAULT 0,
    "images_generated" INTEGER NOT NULL DEFAULT 0,
    "videos_generated" INTEGER NOT NULL DEFAULT 0,
    "video_cost_cents" INTEGER NOT NULL DEFAULT 0,
    "ai_tokens_used" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "brand_id" TEXT,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "result" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_history" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "learnings" JSONB NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_variations" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "text" TEXT NOT NULL,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "media_prompt" TEXT,
    "media_url" TEXT,
    "character_count" INTEGER NOT NULL DEFAULT 0,
    "is_optimal" BOOLEAN NOT NULL DEFAULT true,
    "status" "VariationStatus" NOT NULL DEFAULT 'PENDING',
    "account_id" TEXT,
    "post_id" TEXT,
    "post_url" TEXT,
    "published_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_variations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_templates" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "prompt_template" TEXT NOT NULL,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "example_output" TEXT,
    "platforms" "SocialPlatform"[] DEFAULT ARRAY[]::"SocialPlatform"[],
    "times_used" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishing_schedules" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "active_days" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
    "posting_times" TEXT[] DEFAULT ARRAY['09:00', '12:00', '17:00']::TEXT[],
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "max_posts_per_day" INTEGER NOT NULL DEFAULT 3,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publishing_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishing_logs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "variation_id" TEXT,
    "content_id" TEXT,
    "platform" "SocialPlatform" NOT NULL,
    "account_id" TEXT,
    "status" "PublishingStatus" NOT NULL,
    "platform_post_id" TEXT,
    "platform_url" TEXT,
    "error_code" TEXT,
    "error_message" TEXT,
    "scheduled_for" TIMESTAMP(3),
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "next_retry_at" TIMESTAMP(3),

    CONSTRAINT "publishing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_analytics" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "variation_id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "account_id" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "engagements" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "video_views" INTEGER,
    "video_watch_time" INTEGER,
    "profile_visits" INTEGER NOT NULL DEFAULT 0,
    "new_followers" INTEGER NOT NULL DEFAULT 0,
    "content_length" INTEGER,
    "has_media" BOOLEAN NOT NULL DEFAULT false,
    "has_hashtags" BOOLEAN NOT NULL DEFAULT false,
    "hashtag_count" INTEGER NOT NULL DEFAULT 0,
    "has_emojis" BOOLEAN NOT NULL DEFAULT false,
    "has_links" BOOLEAN NOT NULL DEFAULT false,
    "has_question" BOOLEAN NOT NULL DEFAULT false,
    "has_cta" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3) NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "hour_of_day" INTEGER NOT NULL,
    "last_fetched" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fetch_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "period_type" "AnalyticsPeriod" NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "platform" "SocialPlatform",
    "total_posts" INTEGER NOT NULL DEFAULT 0,
    "total_impressions" INTEGER NOT NULL DEFAULT 0,
    "total_engagements" INTEGER NOT NULL DEFAULT 0,
    "total_followers" INTEGER NOT NULL DEFAULT 0,
    "follower_growth" INTEGER NOT NULL DEFAULT 0,
    "avg_engagement_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_impressions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_engagements" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "top_post_id" TEXT,
    "top_hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "best_day_of_week" INTEGER,
    "best_hour_of_day" INTEGER,
    "posts_with_media" INTEGER NOT NULL DEFAULT 0,
    "posts_with_hashtags" INTEGER NOT NULL DEFAULT 0,
    "posts_with_links" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "config_name" TEXT NOT NULL,
    "deepgram_nova2_per_min" DECIMAL(10,6) NOT NULL DEFAULT 0.08,
    "deepgram_whisper_per_min" DECIMAL(10,6) NOT NULL DEFAULT 0.08,
    "assemblyai_per_min" DECIMAL(10,6) NOT NULL DEFAULT 0.05,
    "openai_gpt4o_mini_input_per_1m" DECIMAL(10,6) NOT NULL DEFAULT 15.00,
    "openai_gpt4o_mini_output_per_1m" DECIMAL(10,6) NOT NULL DEFAULT 60.00,
    "openai_gpt4_input_per_1m" DECIMAL(10,6) NOT NULL DEFAULT 30.00,
    "openai_gpt4_output_per_1m" DECIMAL(10,6) NOT NULL DEFAULT 60.00,
    "anthropic_claude_input_per_1m" DECIMAL(10,6) NOT NULL DEFAULT 3.00,
    "anthropic_claude_output_per_1m" DECIMAL(10,6) NOT NULL DEFAULT 15.00,
    "openai_tts_per_1m_chars" DECIMAL(10,6) NOT NULL DEFAULT 15.00,
    "cartesia_per_audio_min" DECIMAL(10,6) NOT NULL DEFAULT 1.50,
    "elevenlabs_per_1k_chars" DECIMAL(10,6) NOT NULL DEFAULT 0.18,
    "inbound_per_minute" DECIMAL(10,6) NOT NULL DEFAULT 0.001,
    "outbound_per_minute" DECIMAL(10,6) NOT NULL DEFAULT 0.002,
    "did_monthly" DECIMAL(10,6) NOT NULL DEFAULT 2.00,
    "platform_overhead_per_min" DECIMAL(10,6) NOT NULL DEFAULT 0.01,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "effective_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_cost_breakdowns" (
    "id" TEXT NOT NULL,
    "call_log_id" TEXT NOT NULL,
    "stt_provider" TEXT NOT NULL,
    "stt_model" TEXT NOT NULL,
    "stt_minutes" DECIMAL(10,4) NOT NULL,
    "stt_cost" DECIMAL(10,6) NOT NULL,
    "llm_provider" TEXT NOT NULL,
    "llm_model" TEXT NOT NULL,
    "llm_input_tokens" INTEGER NOT NULL,
    "llm_output_tokens" INTEGER NOT NULL,
    "llm_cost" DECIMAL(10,6) NOT NULL,
    "tts_provider" TEXT NOT NULL,
    "tts_model" TEXT,
    "tts_characters" INTEGER NOT NULL,
    "tts_audio_seconds" DECIMAL(10,4),
    "tts_cost" DECIMAL(10,6) NOT NULL,
    "telephony_direction" TEXT NOT NULL,
    "telephony_minutes" DECIMAL(10,4) NOT NULL,
    "telephony_cost" DECIMAL(10,6) NOT NULL,
    "platform_cost" DECIMAL(10,6) NOT NULL,
    "total_real_cost" DECIMAL(10,6) NOT NULL,
    "total_customer_cost" DECIMAL(10,6) NOT NULL,
    "pricing_config_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_cost_breakdowns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_usage_records" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "period_type" TEXT NOT NULL,
    "total_calls" INTEGER NOT NULL DEFAULT 0,
    "total_minutes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stt_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "llm_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tts_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "telephony_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "inbound_calls" INTEGER NOT NULL DEFAULT 0,
    "outbound_calls" INTEGER NOT NULL DEFAULT 0,
    "inbound_minutes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "outbound_minutes" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "is_encrypted" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_touchpoints" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "brand_id" TEXT,
    "journey_id" TEXT,
    "customer_id" TEXT,
    "anonymous_id" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "channel_type" "ChannelType" NOT NULL,
    "channel_name" TEXT,
    "channel_id" TEXT,
    "action" "TouchpointAction" NOT NULL,
    "action_detail" TEXT,
    "source_type" TEXT,
    "source_id" TEXT,
    "source_url" TEXT,
    "source_title" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "referrer" TEXT,
    "engagement_score" INTEGER NOT NULL DEFAULT 0,
    "estimated_value" DECIMAL(10,2),
    "device_type" TEXT,
    "session_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_touchpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_journeys" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "brand_id" TEXT,
    "lead_id" TEXT,
    "customer_id" TEXT,
    "anonymous_id" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "full_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "is_converted" BOOLEAN NOT NULL DEFAULT false,
    "conversion_value" DECIMAL(10,2),
    "converted_at" TIMESTAMP(3),
    "total_touchpoints" INTEGER NOT NULL DEFAULT 0,
    "unique_channels" INTEGER NOT NULL DEFAULT 0,
    "first_touch_channel" "ChannelType",
    "first_touch_at" TIMESTAMP(3),
    "last_touch_channel" "ChannelType",
    "last_touch_at" TIMESTAMP(3),
    "channel_breakdown" JSONB,
    "attribution_scores" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_journeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_channel_conversions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "brand_id" TEXT,
    "journey_id" TEXT NOT NULL,
    "conversion_type" TEXT NOT NULL,
    "conversion_value" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source_type" TEXT,
    "source_id" TEXT,
    "attribution_model" "AttributionModel" NOT NULL DEFAULT 'LINEAR',
    "channel_attribution" JSONB NOT NULL,
    "touchpoint_attribution" JSONB NOT NULL,
    "brand_brain_contribution" BOOLEAN NOT NULL DEFAULT true,
    "converted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cross_channel_conversions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_performance_snapshots" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "brand_id" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "period_type" TEXT NOT NULL,
    "channel_type" "ChannelType" NOT NULL,
    "channel_name" TEXT,
    "total_touchpoints" INTEGER NOT NULL DEFAULT 0,
    "unique_customers" INTEGER NOT NULL DEFAULT 0,
    "new_customers" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "engagements" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "form_submissions" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "first_touch_conversions" INTEGER NOT NULL DEFAULT 0,
    "last_touch_conversions" INTEGER NOT NULL DEFAULT 0,
    "linear_conversions" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "first_touch_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "last_touch_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "linear_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "assisted_conversions" INTEGER NOT NULL DEFAULT 0,
    "influenced_revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_spend" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cost_per_conversion" DECIMAL(10,2),
    "roas" DECIMAL(8,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_performance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "brand_id" TEXT,
    "channel_type" "ChannelType" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_configured" BOOLEAN NOT NULL DEFAULT false,
    "use_brand_brain" BOOLEAN NOT NULL DEFAULT true,
    "brand_brain_id" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "attribution_weight" DECIMAL(3,2) NOT NULL DEFAULT 1,
    "enabled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "brand_id" TEXT,
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "WorkflowCategory" NOT NULL,
    "trigger" "WorkflowTrigger" NOT NULL,
    "trigger_config" JSONB NOT NULL DEFAULT '{}',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "entry_step_id" TEXT NOT NULL,
    "channels" "ChannelType"[],
    "requires_brand_brain" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "total_runs" INTEGER NOT NULL DEFAULT 0,
    "successful_runs" INTEGER NOT NULL DEFAULT 0,
    "failed_runs" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "automation_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "brand_id" TEXT,
    "lead_id" TEXT,
    "customer_id" TEXT,
    "journey_id" TEXT,
    "call_log_id" TEXT,
    "content_item_id" TEXT,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
    "current_step_id" TEXT NOT NULL,
    "completed_steps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "context" JSONB NOT NULL DEFAULT '{}',
    "results" JSONB NOT NULL DEFAULT '{}',
    "errors" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_next_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "touchpoints_created" INTEGER NOT NULL DEFAULT 0,
    "channels_used" "ChannelType"[] DEFAULT ARRAY[]::"ChannelType"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_step_executions" (
    "id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "step_id" TEXT NOT NULL,
    "action" "WorkflowAction" NOT NULL,
    "channel" "ChannelType",
    "success" BOOLEAN NOT NULL,
    "output" JSONB NOT NULL DEFAULT '{}',
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "touchpoint_id" TEXT,
    "content_item_id" TEXT,
    "call_log_id" TEXT,
    "next_step_id" TEXT,
    "executed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_step_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "flywheel_progress_user_id_key" ON "flywheel_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_onboarding_progress_user_id_key" ON "user_onboarding_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_discovery_state_user_id_feature_key" ON "feature_discovery_state"("user_id", "feature");

-- CreateIndex
CREATE INDEX "user_unlocks_feature_id_idx" ON "user_unlocks"("feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_unlocks_user_id_feature_id_key" ON "user_unlocks"("user_id", "feature_id");

-- CreateIndex
CREATE INDEX "user_features_feature_id_idx" ON "user_features"("feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_features_user_id_feature_id_key" ON "user_features"("user_id", "feature_id");

-- CreateIndex
CREATE UNIQUE INDEX "demo_mode_data_user_id_key" ON "demo_mode_data"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_stripe_customer_id_key" ON "organizations"("stripe_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_id_organization_id_key" ON "memberships"("user_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "brands_organization_id_slug_key" ON "brands"("organization_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "brand_brains_brand_id_key" ON "brand_brains"("brand_id");

-- CreateIndex
CREATE INDEX "brand_audiences_brain_id_idx" ON "brand_audiences"("brain_id");

-- CreateIndex
CREATE INDEX "content_pillars_brain_id_idx" ON "content_pillars"("brain_id");

-- CreateIndex
CREATE INDEX "brand_competitors_brain_id_idx" ON "brand_competitors"("brain_id");

-- CreateIndex
CREATE INDEX "brand_learnings_brain_id_idx" ON "brand_learnings"("brain_id");

-- CreateIndex
CREATE INDEX "brand_learnings_type_idx" ON "brand_learnings"("type");

-- CreateIndex
CREATE INDEX "context_sources_brand_id_idx" ON "context_sources"("brand_id");

-- CreateIndex
CREATE INDEX "context_items_source_id_idx" ON "context_items"("source_id");

-- CreateIndex
CREATE INDEX "context_items_content_type_idx" ON "context_items"("content_type");

-- CreateIndex
CREATE UNIQUE INDEX "document_uploads_context_source_id_key" ON "document_uploads"("context_source_id");

-- CreateIndex
CREATE INDEX "document_uploads_brand_id_idx" ON "document_uploads"("brand_id");

-- CreateIndex
CREATE INDEX "document_uploads_status_idx" ON "document_uploads"("status");

-- CreateIndex
CREATE INDEX "content_items_brand_id_idx" ON "content_items"("brand_id");

-- CreateIndex
CREATE INDEX "content_items_status_idx" ON "content_items"("status");

-- CreateIndex
CREATE INDEX "content_items_scheduled_for_idx" ON "content_items"("scheduled_for");

-- CreateIndex
CREATE INDEX "content_items_workflow_instance_id_idx" ON "content_items"("workflow_instance_id");

-- CreateIndex
CREATE INDEX "publish_results_content_id_idx" ON "publish_results"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "autopilot_configs_brand_id_key" ON "autopilot_configs"("brand_id");

-- CreateIndex
CREATE INDEX "social_accounts_brand_id_idx" ON "social_accounts"("brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_brand_id_platform_platform_id_key" ON "social_accounts"("brand_id", "platform", "platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_states_state_key" ON "oauth_states"("state");

-- CreateIndex
CREATE INDEX "oauth_states_state_idx" ON "oauth_states"("state");

-- CreateIndex
CREATE INDEX "oauth_states_expires_at_idx" ON "oauth_states"("expires_at");

-- CreateIndex
CREATE INDEX "content_analytics_brand_id_idx" ON "content_analytics"("brand_id");

-- CreateIndex
CREATE INDEX "content_analytics_content_id_idx" ON "content_analytics"("content_id");

-- CreateIndex
CREATE INDEX "ad_accounts_brand_id_idx" ON "ad_accounts"("brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "ad_accounts_brand_id_platform_account_id_key" ON "ad_accounts"("brand_id", "platform", "account_id");

-- CreateIndex
CREATE INDEX "ad_campaigns_brand_id_idx" ON "ad_campaigns"("brand_id");

-- CreateIndex
CREATE INDEX "leads_brand_id_idx" ON "leads"("brand_id");

-- CreateIndex
CREATE INDEX "leads_organization_id_idx" ON "leads"("organization_id");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "voice_agents_organization_id_idx" ON "voice_agents"("organization_id");

-- CreateIndex
CREATE INDEX "voice_agents_brand_id_idx" ON "voice_agents"("brand_id");

-- CreateIndex
CREATE INDEX "agent_tools_agent_id_idx" ON "agent_tools"("agent_id");

-- CreateIndex
CREATE INDEX "agent_tools_organization_id_idx" ON "agent_tools"("organization_id");

-- CreateIndex
CREATE INDEX "agent_tool_usages_tool_id_idx" ON "agent_tool_usages"("tool_id");

-- CreateIndex
CREATE INDEX "agent_tool_usages_call_log_id_idx" ON "agent_tool_usages"("call_log_id");

-- CreateIndex
CREATE INDEX "agent_groups_organization_id_idx" ON "agent_groups"("organization_id");

-- CreateIndex
CREATE INDEX "agent_group_members_group_id_idx" ON "agent_group_members"("group_id");

-- CreateIndex
CREATE INDEX "agent_group_members_agent_id_idx" ON "agent_group_members"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_group_members_group_id_agent_id_key" ON "agent_group_members"("group_id", "agent_id");

-- CreateIndex
CREATE INDEX "agent_routing_rules_organization_id_idx" ON "agent_routing_rules"("organization_id");

-- CreateIndex
CREATE INDEX "agent_routing_rules_group_id_idx" ON "agent_routing_rules"("group_id");

-- CreateIndex
CREATE INDEX "agent_routing_rules_priority_idx" ON "agent_routing_rules"("priority");

-- CreateIndex
CREATE INDEX "knowledge_bases_organization_id_idx" ON "knowledge_bases"("organization_id");

-- CreateIndex
CREATE INDEX "knowledge_documents_knowledge_base_id_idx" ON "knowledge_documents"("knowledge_base_id");

-- CreateIndex
CREATE INDEX "knowledge_documents_status_idx" ON "knowledge_documents"("status");

-- CreateIndex
CREATE INDEX "knowledge_chunks_knowledge_base_id_idx" ON "knowledge_chunks"("knowledge_base_id");

-- CreateIndex
CREATE INDEX "knowledge_chunks_document_id_idx" ON "knowledge_chunks"("document_id");

-- CreateIndex
CREATE INDEX "agent_knowledge_bases_agent_id_idx" ON "agent_knowledge_bases"("agent_id");

-- CreateIndex
CREATE INDEX "agent_knowledge_bases_knowledge_base_id_idx" ON "agent_knowledge_bases"("knowledge_base_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_knowledge_bases_agent_id_knowledge_base_id_key" ON "agent_knowledge_bases"("agent_id", "knowledge_base_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_flows_agent_id_key" ON "conversation_flows"("agent_id");

-- CreateIndex
CREATE INDEX "conversation_flows_organization_id_idx" ON "conversation_flows"("organization_id");

-- CreateIndex
CREATE INDEX "conversation_flows_agent_id_idx" ON "conversation_flows"("agent_id");

-- CreateIndex
CREATE INDEX "flow_nodes_flow_id_idx" ON "flow_nodes"("flow_id");

-- CreateIndex
CREATE UNIQUE INDEX "flow_nodes_flow_id_node_id_key" ON "flow_nodes"("flow_id", "node_id");

-- CreateIndex
CREATE INDEX "flow_edges_flow_id_idx" ON "flow_edges"("flow_id");

-- CreateIndex
CREATE INDEX "flow_edges_flow_id_source_node_id_idx" ON "flow_edges"("flow_id", "source_node_id");

-- CreateIndex
CREATE INDEX "flow_edges_flow_id_target_node_id_idx" ON "flow_edges"("flow_id", "target_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "flow_edges_flow_id_edge_id_key" ON "flow_edges"("flow_id", "edge_id");

-- CreateIndex
CREATE INDEX "voice_personas_organization_id_idx" ON "voice_personas"("organization_id");

-- CreateIndex
CREATE INDEX "sip_configs_organization_id_idx" ON "sip_configs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "phone_mappings_phone_number_key" ON "phone_mappings"("phone_number");

-- CreateIndex
CREATE INDEX "phone_mappings_organization_id_idx" ON "phone_mappings"("organization_id");

-- CreateIndex
CREATE INDEX "phone_mappings_phone_number_idx" ON "phone_mappings"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "call_logs_livekit_room_sid_key" ON "call_logs"("livekit_room_sid");

-- CreateIndex
CREATE INDEX "call_logs_organization_id_idx" ON "call_logs"("organization_id");

-- CreateIndex
CREATE INDEX "call_logs_agent_id_idx" ON "call_logs"("agent_id");

-- CreateIndex
CREATE INDEX "call_logs_started_at_idx" ON "call_logs"("started_at");

-- CreateIndex
CREATE INDEX "call_logs_workflow_instance_id_idx" ON "call_logs"("workflow_instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "call_events_event_id_key" ON "call_events"("event_id");

-- CreateIndex
CREATE INDEX "call_events_call_log_id_idx" ON "call_events"("call_log_id");

-- CreateIndex
CREATE UNIQUE INDEX "call_transcripts_call_log_id_key" ON "call_transcripts"("call_log_id");

-- CreateIndex
CREATE INDEX "transcript_segments_transcript_id_idx" ON "transcript_segments"("transcript_id");

-- CreateIndex
CREATE INDEX "voice_campaigns_organization_id_idx" ON "voice_campaigns"("organization_id");

-- CreateIndex
CREATE INDEX "voice_campaigns_status_idx" ON "voice_campaigns"("status");

-- CreateIndex
CREATE INDEX "campaign_leads_campaign_id_idx" ON "campaign_leads"("campaign_id");

-- CreateIndex
CREATE INDEX "campaign_leads_status_idx" ON "campaign_leads"("status");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE UNIQUE INDEX "usage_organization_id_period_start_key" ON "usage"("organization_id", "period_start");

-- CreateIndex
CREATE INDEX "jobs_status_run_at_idx" ON "jobs"("status", "run_at");

-- CreateIndex
CREATE INDEX "jobs_type_idx" ON "jobs"("type");

-- CreateIndex
CREATE INDEX "learning_history_brand_id_idx" ON "learning_history"("brand_id");

-- CreateIndex
CREATE INDEX "content_variations_content_id_idx" ON "content_variations"("content_id");

-- CreateIndex
CREATE INDEX "content_variations_content_id_platform_idx" ON "content_variations"("content_id", "platform");

-- CreateIndex
CREATE INDEX "content_variations_account_id_idx" ON "content_variations"("account_id");

-- CreateIndex
CREATE INDEX "content_templates_brand_id_idx" ON "content_templates"("brand_id");

-- CreateIndex
CREATE INDEX "content_templates_brand_id_category_idx" ON "content_templates"("brand_id", "category");

-- CreateIndex
CREATE INDEX "publishing_schedules_org_id_idx" ON "publishing_schedules"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "publishing_schedules_org_id_platform_key" ON "publishing_schedules"("org_id", "platform");

-- CreateIndex
CREATE INDEX "publishing_logs_org_id_attempted_at_idx" ON "publishing_logs"("org_id", "attempted_at");

-- CreateIndex
CREATE INDEX "publishing_logs_org_id_status_idx" ON "publishing_logs"("org_id", "status");

-- CreateIndex
CREATE INDEX "publishing_logs_variation_id_idx" ON "publishing_logs"("variation_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_analytics_variation_id_key" ON "post_analytics"("variation_id");

-- CreateIndex
CREATE INDEX "post_analytics_org_id_idx" ON "post_analytics"("org_id");

-- CreateIndex
CREATE INDEX "post_analytics_org_id_platform_idx" ON "post_analytics"("org_id", "platform");

-- CreateIndex
CREATE INDEX "post_analytics_org_id_published_at_idx" ON "post_analytics"("org_id", "published_at");

-- CreateIndex
CREATE INDEX "post_analytics_account_id_idx" ON "post_analytics"("account_id");

-- CreateIndex
CREATE INDEX "analytics_snapshots_org_id_idx" ON "analytics_snapshots"("org_id");

-- CreateIndex
CREATE INDEX "analytics_snapshots_org_id_period_type_idx" ON "analytics_snapshots"("org_id", "period_type");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_snapshots_org_id_period_type_period_start_platfor_key" ON "analytics_snapshots"("org_id", "period_type", "period_start", "platform");

-- CreateIndex
CREATE INDEX "pricing_configs_organization_id_idx" ON "pricing_configs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_configs_organization_id_config_name_key" ON "pricing_configs"("organization_id", "config_name");

-- CreateIndex
CREATE UNIQUE INDEX "call_cost_breakdowns_call_log_id_key" ON "call_cost_breakdowns"("call_log_id");

-- CreateIndex
CREATE INDEX "voice_usage_records_organization_id_idx" ON "voice_usage_records"("organization_id");

-- CreateIndex
CREATE INDEX "voice_usage_records_period_start_idx" ON "voice_usage_records"("period_start");

-- CreateIndex
CREATE UNIQUE INDEX "voice_usage_records_organization_id_period_start_period_typ_key" ON "voice_usage_records"("organization_id", "period_start", "period_type");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex
CREATE INDEX "system_configs_category_idx" ON "system_configs"("category");

-- CreateIndex
CREATE INDEX "admin_audit_logs_user_id_idx" ON "admin_audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_resource_idx" ON "admin_audit_logs"("resource");

-- CreateIndex
CREATE INDEX "admin_audit_logs_created_at_idx" ON "admin_audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "customer_touchpoints_organization_id_idx" ON "customer_touchpoints"("organization_id");

-- CreateIndex
CREATE INDEX "customer_touchpoints_brand_id_idx" ON "customer_touchpoints"("brand_id");

-- CreateIndex
CREATE INDEX "customer_touchpoints_journey_id_idx" ON "customer_touchpoints"("journey_id");

-- CreateIndex
CREATE INDEX "customer_touchpoints_customer_id_idx" ON "customer_touchpoints"("customer_id");

-- CreateIndex
CREATE INDEX "customer_touchpoints_anonymous_id_idx" ON "customer_touchpoints"("anonymous_id");

-- CreateIndex
CREATE INDEX "customer_touchpoints_email_idx" ON "customer_touchpoints"("email");

-- CreateIndex
CREATE INDEX "customer_touchpoints_phone_idx" ON "customer_touchpoints"("phone");

-- CreateIndex
CREATE INDEX "customer_touchpoints_channel_type_idx" ON "customer_touchpoints"("channel_type");

-- CreateIndex
CREATE INDEX "customer_touchpoints_occurred_at_idx" ON "customer_touchpoints"("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_journeys_lead_id_key" ON "customer_journeys"("lead_id");

-- CreateIndex
CREATE INDEX "customer_journeys_organization_id_idx" ON "customer_journeys"("organization_id");

-- CreateIndex
CREATE INDEX "customer_journeys_brand_id_idx" ON "customer_journeys"("brand_id");

-- CreateIndex
CREATE INDEX "customer_journeys_customer_id_idx" ON "customer_journeys"("customer_id");

-- CreateIndex
CREATE INDEX "customer_journeys_email_idx" ON "customer_journeys"("email");

-- CreateIndex
CREATE INDEX "customer_journeys_phone_idx" ON "customer_journeys"("phone");

-- CreateIndex
CREATE INDEX "customer_journeys_status_idx" ON "customer_journeys"("status");

-- CreateIndex
CREATE INDEX "customer_journeys_is_converted_idx" ON "customer_journeys"("is_converted");

-- CreateIndex
CREATE INDEX "cross_channel_conversions_organization_id_idx" ON "cross_channel_conversions"("organization_id");

-- CreateIndex
CREATE INDEX "cross_channel_conversions_brand_id_idx" ON "cross_channel_conversions"("brand_id");

-- CreateIndex
CREATE INDEX "cross_channel_conversions_journey_id_idx" ON "cross_channel_conversions"("journey_id");

-- CreateIndex
CREATE INDEX "cross_channel_conversions_conversion_type_idx" ON "cross_channel_conversions"("conversion_type");

-- CreateIndex
CREATE INDEX "cross_channel_conversions_converted_at_idx" ON "cross_channel_conversions"("converted_at");

-- CreateIndex
CREATE INDEX "channel_performance_snapshots_organization_id_idx" ON "channel_performance_snapshots"("organization_id");

-- CreateIndex
CREATE INDEX "channel_performance_snapshots_brand_id_idx" ON "channel_performance_snapshots"("brand_id");

-- CreateIndex
CREATE INDEX "channel_performance_snapshots_channel_type_idx" ON "channel_performance_snapshots"("channel_type");

-- CreateIndex
CREATE INDEX "channel_performance_snapshots_period_start_idx" ON "channel_performance_snapshots"("period_start");

-- CreateIndex
CREATE UNIQUE INDEX "channel_performance_snapshots_organization_id_brand_id_chan_key" ON "channel_performance_snapshots"("organization_id", "brand_id", "channel_type", "period_start", "period_type");

-- CreateIndex
CREATE INDEX "channel_configs_organization_id_idx" ON "channel_configs"("organization_id");

-- CreateIndex
CREATE INDEX "channel_configs_brand_id_idx" ON "channel_configs"("brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_configs_organization_id_brand_id_channel_type_key" ON "channel_configs"("organization_id", "brand_id", "channel_type");

-- CreateIndex
CREATE INDEX "automations_organization_id_idx" ON "automations"("organization_id");

-- CreateIndex
CREATE INDEX "automations_brand_id_idx" ON "automations"("brand_id");

-- CreateIndex
CREATE INDEX "automations_is_active_idx" ON "automations"("is_active");

-- CreateIndex
CREATE INDEX "workflow_instances_automation_id_idx" ON "workflow_instances"("automation_id");

-- CreateIndex
CREATE INDEX "workflow_instances_organization_id_idx" ON "workflow_instances"("organization_id");

-- CreateIndex
CREATE INDEX "workflow_instances_status_idx" ON "workflow_instances"("status");

-- CreateIndex
CREATE INDEX "workflow_step_executions_instance_id_idx" ON "workflow_step_executions"("instance_id");

-- AddForeignKey
ALTER TABLE "flywheel_progress" ADD CONSTRAINT "flywheel_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_onboarding_progress" ADD CONSTRAINT "user_onboarding_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wizard_sessions" ADD CONSTRAINT "wizard_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_discovery_state" ADD CONSTRAINT "feature_discovery_state_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_unlocks" ADD CONSTRAINT "user_unlocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_features" ADD CONSTRAINT "user_features_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_features" ADD CONSTRAINT "user_features_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demo_mode_data" ADD CONSTRAINT "demo_mode_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_brains" ADD CONSTRAINT "brand_brains_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_audiences" ADD CONSTRAINT "brand_audiences_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "brand_brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_pillars" ADD CONSTRAINT "content_pillars_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "brand_brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_competitors" ADD CONSTRAINT "brand_competitors_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "brand_brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_learnings" ADD CONSTRAINT "brand_learnings_brain_id_fkey" FOREIGN KEY ("brain_id") REFERENCES "brand_brains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_sources" ADD CONSTRAINT "context_sources_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "context_items" ADD CONSTRAINT "context_items_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "context_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_context_source_id_fkey" FOREIGN KEY ("context_source_id") REFERENCES "context_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_results" ADD CONSTRAINT "publish_results_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "autopilot_configs" ADD CONSTRAINT "autopilot_configs_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_analytics" ADD CONSTRAINT "content_analytics_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_analytics" ADD CONSTRAINT "content_analytics_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_accounts" ADD CONSTRAINT "ad_accounts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_campaigns" ADD CONSTRAINT "ad_campaigns_ad_account_id_fkey" FOREIGN KEY ("ad_account_id") REFERENCES "ad_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ad_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_agents" ADD CONSTRAINT "voice_agents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_agents" ADD CONSTRAINT "voice_agents_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "voice_personas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tools" ADD CONSTRAINT "agent_tools_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "voice_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tool_usages" ADD CONSTRAINT "agent_tool_usages_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "agent_tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_tool_usages" ADD CONSTRAINT "agent_tool_usages_call_log_id_fkey" FOREIGN KEY ("call_log_id") REFERENCES "call_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_groups" ADD CONSTRAINT "agent_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_group_members" ADD CONSTRAINT "agent_group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "agent_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_routing_rules" ADD CONSTRAINT "agent_routing_rules_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_routing_rules" ADD CONSTRAINT "agent_routing_rules_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "agent_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_bases" ADD CONSTRAINT "knowledge_bases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_knowledge_bases" ADD CONSTRAINT "agent_knowledge_bases_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "voice_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_knowledge_bases" ADD CONSTRAINT "agent_knowledge_bases_knowledge_base_id_fkey" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_flows" ADD CONSTRAINT "conversation_flows_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_flows" ADD CONSTRAINT "conversation_flows_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "voice_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_nodes" ADD CONSTRAINT "flow_nodes_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "conversation_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_edges" ADD CONSTRAINT "flow_edges_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "conversation_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_edges" ADD CONSTRAINT "flow_edges_flow_id_source_node_id_fkey" FOREIGN KEY ("flow_id", "source_node_id") REFERENCES "flow_nodes"("flow_id", "node_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flow_edges" ADD CONSTRAINT "flow_edges_flow_id_target_node_id_fkey" FOREIGN KEY ("flow_id", "target_node_id") REFERENCES "flow_nodes"("flow_id", "node_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_personas" ADD CONSTRAINT "voice_personas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sip_configs" ADD CONSTRAINT "sip_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_mappings" ADD CONSTRAINT "phone_mappings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_mappings" ADD CONSTRAINT "phone_mappings_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "voice_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_mappings" ADD CONSTRAINT "phone_mappings_sip_config_id_fkey" FOREIGN KEY ("sip_config_id") REFERENCES "sip_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "voice_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_phone_mapping_id_fkey" FOREIGN KEY ("phone_mapping_id") REFERENCES "phone_mappings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "voice_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_events" ADD CONSTRAINT "call_events_call_log_id_fkey" FOREIGN KEY ("call_log_id") REFERENCES "call_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_transcripts" ADD CONSTRAINT "call_transcripts_call_log_id_fkey" FOREIGN KEY ("call_log_id") REFERENCES "call_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "call_transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_campaigns" ADD CONSTRAINT "voice_campaigns_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_campaigns" ADD CONSTRAINT "voice_campaigns_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "voice_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_leads" ADD CONSTRAINT "campaign_leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "voice_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage" ADD CONSTRAINT "usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_variations" ADD CONSTRAINT "content_variations_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "content_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_variations" ADD CONSTRAINT "content_variations_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "social_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_templates" ADD CONSTRAINT "content_templates_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publishing_schedules" ADD CONSTRAINT "publishing_schedules_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publishing_logs" ADD CONSTRAINT "publishing_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_analytics" ADD CONSTRAINT "post_analytics_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_analytics" ADD CONSTRAINT "post_analytics_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "content_variations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_configs" ADD CONSTRAINT "pricing_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_cost_breakdowns" ADD CONSTRAINT "call_cost_breakdowns_call_log_id_fkey" FOREIGN KEY ("call_log_id") REFERENCES "call_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_cost_breakdowns" ADD CONSTRAINT "call_cost_breakdowns_pricing_config_id_fkey" FOREIGN KEY ("pricing_config_id") REFERENCES "pricing_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_usage_records" ADD CONSTRAINT "voice_usage_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_touchpoints" ADD CONSTRAINT "customer_touchpoints_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "customer_journeys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cross_channel_conversions" ADD CONSTRAINT "cross_channel_conversions_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "customer_journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_automation_id_fkey" FOREIGN KEY ("automation_id") REFERENCES "automations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_step_executions" ADD CONSTRAINT "workflow_step_executions_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

