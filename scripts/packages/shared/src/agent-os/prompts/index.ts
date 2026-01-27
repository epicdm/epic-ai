// Prompt keys registry (v1)
export const PROMPT_KEYS = {
  COMPANY_ENRICHMENT_V1: "company_enrichment_v1",
  BRAND_VOICE_V1: "brand_voice_v1",
  TEMPLATE_RECO_V1: "template_recommendation_v1",
  AGENT_BRAIN_V1: "agent_brain_policies_v1",
  KNOWLEDGE_FAQ_V1: "knowledge_extraction_faq_v1",
  EPISODIC_MEMORY_V1: "episodic_memory_summary_v1",
  LEARNING_SAFE_V1: "learning_proposals_safe_v1",
  RISK_DETECTION_V1: "risk_detection_v1",
  EXPLAINABILITY_V1: "explainability_trace_v1",
  ECONOMICS_V1: "economics_estimator_v1",
} as const;

export type PromptKey = typeof PROMPT_KEYS[keyof typeof PROMPT_KEYS];
