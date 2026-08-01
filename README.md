# RakeshProTech Business Growth Audit

A consultant-grade business growth audit: 35 questions across seven
categories, weighted per-category scoring, a Digital Maturity Score, and an
auto-generated report with strengths, gaps, prioritised recommendations, a
90-day roadmap, a commercial proposal and a downloadable PDF.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). **No database, no
Supabase project, no environment file and no network access are required** —
the whole journey runs on the question bank bundled in `src/data`, and
progress is kept in the browser's `localStorage`.

There is no `/api` route in the application: the frontend makes no HTTP
request of any kind, so there is nothing to 500. `src/offline.test.ts`
asserts that as a property of the source tree — it fails if any file under
`src/` (outside `src/_deferred`) calls `fetch`, references an `/api/` path,
imports Prisma or Supabase, or declares a server action.

The Prisma/Supabase backend is preserved under `src/_deferred/`, which is
excluded from the compiler, the linter and the test run. See
[src/_deferred/README.md](src/_deferred/README.md) to restore it and
[LOCAL_DEV.md](LOCAL_DEV.md) for running the database layer.

### Verifying

```bash
npm run build     # 8 static routes, no /api/*
npm test          # includes the offline guard and the PDF layout regression
```

In a production build (`npm run build && npm start`) the Network tab shows
zero failed requests. Under `npm run dev`, Next 14's dev server issues a
second RSC payload request per navigation and cancels the first, so you will
see aborted `?_rsc=` entries for the app's own pages. They are not `/api`
calls, they have no user-visible effect, and they do not occur in a
production build.

## The frontend

```
/                     Landing page, with a worked sample report
/audit                Resumes at the furthest step your saved progress supports
/audit/client         Step 1 — who the report is addressed to
/audit/business       Step 2 — the business being assessed
/audit/questions      Step 3 — 35 questions: previous, next, skip, autosave,
                      keyboard entry, validation, live per-category scoring
/report               Score, maturity stage, risk, category breakdown,
                      strengths/weaknesses, quick wins, investment priority,
                      90-day roadmap, recommended services
/proposal             Executive summary, scope, effort, timeline, benefits,
                      delivery schedule and terms — generated from the report
```

Everything is a pure function of `(answers, details)`:

```
src/data/questionBank.ts   7 categories × 5 questions, with the services each answer triggers
src/data/services.ts       Service catalogue: deliverables, benefits, effort, timeline, cost
src/lib/audit/scoring.ts   getPoints → category scores → weighted overall; triggered findings
src/lib/audit/report.ts    Maturity stage, risk, strengths/gaps, quick wins, roadmap, budget
src/lib/audit/proposal.ts  The commercial document, derived from the report
src/lib/audit/storage.ts   Defensive localStorage persistence
src/lib/audit/AuditProvider.tsx  The single source of truth for the audit in progress
src/lib/pdf/               Client-side PDF export (dynamically imported at click time)
```

The screen, the proposal and the PDF are three renderings of one `Report`
object, so they cannot disagree.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS over CSS custom properties |
| Charts | Hand-built SVG — no charting library |
| PDF | @react-pdf/renderer, in the browser |
| Data | Bundled TypeScript modules in `src/data` |
| DB / Auth | Supabase + Prisma 6 — **deferred, see `src/_deferred`** |

## Folder structure

```
prisma/
  schema.prisma                  Data model (see "Database" below)
  migrations/
    <ts>_init/                   Tables, enums, indexes, foreign keys
    <ts>_auth_rls/               Auth trigger, role guards, RLS policies
  seed.ts                        8 worked categories + service library

src/
  offline.test.ts                Fails if any backend dependency leaks into the frontend
  data/
    questionBank.ts              7 categories × 5 questions, bundled
    services.ts                  The service catalogue
    formOptions.ts               Select values for the two detail forms
  lib/
    audit/                       Scoring, report, proposal, storage, provider, validation
    pdf/                         Client-side PDF export (dynamic import at click time)
    format.ts, cn.ts             Shared helpers
  app/
    page.tsx                     Landing
    audit/{client,business,questions}/   The three capture steps
    report/, proposal/           The two outputs
  components/
    audit/, report/, charts/,
    ui/, layout/                 The frontend's own components

  _deferred/                     THE WHOLE BACKEND — not compiled, routed, linted or tested
    app/api/**                   The route handlers that answered /api/*
    app/{(auth),auth,admin,dashboard,consultation,audit-id,report-id}/
    middleware.ts                Supabase session refresh
    lib/{prisma,auth,api,apiClient,questionBank,scoring,report,…}.ts
    lib/supabase/**              Browser, server, middleware and service-role clients
    components/{AuditApp,admin,auth,consultation,dashboard}/
    tests/factories.ts           Prisma-shaped fixtures
```

## Database

Nine models. `Category → Question → Option` is the admin-authored question
bank; `Option.recommendedService` is what turns a low-scoring answer into a
line item on the generated report and proposal.

