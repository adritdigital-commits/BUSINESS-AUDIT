# Changelog

All notable changes to this project. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- **Site-wide `500 MIDDLEWARE_INVOCATION_FAILED`.** `createServerClient` was
  called with `process.env` values asserted non-null, so a missing variable
  threw inside middleware matching every route. Uncaught, it took down public
  pages needing no auth at all. Fixed at three call sites sharing the defect:
  `lib/supabase/middleware.ts` now logs the missing names and passes the
  request through; `lib/auth.ts` treats an unreachable auth provider as "not
  signed in"; `lib/supabase/{server,client}.ts` fail with a message naming the
  missing variables. Supabase calls in middleware are additionally wrapped, so
  an auth-provider outage cannot take the site down either.
  Authorization is unchanged — protected pages already re-check server-side.

### Added
- `src/lib/env.ts` — never throws at module scope, treats blank and
  whitespace-only values as missing, trims pasted whitespace.
- `scripts/check-env.mjs` — build-time preflight, wired into `npm run build`,
  so a misconfiguration fails loudly instead of as a 500 per request.
- `scripts/verify-production.mjs` — 59-check production suite covering
  environment variables, middleware, database connection, security, auth
  surface, assessment creation, autosave, resume, report generation, PDF,
  consultation booking, and the dashboard/admin/question-management gates.
  Exits non-zero on failure.
- `.env.example`, `.env.production.example`, `SUPABASE_SETUP.md`,
  `VERCEL_SETUP.md`, `DEPLOYMENT_CHECKLIST.md`.
- `npm run check-env`, `check-env:strict`, `verify:production`.
- 17 tests (154 total) covering the degradation paths.

---

## [1.0.0] — 2026-07-31

Version 1.0. See `RELEASE_NOTES.md` for the full summary.

### Added
- **Authentication UI** — `/login`, `/register`, `/forgot-password`,
  `/reset-password`, PKCE callback, POST-only signout. Fixes middleware
  redirecting to routes that did not exist.
- **Client dashboard** (`/dashboard`) — current score, resumable audit,
  recent audits, empty state.
- **Standalone report page** (`/report/[id]`) — owner, staff, or token access.
- **Assessment history** (`/dashboard/history`) — with score movement since
  the first completed audit.
- **Resume assessment** (`/audit/[id]`) — rehydrates saved answers and lands
  on the first unanswered question.
- **PDF report download** — two-page A4 document from the same report data.
- **Book consultation** (`/consultation`) — new `Consultation` model and
  migration with RLS; optional Calendly.
- **Admin dashboard** (`/admin`) — completion rate, average score, open
  consultations, recent activity.
- **Question management** (`/admin/questions`) — category and question CRUD
  with bulk reordering.
- Shared design tokens and chrome (`src/components/ui`), reusable
  `ReportView`, and a typed API client.

### Fixed
- `/login` and `/dashboard` 404'd despite middleware redirecting to them.
- The PDF download button was inert.

### Foundation work included in this release

### Fixed
- **Nothing submitted through the UI was persisted (P1.2, Bug 1).** The audit
  component carried its own hardcoded question bank and made no network calls,
  so no assessment, client, or report was ever written — every completed audit
  evaporated on refresh and no lead was captured. The UI now loads the question
  bank from `/api/categories`, creates an assessment on start, autosaves every
  answer, and renders the server-generated report. Verified end-to-end by
  driving a real browser against a real database and asserting the resulting
  rows.
- Progress bar and scale inputs no longer overflow narrow viewports; verified
  no horizontal scroll at 375 px.

### Added
- **Frontend↔backend integration (P1.2)** with loading, error, empty, and
  saving states throughout, plus a retry path when the question bank fails to
  load.
- `src/lib/apiClient.ts` — typed API client with an `ApiError` carrying
  user-safe messages, so no caller hand-rolls fetch or error handling.
- `src/lib/format.ts` — Indian-notation currency formatting (₹40k, ₹1.5L,
  ₹2.5Cr) for budget bands, with NaN and negative guards.
