# Release Notes — Version 1.0

RakeshProTech Business Growth Platform
Released 31 July 2026

---

## What this is

A consultant-grade business growth audit that scores a company's digital
maturity across eight categories and generates a prioritized 90-day roadmap.
Prospects can take the audit anonymously in about six minutes, download a PDF
report, and book a consultation. Consultants get a dashboard, a manageable
question bank, and a captured lead for every completed audit.

---

## Features in 1.0

### For prospects and clients

**The audit** — Eight weighted categories, thirteen questions, with
conditional logic that skips irrelevant follow-ups (answering "no website"
never asks about site speed). Every answer autosaves, so a closed tab is not a
lost audit.

**Scoring and report** — A 0–100 Digital Maturity Score, per-category scores
with a radar comparison, strengths, gaps, deduplicated and priority-sorted
recommendations, a 90-day roadmap in three phases, and a total investment band.

**Accounts** — Registration, sign-in, forgot password, and password reset.
Signing up is optional: the audit works anonymously and can be claimed later.

**Client dashboard** — Current maturity score, an in-progress audit to resume,
and recent audits at a glance.

**Assessment history** — Every past audit with a progress summary showing how
the score has moved since the first one.

**Resume** — Return to an unfinished audit and land on the first unanswered
question, either from the dashboard or an emailed resume link.

**PDF report** — A two-page A4 report generated from the same data as the
on-screen view.

**Book a consultation** — Request a call directly from the report. Works with
or without Calendly configured.

### For staff and admins

**Admin dashboard** — Clients, audits started, completed, completion rate,
average score, open consultation requests, and recent audit activity.

**Question management** — Create categories, add questions, reorder them, and
delete them. Changes apply to new audits; completed reports keep their frozen
snapshot, so historical results never change retroactively.

**JSON export and import** — Bulk question-bank editing in a portable format
that references services by name rather than internal ID.

---

## Under the hood

**Stack** — Next.js 14 (App Router) · TypeScript · Prisma 6 · PostgreSQL via
Supabase · Supabase Auth · Zod · Recharts · @react-pdf/renderer

**Data model** — Ten models: `Profile`, `Category`, `Question`, `Option`,
`Service`, `Client`, `Assessment`, `Proposal`, `Consultation`, and `AuthUser`
mapping Supabase's `auth.users`.

**Roles** — `ADMIN`, `STAFF`, `CLIENT`. A database trigger provisions a profile
on signup and reads the role only from `app_metadata`, which is service-role
writable; `raw_user_meta_data`, which a user controls at signup, is ignored. A
second trigger reverts any non-admin attempt to change a role. Both are covered
by tests, including a direct SQL attack attempt.

**Authorization in two layers** — Application guards on every route handler,
plus Row Level Security on all nine public tables.

**One scoring engine** — `computeScore`, `isVisible`, and
`collectRecommendations` are typed against structural minimums rather than
Prisma rows, so the identical functions run in the browser for the live preview
and on the server for the authoritative snapshot. There is no second
implementation to drift.

**Immutable reports** — `answersJson` is the source of truth; scores are cached
and recomputed on every save; `reportJson` freezes at completion so a report
stays reproducible even after the question bank changes.

---

## Quality

| Gate | Result |
|---|---|
| Lint | Clean |
| Typecheck | Clean |
| Unit + integration tests | **135 passing** |
| Production build | Succeeds |
| API verification suite | **34/34 passing** |

Every feature was verified in a real browser against real PostgreSQL, not only
in unit tests. The final release check confirmed: an audit completed end to
end and wrote a client, answers, and a frozen report to the database; the PDF
endpoint returned a genuine PDF (verified by magic bytes); a consultation
request was stored; every auth page rendered; every protected route redirected
to `/login`; a resumed audit restored its saved answers; and no horizontal
overflow at 375 px.

---

## 1.0.1 — production hardening

Resolves the site-wide `500 MIDDLEWARE_INVOCATION_FAILED` outage.

