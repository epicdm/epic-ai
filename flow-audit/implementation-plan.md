# Implementation Plan

## Redirect map
- `/dashboard/voice/phone-numbers` → `/dashboard/voice/numbers`
- `/dashboard/setup` → `/setup`
- `/sign-in` and `/sign-up` should resolve to catch-all routes (`/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]`)

## Link fixes (stale targets)
- Replace links to `/dashboard/content/calendar` with `/dashboard/calendar` or remove.
- Replace links to `/dashboard/content/create` with `/dashboard/content/generate` or actual create route.
- Replace links to `/dashboard/automations/new` with an existing create flow or add a route.
- Replace links to `/dashboard/voice/phone-numbers` with `/dashboard/voice/numbers`.
- Replace links to `/dashboard/setup` with `/setup`.

## Routes to add/remove/hide
- Consider adding missing create routes if they are intended (`/dashboard/automations/new`, `/dashboard/content/create`).
- If not intended, remove links and hide unused routes (e.g., `/dashboard/voice/templates` if unfinished).
- Keep `/dashboard/test` and `/dashboard/admin` behind role gates.

## Test checklist
- Public smoke: `/`, `/help`, `/sign-in`, `/sign-up`.
- Auth smoke: login → `/dashboard` loads, sidebar navigation works for each module.
- Onboarding: `/onboarding` and `/onboarding/quick-wins` complete and return to `/dashboard`.
- Setup deep links: `/setup/ai`, `/setup/voice`, `/setup/ai-setup`.
- Regression: verify stale links redirect to valid targets.