```
AuthUser (auth.users, Supabase-managed)
  └─1:1─ Profile ──role: ADMIN | STAFF | CLIENT
           ├─ clientId ──────────────► Client        (CLIENT: which business they belong to)
           ├─ managedClients ────────► Client[]      (STAFF/ADMIN: book of accounts)
           ├─ claimedAssessments ───► Assessment[]
           └─ createdProposals ─────► Proposal[]

Category ──1:N──► Question ──1:N──► Option ──N:1──► Service
                  (showIfJson gates visibility)     (recommendedService)

Client ──1:N──► Assessment ──1:N──► Proposal
                (answersJson is the source of truth;
                 overallScore/categoryScoresJson are cached;
                 reportJson is frozen once COMPLETED)
```

Scoring is computed, not stored redundantly: `answersJson` is authoritative,
and `overallScore` / `categoryScoresJson` are recalculated on every autosave.
`reportJson` is snapshotted at completion so historical reports stay
reproducible even if question weights change later.

### Auth & roles

Supabase Auth owns `auth.users`. A DB trigger auto-creates a matching
`profiles` row on signup. Role comes from `raw_app_meta_data` (service-role
writable only), never `raw_user_meta_data` (client-writable at signup) — so
a user cannot self-register as ADMIN. A second trigger reverts any non-admin
attempt to change a role via direct update.

| Role | Can |
|---|---|
| ADMIN | Everything, including managing roles |
| STAFF | Question bank CRUD, clients, assessments, proposals |
| CLIENT | Own client record, own assessments and proposals |
| anonymous | Read the active question bank; start + complete an audit via `resumeToken` |

Authorization is enforced in two independent layers: application code
(`src/lib/auth.ts`, used by every route handler over Prisma's direct
connection) and Postgres RLS policies (defense-in-depth for any query
arriving through the Supabase client).

Anonymous audits get a `resumeToken` — the audit can be started and finished
before any account exists, which keeps completion rates high. Once the user
logs in, `PATCH /api/assessments/:id { claim: true }` attaches it to them.

## API

These handlers now live under `src/_deferred/app/api` and are not routed.
They are the contract to restore when the backend is reconnected.
`[staff]` = ADMIN or STAFF required.

```
GET    /api/categories                    Question bank (public; hides `purpose` from non-staff)
POST   /api/categories                    [staff]
PATCH  /api/categories/[id]               [staff]
DELETE /api/categories/[id]               [staff]
POST   /api/categories/reorder            [staff] bulk order update

GET    /api/questions?categoryId=         [staff]
POST   /api/questions                     [staff] (nested options)
PATCH  /api/questions/[id]                [staff] (`options` replaces wholesale)
DELETE /api/questions/[id]                [staff]
POST   /api/questions/reorder             [staff] bulk order update

POST   /api/assessments                   Start (public — issues resumeToken)
GET    /api/assessments                   [staff] list
GET    /api/assessments/[id]?token=       Fetch / resume
PATCH  /api/assessments/[id]?token=       Update status, or claim after login
POST   /api/assessments/[id]/answer?token= Autosave one answer + live score
POST   /api/assessments/[id]/complete?token= Finalize, compute, freeze reportJson
GET    /api/assessments/[id]/report?token= Frozen snapshot, or live preview

GET    /api/clients                       [staff] search + paginate
POST   /api/clients                       [staff]
GET    /api/clients/[id]                  [staff], or the owning CLIENT
PATCH  /api/clients/[id]                  [staff] full; CLIENT limited to contact details

POST   /api/proposals                     [staff] auto-generate from assessment, or manual items
GET    /api/proposals                     [staff]
GET    /api/proposals/[id]                [staff], or the owning CLIENT
PATCH  /api/proposals/[id]                [staff]
POST   /api/proposals/[id]/accept         Owning CLIENT (or staff on their behalf)

GET    /api/services                      [staff]
POST   /api/services                      [staff]
PATCH  /api/services/[id]                 [staff]
DELETE /api/services/[id]                 [staff]

GET    /api/admin/export/json             [staff] portable question-bank export
POST   /api/admin/import/json             [staff] upsert-only import
```

## Scripts

```bash
npm run db:generate      # prisma generate — no longer run on install or build
npm run db:baseline      # one-time Supabase prep before the first db:migrate
npm run db:migrate       # prisma migrate deploy (production)
npm run db:verify        # 58 read-only checks: schema, RLS, triggers, seed
npm run db:migrate:dev   # prisma migrate dev (local, creates migrations)
npm run db:seed          # load 8 worked categories + service library
npm run db:studio        # browse data
npm run db:reset         # drop, re-migrate, re-seed (destructive)
```

## Reconnecting the backend

The frontend is complete and self-contained. To put the database behind it:

1. Restore the surfaces listed in [src/_deferred/README.md](src/_deferred/README.md),
   deciding which owns `/audit` and `/report`.
2. Map the API's category/question payloads onto the types in
   `src/lib/audit/types.ts` and swap `src/data/questionBank.ts` for a loader.
   Nothing else in the UI knows where the data came from.
3. Persist `AuditState` server-side alongside `localStorage`, so an audit can
   be resumed from another device.

Still open beyond that: the admin panel UI, Excel export, the client
dashboard, and magic-link email delivery.
