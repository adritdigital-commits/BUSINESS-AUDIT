# Development Status

Repository audit — RakeshProTech Business Growth Platform
Audited at commit `7486abb`.

---

## Headline finding

**The frontend and backend are not connected.** They were built as separate,
individually working layers and never wired together.

`src/components/AuditApp.tsx` carries its own hardcoded `CATEGORIES` array and
makes **zero** network calls — verified by grep: no `fetch`, no `/api/`, no
data-loading effect anywhere in the component tree. Meanwhile the entire API
surface (19 routes), the database, the scoring engine, and the report
generator are fully built and tested but unreachable from the UI.

Practical consequence: a visitor can complete the whole audit and see a
report, but **nothing is ever persisted**. Refresh the page and it is gone.
No assessment row is written, no client is captured, no report is stored, no
lead is generated. The product's entire commercial purpose — capturing leads
and converting them into proposals — does not currently function through the
UI, despite both halves working in isolation.

This single gap outranks every other item in this document.

---

## Completed Features

Verified present and working.

### Database & data model
- Nine Prisma models: `Profile`, `Category`, `Question`, `Option`, `Service`,
  `Client`, `Assessment`, `Proposal`, plus `AuthUser` mapping to Supabase's
  `auth.users`
- Two migrations, both verified applying cleanly against real PostgreSQL 16
- Correct relational integrity: cascade deletes on owned children, `SET NULL`
  on optional references, indexes on every foreign key and sort column
- `answersJson` as source of truth with cached score columns and a frozen
  `reportJson` snapshot on completion

### Authentication & authorization
- Supabase Auth integration with browser, server, middleware, and service-role
  clients
- Three roles — `ADMIN`, `STAFF`, `CLIENT`
- `handle_new_user()` trigger auto-provisions a profile on signup
- **Privilege-escalation hardened**: role is read only from `app_metadata`
  (service-role writable), never `raw_user_meta_data` (client writable at
  signup); a second trigger reverts non-admin role changes. Both verified by
  direct SQL attack test.
- Row Level Security on all eight public tables
- Dual-layer authorization: application guards (`src/lib/auth.ts`) plus RLS

### API
- 19 route handlers covering question-bank CRUD with reorder, the full
  assessment lifecycle, clients, proposals, services, and JSON export/import
- Zod validation on every write path
- Uniform error mapping (401/403/404/400/409/500)
- Anonymous audit support via `resumeToken`

### Business logic
- Scoring engine with weighted per-category scores and conditional visibility
- Report generator: strengths, weaknesses, deduplicated and priority-sorted
  recommendations, 90-day roadmap, budget band
- Shared pure functions so live preview and frozen snapshot cannot disagree

### Frontend (standalone)
- Complete three-stage audit UI: intro, question flow, report
- Radar chart, animated gauge, progress bar, conditional question gating

### Tooling
- CI: lint, typecheck, `prisma validate`, build
- Seed script: 8 categories, 13 questions, 35 options, 24 services
- 34-check deployment verification suite

---

## Missing Features

### Blocking — the app cannot function as a product without these

| Feature | Status |
|---|---|
| **Frontend↔backend integration** | Absent. UI is fully offline. |
| **Test infrastructure** | No runner, no config, no test files. The stated development standard requires unit + integration tests per feature; nothing can currently satisfy it. |
| **`/login` page** | Referenced by middleware, does not exist → redirect to 404. |
| **`/dashboard` page** | Referenced by middleware, does not exist → redirect to 404. |
| Client registration | Not built |
| Forgot password | Not built |
| Email delivery | No provider configured. `resumeToken` is generated but never sent, so "resume later" is unreachable. |

### Client-facing
Business landing page · assessment dashboard · assessment history · resume
assessment (UI) · client profile · company profile · proposal viewer · PDF
report export · book consultation · Calendly integration · notification centre

### Admin & staff
Admin dashboard · question management UI · category management UI ·
conditional-logic builder · scoring-rules editor · service management UI ·
pricing calculator · project creation · client notes · CRM pipeline · lead
management · Excel export · analytics dashboard · audit logs · role management
UI · staff dashboard · settings

---

## Technical Debt

1. **Two parallel question-bank definitions.** The hardcoded `CATEGORIES` in
   `AuditApp.tsx` and the seeded database rows encode the same content in two
   places. They will drift the moment anyone edits questions in the admin
   panel. The hardcoded copy must become the seed's responsibility only.

