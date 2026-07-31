# Changelog

All notable changes to this project. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
