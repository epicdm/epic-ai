# System Test Plan: A-Z User Journey (Epic AI)

## Objective
Verify the end-to-end functionality of the Epic AI platform, simulating a complete user lifecycle from onboarding to automated content publishing.

## Scope
- **Frontend**: `apps/web` (Core logic & UI flows)
- **Backend/Workers**: `apps/workers` (Scheduler & Job Processing)
- **Database**: PostgreSQL (State persistence)
- **AI Services**: OpenAI (Mocked or Real)
- **Integrations**: Social Platforms (Mocked)

## The Journey (Happy Path)

### 1. User Onboarding
- **Actor**: New User
- **Actions**:
    1.  Sign up (Create User).
    2.  Create Organization (`Epic Tech Inc`).
    3.  Create Brand (`Epic AI`).
- **Verification**: DB records created.

### 2. Brain Initialization (Context)
- **Actor**: User
- **Actions**:
    1.  Add Context Source (e.g., Website URL or Manual Text).
    2.  System scrapes/analyzes context.
    3.  System generates `BrandProfile` (Voice, Tone, Pillars).
- **Verification**: `BrandBrain` record exists and is populated.

### 3. Autopilot Configuration
- **Actor**: User
- **Actions**:
    1.  Enable Autopilot.
    2.  Set schedule (e.g., "Mon, Wed, Fri at 10:00 AM").
    3.  Select platforms (LinkedIn, Twitter).
- **Verification**: `AutopilotConfig` record updated.

### 4. Content Generation (The Factory)
- **Actor**: System (Scheduler)
- **Trigger**: Cron / On-demand.
- **Actions**:
    1.  Scheduler identifies empty slots.
    2.  `ContentGenerator` creates posts based on `BrandProfile`.
    3.  Posts saved as `DRAFT` or `PENDING` approval.
- **Verification**: `ContentItem` records created with AI-generated text.

### 5. Approval Workflow
- **Actor**: User
- **Actions**:
    1.  User reviews generated drafts.
    2.  User clicks "Approve" on a post.
- **Verification**: `ContentItem` status changes to `SCHEDULED`.

### 6. Publishing
- **Actor**: System (Worker)
- **Trigger**: Scheduled time arrives.
- **Actions**:
    1.  Worker picks up `SCHEDULED` items due for publishing.
    2.  `SocialPublisher` pushes content to platform API.
    3.  Result saved to DB.
- **Verification**: `ContentItem` status `PUBLISHED`. `PublishResult` record exists.

---

## Testing Strategy

### Simulation Script (`scripts/system-test.ts`)
A dedicated script will act as the "User" and "System Clock", stepping through the journey sequentially.

1.  **Setup**: Clean/Mock DB state.
2.  **Phase 1**: Call Service methods to simulate User inputs.
3.  **Phase 2**: Invoke `ContentScheduler.generateWeeklyContent()` manually.
4.  **Phase 3**: Mutate DB to simulate User Approval.
5.  **Phase 4**: Invoke `Worker` logic to process the queue.
6.  **Assert**: Check final DB state.

### Automated Checks
- [ ] Brand Profile Generation
- [ ] Content Generation (Variations exist)
- [ ] State Transitions (Draft -> Scheduled -> Published)
