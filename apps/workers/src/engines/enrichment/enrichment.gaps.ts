/**
 * Enrichment Engine - Gap Detection
 *
 * Detects missing or incomplete fields in enrichment output.
 * Gaps feed back to wizard for user input.
 *
 * @module engines/enrichment/gaps
 */

import type { MappedProfile } from "./enrichment.mapper";

// ============================================
// TYPES
// ============================================

export interface EnrichmentGap {
  /** Type of gap */
  gap_type: "missing_required" | "missing_recommended" | "low_confidence";
  /** Dot-notation path to the field */
  field_path: string;
  /** Severity level */
  severity: "high" | "medium" | "low";
  /** Human-readable description */
  description: string;
  /** Suggested action */
  recommended_action: string;
  /** Focus path for wizard deep-linking */
  focus_path?: string;
}

// ============================================
// GAP DEFINITIONS
// ============================================

interface GapDefinition {
  field_path: string;
  check: (profile: MappedProfile) => boolean;
  gap_type: EnrichmentGap["gap_type"];
  severity: EnrichmentGap["severity"];
  description: string;
  recommended_action: string;
  focus_path?: string;
}

/**
 * Required fields - high severity gaps
 */
const REQUIRED_GAPS: GapDefinition[] = [
  {
    field_path: "company_profile.name",
    check: (p) => !p.company_profile.name,
    gap_type: "missing_required",
    severity: "high",
    description: "Company name is required",
    recommended_action: "Enter your company name",
    focus_path: "brand.name",
  },
  {
    field_path: "company_profile.industry",
    check: (p) => !p.company_profile.industry,
    gap_type: "missing_required",
    severity: "high",
    description: "Industry is required for accurate agent behavior",
    recommended_action: "Select your industry",
    focus_path: "brand.industry",
  },
];

/**
 * Recommended fields - medium severity gaps
 */
const RECOMMENDED_GAPS: GapDefinition[] = [
  {
    field_path: "company_profile.services",
    check: (p) =>
      !p.company_profile.services || p.company_profile.services.length === 0,
    gap_type: "missing_recommended",
    severity: "medium",
    description: "Services/products help agents answer customer questions",
    recommended_action: "Add your main services or products",
    focus_path: "brand.services",
  },
  {
    field_path: "company_profile.hours_of_operation",
    check: (p) => !p.company_profile.hours_of_operation,
    gap_type: "missing_recommended",
    severity: "medium",
    description: "Business hours help agents handle scheduling questions",
    recommended_action: "Add your hours of operation",
    focus_path: "brand.hours",
  },
  {
    field_path: "company_profile.service_area",
    check: (p) => !p.company_profile.service_area,
    gap_type: "missing_recommended",
    severity: "medium",
    description: "Service area helps qualify leads by location",
    recommended_action: "Define your service area",
    focus_path: "brand.service_area",
  },
  {
    field_path: "company_profile.target_audience",
    check: (p) => !p.company_profile.target_audience,
    gap_type: "missing_recommended",
    severity: "medium",
    description: "Target audience helps personalize agent responses",
    recommended_action: "Describe your ideal customer",
    focus_path: "brand.audience",
  },
];

/**
 * Optional fields - low severity gaps
 */
const OPTIONAL_GAPS: GapDefinition[] = [
  {
    field_path: "company_profile.description",
    check: (p) => !p.company_profile.description,
    gap_type: "missing_recommended",
    severity: "low",
    description: "A description helps agents introduce your business",
    recommended_action: "Add a brief company description",
    focus_path: "brand.description",
  },
  {
    field_path: "brand_voice_profile.detected_tone",
    check: (p) => !p.brand_voice_profile.detected_tone,
    gap_type: "low_confidence",
    severity: "low",
    description: "Brand voice could not be detected",
    recommended_action: "Select your preferred communication tone",
    focus_path: "personality.tone",
  },
];

// ============================================
// GAP DETECTION
// ============================================

/**
 * Detect enrichment gaps in a mapped profile
 *
 * @param profile Mapped profile to check
 * @returns Array of detected gaps
 */
export function detectEnrichmentGaps(profile: MappedProfile): EnrichmentGap[] {
  const gaps: EnrichmentGap[] = [];

  // Check all gap definitions
  const allDefinitions = [
    ...REQUIRED_GAPS,
    ...RECOMMENDED_GAPS,
    ...OPTIONAL_GAPS,
  ];

  for (const def of allDefinitions) {
    if (def.check(profile)) {
      gaps.push({
        gap_type: def.gap_type,
        field_path: def.field_path,
        severity: def.severity,
        description: def.description,
        recommended_action: def.recommended_action,
        focus_path: def.focus_path,
      });
    }
  }

  // Check brand voice confidence
  if (
    profile.brand_voice_profile.detected_tone &&
    profile.brand_voice_profile.detection_confidence < 0.5
  ) {
    gaps.push({
      gap_type: "low_confidence",
      field_path: "brand_voice_profile.detected_tone",
      severity: "low",
      description: "Brand voice detection has low confidence",
      recommended_action: "Review and confirm the detected tone",
      focus_path: "personality.tone",
    });
  }

  return gaps;
}

/**
 * Get gaps by severity level
 *
 * @param gaps Array of gaps
 * @param severity Severity to filter by
 * @returns Filtered gaps
 */
export function getGapsBySeverity(
  gaps: EnrichmentGap[],
  severity: EnrichmentGap["severity"]
): EnrichmentGap[] {
  return gaps.filter((g) => g.severity === severity);
}

/**
 * Check if profile has any high-severity gaps
 *
 * @param gaps Array of gaps
 * @returns True if any high-severity gaps exist
 */
export function hasBlockingGaps(gaps: EnrichmentGap[]): boolean {
  return gaps.some((g) => g.severity === "high");
}
