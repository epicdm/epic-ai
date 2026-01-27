/**
 * Enrichment Engine - Schema Mapper
 *
 * Maps AI extraction results to Agent OS schema-compliant profiles.
 * Merges AI data with manual answers.
 *
 * @module engines/enrichment/mapper
 */

import type { ExtractedCompanyData } from "./enrichment.ai";

// ============================================
// TYPES
// ============================================

export interface CompanyProfile {
  name?: string;
  description?: string;
  industry?: string;
  services: string[];
  products: string[];
  email?: string;
  phone?: string;
  address?: string;
  hours_of_operation?: string;
  service_area?: string;
  target_audience?: string;
  business_model?: string;
  value_proposition?: string;
}

export interface BrandVoiceProfile {
  detected_tone?: string;
  formality_level?: number;
  sample_phrases: string[];
  detection_confidence: number;
}

export interface MappedProfile {
  company_profile: CompanyProfile;
  brand_voice_profile: BrandVoiceProfile;
}

// ============================================
// MANUAL ANSWER KEYS
// ============================================

/**
 * Fields that can be provided via manual answers
 * These override AI extraction when provided
 */
const MANUAL_OVERRIDE_FIELDS = [
  "hours_of_operation",
  "service_area",
  "email",
  "phone",
  "address",
  "name",
  "industry",
  "target_audience",
] as const;

// ============================================
// MAPPER
// ============================================

/**
 * Map AI extraction data to schema-compliant profile
 *
 * @param aiData Extracted company data from AI
 * @param manualAnswers Optional manual answers to merge
 * @returns Mapped profile with company and brand voice data
 */
export function mapToCompanyProfile(
  aiData: ExtractedCompanyData,
  manualAnswers?: Record<string, string>
): MappedProfile {
  // Build company profile
  const company_profile: CompanyProfile = {
    name: manualAnswers?.name || aiData.company_name,
    description: aiData.description,
    industry: manualAnswers?.industry || aiData.industry,
    services: aiData.services || [],
    products: aiData.products || [],
    email: manualAnswers?.email || aiData.email,
    phone: manualAnswers?.phone || aiData.phone,
    address: manualAnswers?.address || aiData.address,
    hours_of_operation: manualAnswers?.hours_of_operation,
    service_area: manualAnswers?.service_area,
    target_audience: manualAnswers?.target_audience || aiData.target_audience,
    business_model: aiData.business_model,
    value_proposition: aiData.value_proposition,
  };

  // Build brand voice profile
  const brand_voice_profile: BrandVoiceProfile = {
    detected_tone: aiData.tone,
    formality_level: aiData.formality_level,
    sample_phrases: aiData.sample_phrases || [],
    detection_confidence: aiData.tone_confidence || 0.5,
  };

  return {
    company_profile,
    brand_voice_profile,
  };
}

/**
 * Merge additional manual answers into existing profile
 *
 * @param profile Existing mapped profile
 * @param manualAnswers New manual answers
 * @returns Updated profile with manual answers merged
 */
export function mergeManualAnswers(
  profile: MappedProfile,
  manualAnswers: Record<string, string>
): MappedProfile {
  const updated = { ...profile };
  const company = { ...profile.company_profile };

  for (const field of MANUAL_OVERRIDE_FIELDS) {
    if (manualAnswers[field]) {
      (company as Record<string, unknown>)[field] = manualAnswers[field];
    }
  }

  updated.company_profile = company;
  return updated;
}
