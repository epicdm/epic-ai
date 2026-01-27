# Template Engine (TRE v1)

## Purpose
Recommend the best agent template for a business.

## Inputs
- company_profile
- brand_voice_profile (optional)
- desiredTemplateKey (optional override)

## Scoring model (0–100)
- Industry match (30)
- Business model match (15)
- Sales complexity match (15)
- Service category fit (10)
- AI recommended agent types (10)
- Conversation fit (10)
- Market effectiveness prior (10)

## Output
data:
- template_key
- match_score
- reasoning[] (bullet-like strings)
confidence:
- template_key confidence
gaps:
- if profile incomplete, add missing_required gaps (e.g. missing industry)

## Override behavior
If desiredTemplateKey provided:
- template_key = desiredTemplateKey
- match_score = 100
- reasoning = ["User selected template"]
