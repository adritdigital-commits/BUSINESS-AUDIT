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

The Prisma/Supabase backend documented further down still exists and still
compiles; the frontend simply does not call it yet. See
[LOCAL_DEV.md](LOCAL_DEV.md) for running the database layer.

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

`src/_deferred/` holds the pages, routes and middleware that require Prisma
or Supabase. They are not routed and not executed — see
[src/_deferred/README.md](src/_deferred/README.md) for what is there and how
to restore it.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| DB / Auth | Supabase (Postgres + Auth) |
| ORM | Prisma 6 |
| Validation | Zod |
| Charts | Recharts |

## Folder structure

```
prisma/
  schema.prisma                  Data model (see "Database" below)
  migrations/
    <ts>_init/                   Tables, enums, indexes, foreign keys
    <ts>_auth_rls/               Auth trigger, role guards, RLS policies
  seed.ts                        8 worked categories + service library

src/
  _deferred/                     Prisma/Supabase-backed pages + middleware (not routed)
  data/                          The bundled question bank and service catalogue
  lib/
    audit/                       Local scoring, report, proposal, storage, provider
    pdf/                         Client-side PDF export
    prisma.ts                    PrismaClient singleton (HMR-safe)
    auth.ts                      getCurrentProfile / requireRole guards
    api.ts                       Uniform error → JSON response mapping
    scoring.ts                   computeScore, isVisible, collectRecommendations
    report.ts                    generateReport (strengths/gaps/roadmap/budget)
    questionBank.ts              Loads the active bank in scoring's shape
    assessmentAccess.ts          Who may read/write a given assessment
    supabase/
      client.ts                  Browser client
      server.ts                  Server Components / Route Handlers
      middleware.ts              Session refresh helper
      admin.ts                   Service-role client (bypasses RLS)
  app/
    api/                         Route handlers (see "API" below)
    page.tsx, audit/, report/,
    proposal/                    The local-only audit journey
  components/
    audit/, report/, charts/,
    ui/, layout/                 The frontend's own components
    AuditApp.tsx                 Earlier API-driven prototype, no longer routed
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

Everything under `/api`. `[staff]` = ADMIN or STAFF required.

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
