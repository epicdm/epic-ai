# Tools Engine (TAIE v1)

## Purpose
Assign tools/capabilities based on template + business context.

## Inputs
- template_key
- company_profile (industry, business_model, sales_complexity)
- channel(s): voice/chat

## Tool taxonomy
Each tool includes:
- id, category
- required_for_templates[]
- best_for_industries[]
- business_model_fit[]
- sales_complexity_fit[]
- value_contribution
- dependencies[]

## Scoring model
Score = Template requirement (40) + Industry fit (25) + Complexity fit (20) + Model fit (15)

## Classification tiers
- ≥80: essential
- 60–79: recommended
- 40–59: optional
- <40: hidden/disabled

## Dependency resolution
If tool A depends on tool B, enabling A must enable B or emit gap.

## Integration gaps
If a tool requires external connection (calendar, crm, sms):
- Emit gap_type="missing_integration" for that tool field_path.

## Output
tool_config:
- essential_tools: [{id, reason}]
- recommended_tools: [{id, reason}]
- optional_tools: [{id, reason}]
- disabled_tools: [{id, reason}]
- dependencies: record
