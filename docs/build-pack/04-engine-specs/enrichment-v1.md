# Enrichment v1

## Purpose
Create a reliable company intelligence profile from website/manual inputs.

## Inputs
- companyId
- websiteUrl (optional)
- userAnswers (optional manual entry)

## Deterministic extraction (required)
- HTML → structured text sections
- Contact extraction (email/phone/whatsapp mentions)
- Service extraction from headings/sections
- Pricing signal detection (keywords/symbols)

## LLM refinement (optional but recommended)
Task: company_enrichment_v1
- normalize industry/sub-industry
- infer business model
- infer target audience
- infer sales complexity
- infer recommended agent types
Rules:
- never invent phone/email/pricing
- if weak evidence: low confidence + gap

## Outputs
- company_profile (normalized)
- brand_voice_profile (if inferable)
- evidence/confidence/gaps/warnings
- persist: company.enrichedAt, company_profile, brand_voice_profile
