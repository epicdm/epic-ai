# Wizard Snapshot Contract

Wizard Snapshot is the single payload that hydrates the wizard.

Contains:
- agentId, companyId, deploymentState
- selectedTemplate {template_key, match_score, reasoning[]}
- wizard_snapshot: module configs (company, role_card, tools, flows, personality, knowledge, governance, economics)
- confidence map
- evidence list
- gaps list
- warnings list

UI must:
- show gaps grouped by step
- show confidence badges
- navigate user to next best step
