# Data Model and Schemas

## Response envelope standard
Every engine and API response must adhere to:
{
  data: T,
  confidence: Record<string, number> (0..1),
  evidence: EvidenceItem[],
  gaps: GapItem[],
  warnings: WarningItem[]
}

## EvidenceItem (required for traceability)
Evidence must include:
- source_type (website, manual, inferred, system)
- field_path
- source_url or source_id
- quote/snippet
- reasoning
- optional confidence

Rules:
- Do not fabricate phone/email/pricing. Those must be evidenced.

## GapItem
Gap must include:
- gap_type enum (missing_required, missing_pricing, missing_integration, etc.)
- field_path
- severity enum (low/medium/high) or (info/warning/error)
- message
- suggested_action (optional)

Dedup rule:
- gap_type + field_path
Keep highest severity.

## Wizard Snapshot schema
AO output must validate a strict AgentWizardSnapshotSchema.
It is the single source of truth for wizard hydration.
