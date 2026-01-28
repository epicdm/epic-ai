# E2E Test Coverage - PRD Requirements

This document maps Playwright E2E tests to PRD requirements for Epic AI.

## Test Suite Summary

| Spec File | Tests | Coverage Area |
|-----------|-------|---------------|
| `auth.spec.ts` | 7 | Authentication, UAT bypass, protected routes |
| `flywheel-phases.spec.ts` | 13 | 5-phase wizard (UNDERSTAND/CREATE/DISTRIBUTE/LEARN/AUTOMATE) |
| `social-publishing.spec.ts` | 17 | Social accounts, content creation, publishing |
| `analytics.spec.ts` | 9 | Analytics dashboard, metrics API, brand brain |
| `voice-agent.spec.ts` | 17 | Voice AI agents, calls, phone numbers, personas |
| `global-ux.spec.ts` | 20 | Navigation, responsive, accessibility, performance |
| **Total** | **83** | (166 with mobile viewport) |

---

## PRD Requirement Mapping

### 1. Authentication (auth.spec.ts)

| Requirement | Test | Status |
|-------------|------|--------|
| UAT bypass authentication | `should authenticate with UAT bypass cookies` | ✅ |
| Session persistence | `should persist session across page navigation` | ✅ |
| Protected route handling | `should handle unauthenticated access to dashboard` | ✅ |
| Protected route handling | `should handle unauthenticated access to setup pages` | ✅ |
| Protected route handling | `should handle unauthenticated access to voice pages` | ✅ |
| Sign-in page display | `should display sign-in page correctly` | ✅ |
| Sign-up page display | `should display sign-up page correctly` | ✅ |

### 2. Flywheel Phases (flywheel-phases.spec.ts)

| Requirement | Test | Status |
|-------------|------|--------|
| Setup hub navigation | `should display setup hub page` | ✅ |
| UNDERSTAND phase | `should navigate to UNDERSTAND phase` | ✅ |
| CREATE phase | `should navigate to CREATE phase` | ✅ |
| DISTRIBUTE phase | `should navigate to DISTRIBUTE phase` | ✅ |
| LEARN phase | `should navigate to LEARN phase` | ✅ |
| AUTOMATE phase | `should navigate to AUTOMATE phase` | ✅ |
| Bird's Eye wizard | `should load Bird's Eye wizard` | ✅ |
| Analysis options | `should show analysis options` | ✅ |
| Content factory page | `should load content creation page` | ✅ |
| Distribution page | `should load distribution page` | ✅ |
| Learning page | `should load learning/analytics page` | ✅ |
| Automation page | `should load automation page` | ✅ |
| Progress persistence | `should persist phase progress via API` | ✅ |

### 3. Social Publishing (social-publishing.spec.ts)

| Requirement | Test | Status |
|-------------|------|--------|
| Social dashboard | `should load social dashboard page` | ✅ |
| Social accounts section | `should display social accounts section` | ✅ |
| Accounts management | `should load accounts management page` | ✅ |
| Social accounts API | `should fetch social accounts via API` | ✅ |
| Integrations status | `should fetch social integrations status` | ✅ |
| Content creation page | `should load content creation page` | ✅ |
| Content generation page | `should load content generation page` | ✅ |
| Approval queue | `should load content approval queue` | ✅ |
| Published content | `should load published content page` | ✅ |
| AI content generation | `should have content generation endpoint` | ✅ |
| Content suggestions | `should fetch content suggestions` | ✅ |
| Suggestions page | `should load suggestions page` | ✅ |
| Social settings | `should load social settings page` | ✅ |
| Settings API | `should fetch social settings via API` | ✅ |
| Publishing workflow | `should have publishing endpoint` | ✅ |
| Content queue API | `should fetch content queue via API` | ✅ |
| Content calendar API | `should fetch content calendar via API` | ✅ |

### 4. Analytics (analytics.spec.ts)

| Requirement | Test | Status |
|-------------|------|--------|
| Analytics page | `should load analytics page` | ✅ |
| Analytics content | `should display analytics content` | ✅ |
| Analytics data API | `should fetch analytics data` | ✅ |
| AI learnings API | `should fetch AI learnings` | ✅ |
| Dashboard metrics | `should load main dashboard with metrics` | ✅ |
| Dashboard API | `should fetch dashboard data via API` | ✅ |
| Unified dashboard | `should have unified dashboard API` | ✅ |
| Brand dashboard | `should load brand dashboard` | ✅ |
| Brand brain API | `should fetch brand brain data` | ✅ |

### 5. Voice Agent (voice-agent.spec.ts)

| Requirement | Test | Status |
|-------------|------|--------|
| Voice dashboard | `should load voice dashboard page` | ✅ |
| Voice content | `should display voice dashboard content` | ✅ |
| Agents list | `should load agents list page` | ✅ |
| New agent page | `should load new agent creation page` | ✅ |
| Agents API | `should fetch agents via API` | ✅ |
| Templates API | `should have agent templates endpoint` | ✅ |
| Calls log page | `should load calls log page` | ✅ |
| Calls API | `should fetch calls via API` | ✅ |
| Voice stats API | `should fetch voice stats via API` | ✅ |
| Phone numbers page | `should load phone numbers page` | ✅ |
| Phone numbers API | `should fetch phone numbers via API` | ✅ |
| Numbers alternate API | `should fetch numbers via alternate endpoint` | ✅ |
| Personas API | `should fetch personas via API` | ✅ |
| Voice test page | `should load voice test page` | ✅ |
| Voice token endpoint | `should have voice token endpoint` | ✅ |
| Campaigns API | `should fetch campaigns via API` | ✅ |
| Brand voice page | `should load brand voice page` | ✅ |

### 6. Global UX (global-ux.spec.ts)

| Requirement | Test | Status |
|-------------|------|--------|
| Main navigation | `should render main navigation on dashboard` | ✅ |
| Section navigation | `should navigate between dashboard sections` | ✅ |
| Internal links | `should have working internal links` | ✅ |
| Mobile viewport | `should display correctly on mobile viewport` | ✅ |
| Tablet viewport | `should display correctly on tablet viewport` | ✅ |
| Desktop viewport | `should display correctly on desktop viewport` | ✅ |
| Mobile menu | `should show mobile menu toggle on small screens` | ✅ |
| Default theme | `should load with default theme` | ✅ |
| Theme elements | `should have theme-related elements` | ✅ |
| Content loading | `should show content after loading` | ✅ |
| Loading spinner | `should not show infinite loading spinner` | ✅ |
| 404 handling | `should handle 404 pages gracefully` | ✅ |
| Invalid routes | `should handle invalid dashboard routes` | ✅ |
| Settings page | `should load settings page` | ✅ |
| Onboarding page | `should load onboarding page` | ✅ |
| Heading structure | `should have proper heading structure` | ✅ |
| Link text | `should have proper link text` | ✅ |
| Button accessibility | `should have proper button accessibility` | ✅ |
| Load time | `should load dashboard within reasonable time` | ✅ |
| Console errors | `should not have console errors on page load` | ✅ |

---

## Running Tests

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
npx playwright install chromium
```