**Cause.** The Supabase client was constructed from environment variables
asserted non-null. Missing in the production build, the constructor threw
inside middleware that matches every route. Nothing caught it, so the whole
site returned 500 — including public pages needing no authentication.

**Fix.** All four env-reading call sites now degrade instead of collapsing:
middleware logs the missing variable names and lets the request through,
`getCurrentProfile` treats an unreachable provider as "not signed in", and the
client factories fail with a message naming what is missing. Supabase calls in
middleware are wrapped, so an auth-provider outage cannot take the site down.

**Authorization is unchanged.** Every protected page already re-checks the
session server-side, verified by test and by request: `/dashboard`,
`/dashboard/history`, `/admin` and `/admin/questions` all still redirect to
`/login`.

**Prevention.** `scripts/check-env.mjs` runs in the build and fails loudly on
a misconfiguration. `scripts/verify-production.mjs` runs 59 checks against a
deployment and exits non-zero on any failure.

**New documentation.** `SUPABASE_SETUP.md`, `VERCEL_SETUP.md`,
`DEPLOYMENT_CHECKLIST.md`, `.env.example`, `.env.production.example`.

Measured with no Supabase variables at build or runtime:

| | Before | After |
|---|---|---|
| Public routes | 500 | 200 |
| Protected routes | 500 | 307 → `/login` |
| API suite | unreachable | 34/34 pass |

---

## Upgrading

Two new migrations since the last release. Apply in order:

```bash
npm ci
npm run db:migrate     # includes the consultations table and its RLS policies
npm run db:seed        # only for a fresh database
```

Optional new environment variable:

```
NEXT_PUBLIC_CALENDLY_URL   # enables the scheduler on /consultation
```

Everything else is unchanged — see `DEPLOYMENT.md`.

**Creating the first admin.** Signup cannot grant elevated roles by design.
After the first user registers:

```sql
update public.profiles set role = 'ADMIN' where email = 'you@example.com';
```

---

## Known limitations

These are deliberate scope boundaries for 1.0, tracked in `PRIORITY.md`.

**No rate limiting.** `POST /api/assessments` is public and creates two rows
per call. This is the most significant open risk before a public launch and is
the top Priority 1 item remaining.

**No security headers or CSRF protection.** CSP, HSTS, and frame options are
unset.

**No email delivery.** Resume tokens are generated and usable, but nothing is
emailed yet — a resume link has to be shared manually. Password reset relies on
Supabase's own email.

**No business landing page.** `/` is the audit itself, with no separate
marketing or positioning page.

**Two SCALE questions cannot trigger recommendations.** The engine only
triggers from `Option.recommendedService`, and scale questions have no options.
Their services are seeded so staff can wire them up.

**Question authoring is partial.** The admin UI creates categories and scale
questions and reorders or deletes anything; authoring options with points and
recommendations still goes through JSON import.

**The audit screen keeps its own report rendering.** A shared `ReportView`
powers the standalone report page and the PDF, but `AuditApp` retains an inline
copy. Consolidating them was judged too risky to do mid-release.

**Deployment is unverified from the build environment.** Outbound access to
Vercel and Supabase is blocked by network policy here, so no live URL was
confirmed. `scripts/verify-deployment.mjs` checks a deployed instance in 34
assertions once one is reachable.

---

## What's next

Priority 1 remaining: rate limiting, security headers and CSRF, email
delivery, the business landing page, and client/company profile editing.

Priority 2 (v1.1): staff dashboard, CRM pipeline and lead management, Excel
export, analytics with per-question drop-off, audit logs, notification centre,
conditional-logic builder, and Calendly-backed scheduling.

Priority 4 (v2.0): the AI suite — website, SEO and competitor analyzers, a
narrative report generator, a RAG knowledge base, and multi-tenancy.

One decision is worth making before launch rather than after: **multi-tenancy**.
Reserving a tenant boundary across the existing tables is inexpensive now and
materially harder to retrofit later.
