/**
 * Template Engine v1 - Orchestrator
 *
 * The "brain" that turns company context into the best agent type + config seeds.
 *
 * Philosophy:
 * - Deterministic scoring first (always works, testable)
 * - AI only used to improve classification (never required)
 * - Seeds are minimal - downstream engines specialize them
 *
 * @module engines/template
 */

import { TEMPLATE_CATALOG } from "./template.catalog";
import { scoreTemplates, clamp01 } from "./template.scoring";
import { buildTemplateSeeds } from "./template.seeds";
import { aiSuggestTemplate } from "./template.ai";
import type {
  TemplateEngineResult,
  CompanyProfileLite,
  BrandVoiceProfileLite,
  EvidenceItemLite,
  TemplateGap,
  TemplateWarning,
  TemplateMatch,
} from "./template.types";
import type { AgentType } from "@epic-ai/shared";

// ============================================
// INPUT VALIDATION WARNINGS
// ============================================

function getInputWarnings(company: CompanyProfileLite): TemplateWarning[] {
  const warnings: TemplateWarning[] = [];

  if (!company.description) {
    warnings.push({
      code: "NO_DESCRIPTION",
      message:
        "Company description missing; template match may be less accurate.",
      severity: "warning",
    });
  }

  if (
    !(company.services?.length) &&
    !(company.products?.length)
  ) {
    warnings.push({
      code: "NO_OFFERINGS",
      message:
        "No services/products found; template selection is using fallback signals.",
      severity: "warning",
    });
  }

  if (!company.industry) {
    warnings.push({
      code: "NO_INDUSTRY",
      message: "Industry not specified; using keyword matching only.",
      severity: "info",
    });
  }

  return warnings;
}

// ============================================
// ENGINE PARAMS
// ============================================

export interface TemplateEngineParams {
  /** Company profile from enrichment */
  company_profile: CompanyProfileLite;
  /** Brand voice profile from enrichment */
  brand_voice_profile: BrandVoiceProfileLite;
  /** Evidence from enrichment (optional) */
  evidence?: EvidenceItemLite[];
  /** User-requested template (optional override) */
  desiredTemplateKey?: AgentType | null;
  /** Channels to support (optional filter) */
  channels?: string[];
}

// ============================================
// ENGINE
// ============================================

/**
 * Run the Template Engine
 *
 * Pipeline:
 * 1. Score templates deterministically
 * 2. Optionally enhance with AI suggestion
 * 3. Select best match
 * 4. Generate config seeds
 * 5. Calculate confidence and detect gaps
 *
 * @param params Engine parameters
 * @returns Template selection with seeds, evidence, and gaps
 */
export async function runTemplateEngine(
  params: TemplateEngineParams
): Promise<TemplateEngineResult> {
  const company = params.company_profile || {};
  const brand = params.brand_voice_profile || {};

  console.log(`[TemplateEngine] Starting for ${company.name || "unknown company"}`);

  // Step 1: Score templates deterministically
  console.log(`[TemplateEngine] Step 1: Scoring templates`);
  const matches = scoreTemplates({
    company,
    brand,
    channels: params.channels,
    desiredTemplateKey: params.desiredTemplateKey ?? null,
  });

  // Pick top candidate
  let selected: TemplateMatch = matches[0];

  // Step 2: Optional AI enhancement
  console.log(`[TemplateEngine] Step 2: Checking AI assist`);
  let aiUsed = false;
  const ai = await aiSuggestTemplate({
    company,
    brand,
    candidates: TEMPLATE_CATALOG.map((t) => ({
      templateKey: t.key,
      name: t.name,
      description: t.description,
    })),
  });

  if (ai?.suggested) {
    const aiMatch = matches.find((m) => m.templateKey === ai.suggested);
    if (aiMatch) {
      // Merge AI reasons into selected match
      selected = {
        ...aiMatch,
        reasons: [
          ...new Set([
            ...aiMatch.reasons,
            ...ai.reasons.map((r) => `AI: ${r}`),
          ]),
        ],
      };
      aiUsed = true;
      console.log(`[TemplateEngine] AI suggested: ${ai.suggested}`);
    }
  }

  // Get template definition
  const templateDef = TEMPLATE_CATALOG.find(
    (t) => t.key === selected.templateKey
  )!;

  // Step 3: Generate seeds
  console.log(`[TemplateEngine] Step 3: Generating seeds`);
  const seeds = buildTemplateSeeds({
    templateKey: templateDef.key,
    company,
    brand,
  });

  // Step 4: Calculate confidence
  const confidence: Record<string, number> = {
    template: clamp01(selected.score),
    role_card: clamp01(selected.score * 0.9),
    brain_config: clamp01(selected.score * 0.85),
    // Knowledge starts lower - Knowledge Engine fills it
    knowledge_config: clamp01(selected.score * 0.6),
    personality: clamp01(selected.score * 0.9),
  };

  // Step 5: Detect gaps
  const gaps: TemplateGap[] = [];

  if (selected.score < 0.35) {
    gaps.push({
      gap_type: "missing_context",
      field_path: "template.selection",
      severity: "medium",
      impact:
        "Template match confidence is low due to limited business signals.",
      recommended_fix:
        "Add a clearer company description and list of services, or explicitly pick a template.",
      question_to_user:
        "What is the primary goal for this agent (sales, booking, support, onboarding, FAQ)?",
      suggestions: TEMPLATE_CATALOG.map((t) => t.name),
    });
  }

  // Collect warnings
  const warnings: TemplateWarning[] = [
    ...getInputWarnings(company),
    ...(aiUsed
      ? [
          {
            code: "AI_TEMPLATE_SUGGESTION_USED",
            message: "AI suggestion influenced template selection.",
            severity: "info" as const,
          },
        ]
      : []),
  ];

  // Build evidence
  const engineEvidence: EvidenceItemLite[] = [
    ...(params.evidence || []),
    ...(ai?.evidence || []),
    {
      source_type: "inference",
      field_path: "template.selection",
      confidence: clamp01(selected.score),
      reasoning: `Selected ${templateDef.name} via deterministic scoring. Top reasons: ${selected.reasons.slice(0, 3).join("; ")}`,
    },
  ];

  console.log(
    `[TemplateEngine] Selected: ${templateDef.name} (score: ${selected.score.toFixed(2)})`
  );

  return {
    templateKey: templateDef.key,
    matches: matches.slice(0, 5), // Keep payload small
    selected_template: {
      key: templateDef.key,
      name: templateDef.name,
      description: templateDef.description,
      bestFor: templateDef.bestFor,
      channels_supported: templateDef.channels_supported,
    },
    seeds: {
      role_card: seeds.role_card,
      brain_config: seeds.brain_config,
      knowledge_config: seeds.knowledge_config,
      personality_seed: seeds.personality_seed,
    },
    evidence: engineEvidence,
    confidence,
    gaps,
    warnings,
  };
}