### Commands

```bash
# Run all tests (chromium)
pnpm test:e2e

# Run all tests (both desktop and mobile)
npx playwright test

# Run specific spec file
npx playwright test e2e/auth.spec.ts

# Run with UI mode
npx playwright test --ui

# Run with headed browser
npx playwright test --headed

# Generate HTML report
npx playwright test --reporter=html
npx playwright show-report
```

### Test Configuration

Tests use UAT bypass authentication via cookies:
- `uat_bypass=true`
- `uat_user_id=test_user_12345`

These are set in `e2e/fixtures/test-fixtures.ts`.

---

## Test Architecture

```
apps/web/e2e/
├── fixtures/
│   └── test-fixtures.ts      # Shared test utilities and constants
├── auth.spec.ts              # Authentication tests
├── flywheel-phases.spec.ts   # Flywheel wizard tests
├── social-publishing.spec.ts # Social publishing tests
├── analytics.spec.ts         # Analytics tests
├── voice-agent.spec.ts       # Voice AI tests
├── global-ux.spec.ts         # Global UX tests
└── PRD_COVERAGE.md           # This document
```

### Test Patterns

1. **Page Navigation Tests**: Verify pages load without errors
2. **API Tests**: Verify endpoints respond with expected status codes
3. **Responsive Tests**: Verify mobile/tablet/desktop rendering
4. **Accessibility Tests**: Verify semantic HTML structure

### Failure Handling

- Screenshots captured on failure: `playwright-results/`
- Traces captured on first retry: `playwright-results/`
- Videos captured on retry: `playwright-results/`

---

## Coverage Gaps

The following areas need additional test coverage:

1. **End-to-end flows**: Complete user journeys (e.g., create content → publish → view analytics)
2. **Database seeding**: Deterministic test data for consistent results
3. **OAuth flows**: Mock OAuth for platform connections
4. **Real-time features**: WebSocket/LiveKit voice testing

---

## Maintenance

When adding new features:

1. Update the corresponding spec file
2. Add new tests for new routes/APIs
3. Update this coverage document
4. Run `npx playwright test` to verify

Last updated: 2026-01-04
