# RakeshProTech Business Growth Audit

A consultant-grade business growth audit: gated conditional questions,
weighted per-category scoring, a Digital Maturity Score, and an
auto-generated report with strengths, gaps, prioritized recommendations,
and a 90-day roadmap.

The frontend (`src/components/AuditApp.tsx`) is the interactive prototype,
unchanged. The backend below is the production layer it plugs into.

## Getting started

```bash
npm install
cp .env.example .env        # fill in Supabase credentials
npm run db:migrate          # apply migrations
npm run db:seed             # load the 8 worked categories
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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
  middleware.ts                  Session refresh + coarse route protection
  lib/
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
    page.tsx, layout.tsx         Existing frontend — untouched
  components/
    AuditApp.tsx                 Existing prototype UI — untouched
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
npm run db:migrate       # prisma migrate deploy (production)
npm run db:migrate:dev   # prisma migrate dev (local, creates migrations)
npm run db:seed          # load 8 worked categories + service library
npm run db:studio        # browse data
npm run db:reset         # drop, re-migrate, re-seed (destructive)
```

## What's not built yet

Per the architecture doc's phasing, still open: the admin panel UI (Phase 2),
PDF/Excel export renderers (Phase 3), the client dashboard and magic-link
email delivery (Phase 4), and content entry for the remaining ~37 categories.
The report engine (`src/lib/report.ts`) is already the single source of truth
those three renderers would share.