2. **Two parallel scoring implementations.** `AuditApp.tsx` has its own inline
   scoring/report logic that duplicates `src/lib/scoring.ts` and
   `src/lib/report.ts` with subtly different rules — notably the prototype's
   `lowRec` threshold mechanism for SCALE questions, which has no equivalent
   in the production engine. Two sources of truth for the number the entire
   product sells.

3. **SCALE questions cannot trigger recommendations.** The production schema
   only triggers recommendations via `Option.recommendedService`, and SCALE
   questions have no options. Two seeded questions are consequently unable to
   produce advice. Needs either a threshold-rule field on `Question` or
   conversion to `CHOICE`.

4. **All styling is inline.** `AuditApp.tsx` uses inline style objects
   throughout while Tailwind is installed and configured but unused. No design
   tokens, no theme, no reuse.

5. **One 600-line component.** `AuditApp.tsx` holds three screens, the question
   bank, scoring, and report rendering in a single file.

6. **No shared API client.** Every future caller will hand-roll `fetch` and
   error handling.

7. **No structured logging.** `console.error` in the error mapper only.

8. **Seed is not idempotent for demo rows.** Fixed IDs (`seed-demo-client`)
   collide with real data if run against production.

---

## Bugs

| # | Severity | Bug |
|---|---|---|
| 1 | **Critical** | Nothing submitted through the UI is persisted — no assessment, client, or report is ever created. Product is non-functional as a lead-capture tool. |
| 2 | **High** | `/dashboard` and `/login` do not exist. Any logged-out visit to `/dashboard` redirects to a 404; a CLIENT visiting `/admin` is redirected to `/dashboard` → also 404. |
| 3 | **Medium** | `setStage("report")` is called during render in `AuditApp.tsx` when `current` is undefined — a React state update during render, which triggers a warning and risks an update loop. |
| 4 | **Medium** | `POST /api/assessments/[id]/answer` does not verify that the submitted `optionId` actually belongs to `questionId`. Scoring degrades safely (unknown option scores null), but arbitrary foreign IDs are persisted into `answersJson`, corrupting stored data. |
| 5 | **Medium** | Progress bar divides by `visibleQuestions.length`, which changes as conditional questions appear/disappear, so progress can move backwards mid-audit. |
| 6 | **Low** | The report's 90-day roadmap buckets by `index % 3` in the prototype but by priority in the production engine — two different roadmaps for identical answers. |
| 7 | **Low** | Google Fonts is loaded via CSS `@import` inside a `<style>` tag, blocking render; Next's font optimization is bypassed. |

---

## Performance Improvements

1. **Middleware calls Supabase `getUser()` on every matched request**, adding a
   network round trip to essentially every navigation. Should short-circuit
   for public paths.
2. **Middleware makes a second DB query** for the profile role on `/admin`
   routes. Cache the role in a signed cookie or JWT claim.
3. **Question bank is re-queried on every autosave** to recompute the live
   score — a full nested `findMany` per keystroke-level save. Cache per request
   or recompute client-side.
4. No HTTP caching headers on `GET /api/categories`, which is effectively
   static and read on every audit start.
5. Import route issues sequential writes in a loop; batch them.
6. No connection-pool tuning for serverless; `?pgbouncer=true` is documented
   but `connection_limit` is not set.
7. Recharts is imported eagerly into the main bundle (~106 kB first load) even
   though the chart only appears on the final screen. Should be dynamically
   imported.

---

## Security Improvements

