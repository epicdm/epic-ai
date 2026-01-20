ALTER TABLE "user_onboarding_progress" ADD COLUMN "agent_type" TEXT;
ALTER TABLE "user_onboarding_progress" ADD COLUMN "agent_template_id" TEXT;
ALTER TABLE "user_onboarding_progress" ADD COLUMN "enabled_tools" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "user_onboarding_progress" ADD COLUMN "enabled_channels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
