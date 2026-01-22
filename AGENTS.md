# Repository Guidelines

## Project Structure & Module Organization
- `apps/web/` hosts the Next.js frontend (routes under `apps/web/src/app/`).
- `apps/voice-service/` contains the Python voice backend.
- `packages/database/` holds Prisma schema and DB tooling.
- `packages/shared/` and `packages/ui/` provide shared utilities and UI components.
- Docs live in `docs/`; test artifacts and reports are under `apps/web/playwright-report/` and `apps/web/playwright-results/`.

## Build, Test, and Development Commands
- `pnpm install`: install workspace dependencies (pnpm 10.24.0).
- `pnpm dev`: run all dev servers via Turborepo.
- `pnpm build`: build all packages/apps.
- `pnpm lint`: run ESLint across packages.
- `pnpm db:push` / `pnpm db:migrate`: apply Prisma schema changes.
- `pnpm test:e2e`: run Playwright end-to-end tests for `@epic-ai/web`.
- `pnpm test:e2e:ui`: run Playwright with UI runner.
- `docker-compose up -d`: start local Postgres/Redis for development.

## Coding Style & Naming Conventions
- TypeScript/React with Tailwind CSS; follow existing patterns in `apps/web/src/`.
- Indentation is 2 spaces; use double quotes in TS/TSX where shown in existing files.
- Component names are `PascalCase`; hooks use `useX` (e.g., `useNudge`).
- Run `pnpm lint` before opening a PR; linting is enforced via ESLint/Next config.

## Testing Guidelines
- E2E tests use Playwright in `apps/web/e2e/`.
- Test files follow `*.spec.ts` naming (see `apps/web/e2e/`).
- Run `pnpm test:e2e` locally; use `pnpm test:e2e:ui` for debugging.
- Jest config exists in `apps/web/jest.config.js` for unit tests when added.

## Commit & Pull Request Guidelines
- Commits follow Conventional Commits (e.g., `fix: handle undefined brandId`).
- PRs should include a short summary, testing performed, and screenshots for UI changes.
- Link relevant issues or specs when applicable.

## Security & Configuration
- Copy `.env.example` to `.env.local` and keep secrets out of git.
- Use `docker-compose` for local dependencies and document any new required services.