- Report now shows the total estimated investment band across all
  recommendations.
- Accessibility: `radiogroup`/`radio` semantics with `aria-checked` on answer
  options, `role="progressbar"` with live values, an `aria-live` autosave
  indicator, a labelled gauge, and `prefers-reduced-motion` support.
- 22 further tests (77 total): integration coverage of the audit flow against a
  mocked API — loading/error/empty states, assessment creation, autosave,
  save-failure recovery, conditional gating in both directions, progress
  semantics, report rendering, and completion failure handling.

### Changed
- **The scoring engine is now typed against structural minimums rather than
  Prisma row types**, so the identical `computeScore` / `isVisible` /
  `collectRecommendations` functions run in the browser and on the server.
  This removes the duplicate client-side scoring implementation that was a
  second source of truth for the number the product sells (Technical Debt 2).
  Behaviour is unchanged, held in place by the existing suite.
- The 90-day roadmap now buckets by priority everywhere, replacing the
  prototype's `index % 3` bucketing (Bug 6).
- The PDF download button is explicitly disabled and labelled pending P1.11,
  rather than silently doing nothing.

### Added
- **Test infrastructure (P1.1)** — Vitest with jsdom, Testing Library, and v8
  coverage. Reusable domain factories in `tests/factories.ts`.
- 54 unit tests across three suites:
  - `scoring.test.ts` (29) — point resolution for CHOICE/CHECKBOX/SCALE,
    SCALE normalization and clamping, conditional visibility for `equals`/
    `in`/numeric-threshold rules, category averaging, cross-category
    weighting, exclusion of answers to hidden questions, inactive
    category/question handling, and recommendation collection with priority
    sorting and per-service de-duplication.
  - `report.test.ts` (13) — strength/weakness banding including the 50–69
    neither-band, sort order, priority-bucketed roadmap, budget summation,
    null-cost handling, and empty-assessment safety.
  - `assessmentAccess.test.ts` (12) — the authorization matrix, including
    that a logged-in client cannot use a resume token to reach another
    business's assessment.
- `npm run typecheck`, `npm test`, `npm run test:watch`,
  `npm run test:coverage`.
- `DEVELOPMENT_STATUS.md` — full repository audit covering completed features,
  gaps, technical debt, bugs, and improvement opportunities.
- `PRIORITY.md` — every missing feature ranked P1–P4 with dependency ordering.
- `ROADMAP.md` — working plan for 1.0, 1.1, and 2.0, plus open decisions.
- `CHANGELOG.md` — this file.

### Changed
- CI now runs typecheck and the test suite between lint and build.

### Testing
- 135 unit and integration tests, up from 77.
- Verified in a real browser against real PostgreSQL: audit completion and
  database writes, PDF magic bytes, consultation storage, auth rendering,
  protected-route redirects, resume hydration, and mobile layout at 375 px.

---

## [0.2.0] — 2026-07-31

### Added
- Deployment runbook (`DEPLOYMENT.md`) covering Supabase provisioning, the
  pooled vs. direct connection split Prisma Migrate requires, environment
  variables, auth redirects, and first-admin promotion.
- `scripts/verify-deployment.mjs` — 34-check end-to-end verification suite
  runnable against any deployed URL; exits non-zero so it can gate a deploy.
- `engines.node >= 20` pin.

### Changed
- Replaced the CI workflow, which ran `npx webpack` against a Next.js project
  and failed on every push, with lint, typecheck, `prisma validate`, and build.

---

## [0.1.0] — 2026-07-31

### Added
- Production backend: nine Prisma models, two verified migrations, Supabase
  Auth with `ADMIN`/`STAFF`/`CLIENT` roles, Row Level Security on all public
  tables, and 19 API route handlers.
- Privilege-escalation hardening: signup role is read only from
  `app_metadata`, with a trigger reverting non-admin role changes.
- Scoring engine and report generator as shared pure functions.
- Seed data porting the prototype's 8 categories, 13 questions, 35 options,
  and 24 services.
- Next.js 14 application scaffold with the interactive audit prototype ported
  to TypeScript.
