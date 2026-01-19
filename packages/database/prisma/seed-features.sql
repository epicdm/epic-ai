INSERT INTO "features" ("id", "name", "description", "unlockConditions", "created_at", "updated_at")
VALUES
  ('content_generator', 'AI Content Generator', 'Create posts optimized for each platform', '{"type":"wizard","value":"onboarding"}', NOW(), NOW()),
  ('workflows', 'Cross-Channel Workflows', 'Automate content across platforms', '{"type":"event_count","value":3}', NOW(), NOW()),
  ('advanced_analytics', 'Advanced Analytics', 'Measure performance and insights', '{"type":"wizard","value":"analytics"}', NOW(), NOW()),
  ('voice_agents', 'AI Voice Agents', 'Automated phone calls with AI', '{"type":"wizard","value":"voice_setup"}', NOW(), NOW()),
  ('brand_brain', 'Brand Brain', 'Centralized brand context and tone', '{"type":"wizard","value":"brand_setup"}', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "unlockConditions" = EXCLUDED."unlockConditions",
  "updated_at" = NOW();
