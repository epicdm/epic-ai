# Reconciliation (Declared vs Discovered)

## Summary
- Declared routes: 68
- Discovered nodes (crawl): 44
- Declared but not discovered: 25
- Discovered but not declared: 1

## Declared but not discovered
- /dashboard/admin
- /dashboard/ads/campaigns/[id]
- /dashboard/automations/[id]
- /dashboard/brand/context
- /dashboard/journeys
- /dashboard/leads/[id]
- /dashboard/leads/[id]/edit
- /dashboard/settings/webhooks
- /dashboard/social/create
- /dashboard/voice/agents
- /dashboard/voice/agents/[id]
- /dashboard/voice/flows/[id]
- /dashboard/voice/groups/[id]
- /dashboard/voice/routing/[id]
- /onboarding/quick-wins
- /setup/ai
- /setup/ai-setup
- /setup/ai-social
- /setup/automate
- /setup/create
- /setup/distribute
- /setup/guided
- /setup/learn
- /setup/understand
- /setup/voice

## Discovered but not declared
- /docs/setup

## Dead-end classification
- /dashboard/admin → Role-gated/internal. Admin/test route not linked from primary nav.
- /dashboard/ads/campaigns/[id] → Expected dynamic-only. Requires entity ID or catch-all routing.
- /dashboard/automations/[id] → Expected dynamic-only. Requires entity ID or catch-all routing.
- /dashboard/brand/context → Bug/unlinked. Declared route not discovered from any crawl entry.
- /dashboard/journeys → Bug/unlinked. Declared route not discovered from any crawl entry.
- /dashboard/leads/[id] → Expected dynamic-only. Requires entity ID or catch-all routing.
- /dashboard/leads/[id]/edit → Expected dynamic-only. Requires entity ID or catch-all routing.
- /dashboard/settings/webhooks → Bug/unlinked. Declared route not discovered from any crawl entry.
- /dashboard/social/create → Bug/unlinked. Declared route not discovered from any crawl entry.
- /dashboard/voice/agents → Bug/unlinked. Declared route not discovered from any crawl entry.
- /dashboard/voice/agents/[id] → Expected dynamic-only. Requires entity ID or catch-all routing.
- /dashboard/voice/flows/[id] → Expected dynamic-only. Requires entity ID or catch-all routing.
- /dashboard/voice/groups/[id] → Expected dynamic-only. Requires entity ID or catch-all routing.
- /dashboard/voice/routing/[id] → Expected dynamic-only. Requires entity ID or catch-all routing.
- /onboarding/quick-wins → Feature flow (not linked in crawl). Likely reached by onboarding/setup stateful redirects.
- /setup/ai → Feature flow (not linked in crawl). Likely reached by onboarding/setup stateful redirects.
- /setup/ai-setup → Feature flow (not linked in crawl). Likely reached by onboarding/setup stateful redirects.
- /setup/ai-social → Feature flow (not linked in crawl). Likely reached by onboarding/setup stateful redirects.
- /setup/automate → Feature flow (not linked in crawl). Likely reached by onboarding/setup stateful redirects.
- /setup/create → Feature flow (not linked in crawl). Likely reached by onboarding/setup stateful redirects.
- /setup/distribute → Feature flow (not linked in crawl). Likely reached by onboarding/setup stateful redirects.
- /setup/guided → Feature flow (not linked in crawl). Likely reached by onboarding/setup stateful redirects.
- /setup/learn → Feature flow (not linked in crawl). Likely reached by onboarding/setup stateful redirects.
- /setup/understand → Feature flow (not linked in crawl). Likely reached by onboarding/setup stateful redirects.
- /setup/voice → Feature flow (not linked in crawl). Likely reached by onboarding/setup stateful redirects.

## Notes
- Crawl is authenticated using a live session; stateful flows (onboarding/setup) may hide some routes until specific steps are taken.