| Severity | Item |
|---|---|
| **High** | **No rate limiting anywhere.** `POST /api/assessments` is public and creates a `Client` **and** an `Assessment` row per call. Trivially floodable — unbounded database growth and cost. Needs IP-based throttling plus CAPTCHA or proof-of-work on audit start. |
| **High** | RLS policy `assessments_public_insert` is `WITH CHECK (true)` — unrestricted anonymous insert. Necessary for anonymous audits but must be paired with rate limiting. |
| Medium | `resumeToken` is a bare UUID in the query string, so it lands in server logs, browser history, and `Referer` headers. Should be hashed at rest and delivered in a short-lived signed link. |
| Medium | `resumeToken` never expires and is single-factor access to an assessment's full contents. Needs a TTL. |
| Medium | No CSRF protection on state-changing routes. Cookie-authenticated `POST`s are exposed to cross-site submission. |
| Medium | No security headers — CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options` are all unset. |
| Medium | Error responses call `console.error(error)` with the raw error, which can put connection strings into logs. |
| Low | No audit logging of privileged actions (role changes, question edits, proposal sends). |
| Low | No account-lockout or brute-force protection beyond Supabase defaults. |
| Low | PII (`Client.email`, `phone`) is stored unencrypted with no retention or deletion policy — a GDPR/DPDP concern. |

---

## Database Improvements

1. **No `updatedAt` trigger at the SQL level.** Prisma's `@updatedAt` only
   applies to writes through Prisma; direct SQL or Supabase-client writes leave
   the column stale.
2. **`Assessment.answersJson` is unvalidated JSON.** No constraint ties keys to
   real question IDs. A `CHECK` constraint or periodic integrity job would help.
3. **No soft deletes.** Deleting a category cascades away its questions and
   options irreversibly, silently altering the meaning of historical
   assessments that referenced them.
4. **No question-bank versioning.** `reportJson` is snapshotted, but the
   underlying question/option rows can be edited or deleted, so a completed
   assessment's answer keys may point at rows that no longer exist. A
   `QuestionVersion` table or an append-only bank would fix this properly.
5. Missing composite index on `assessments (clientId, status)` for the common
   dashboard query.
6. Missing index on `assessments.completedAt` for date-range analytics.
7. `Proposal.itemsJson` is untyped; line items would be better as a real
   `ProposalItem` table for querying and reporting.
8. No `Project` model, despite project creation being a v1.0 requirement.
9. No `Notification`, `AuditLog`, or `ClientNote` models — all required by v1.0.
10. Demo seed rows use fixed IDs that would collide in production.

---

## UX Improvements

1. No loading states anywhere — every future API call will show a dead UI.
2. No error states. If a request fails the user sees nothing.
3. No empty states (no assessments yet, no proposals yet, no clients yet).
4. **Accessibility gaps**: option buttons are not grouped as `radiogroup`/
   `radio`; the progress bar has no `role="progressbar"` or ARIA values; no
   focus management between questions; no visible focus rings; no skip link;
   the gauge and radar chart have no text alternative.
5. **Not mobile responsive.** The 1–10 scale renders as ten fixed-flex buttons
   that collapse below ~380 px; the category grid is hardcoded to two columns;
   font sizes are fixed pixels.
6. No keyboard shortcuts for the question flow (number keys for scale,
   arrows/enter for options).
7. No autosave indicator, so the user cannot tell whether progress is safe.
8. Answers cannot be revised from the report screen.
9. No per-question "why we ask this" disclosure, though `purpose` exists in the
   schema.
10. `alert()`-free but also feedback-free — the PDF download button is inert.
11. No dark/light theme toggle despite a dark-only palette.
12. No `prefers-reduced-motion` handling for the gauge and progress animations.

---

## AI Opportunities

1. **Narrative report generation** — turn the scored category data into
   consultant-grade prose per client rather than templated sentences.
2. **Answer-aware follow-up questions** — dynamically generated probing
   questions based on prior answers, beyond static conditional logic.
3. **Website/SEO analyzer** — accept a URL and auto-populate several answers
   (site exists, speed, SSL, meta tags), reducing audit length and increasing
   completion.
4. **Competitor analysis** from industry plus location.
5. **Proposal drafting** — convert triggered recommendations into client-ready
   scoped proposals with rationale.
6. **RAG knowledge base** over past audits and outcomes to ground
   recommendations in what actually worked.
7. **Chat assistant** for clients to interrogate their own report.
8. **Drop-off prediction** — identify questions that cause abandonment and
   reorder adaptively.
9. **Lead scoring** — rank leads by conversion likelihood from audit answers.
10. **Content and marketing planners** generated from the 90-day roadmap.

---

## Future Features

Post-1.0, per the product brief: AI business consultant · competitor analysis ·
SEO analyzer · website analyzer · performance analyzer · social media audit ·
Google Business audit · content planner · marketing planner · sales planner ·
growth roadmap generator · OpenAI integration · RAG knowledge base · chat
assistant · white-label mode · agency portal · multi-tenant architecture.

Multi-tenancy is the one item that should influence schema decisions **now**,
since retrofitting a tenant boundary across nine tables later is materially
harder than reserving it early.

---

## Deployment status

Not verifiable from this environment — outbound access to `api.vercel.com` and
`api.supabase.com` is blocked by network policy. `DEPLOYMENT.md` documents the
procedure and `scripts/verify-deployment.mjs` will confirm a live instance in
34 checks when run against a reachable URL.
