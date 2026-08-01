# RakeshProTech Business Growth Audit

An adaptive, consultant-grade business assessment. It builds a business
profile first, then selects the questions worth asking that particular
business — up to 35 from a bank of 132, chosen by industry, stage, size,
acquisition channels and stated priorities, with follow-ups unlocked by the
answers themselves. Two different businesses do not get the same audit.

It produces nine capability scores, an overall Digital Maturity Score with a
confidence level, business risk and growth opportunity, a six-horizon roadmap
costed per task, a proposal scoped only to what the answers triggered, and a
downloadable PDF.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). **No database, no
Supabase project, no environment file and no network access are required** —
the whole journey runs on the question banks bundled in `src/data` and the
rules in `src/engine`, and progress is kept in the browser's `localStorage`.

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
/audit/business       Step 2 — the business profile, with a live preview of the
                      assessment it has just produced
/audit/questions      Step 3 — the adaptive flow: previous, next, skip, autosave,
                      keyboard entry, validation, per-domain sections, live scoring,
                      and the reason each question was selected
/report               Maturity score, risk, opportunity, confidence, nine capability
                      scores, strengths/weaknesses, quick wins vs long-term work,
                      investment priority, six-horizon roadmap, recommended services
/proposal             Executive summary, scope, effort, timeline, benefits,
                      delivery schedule and terms — scoped to the triggered services
/game                 A standalone twelve-pair memory game (see below)
```

## /game

A separate page that shares the palette and the UI primitives with the audit
and nothing else — no shared state in either direction, asserted in
`src/offline.test.ts`.

```
src/components/game/  GameBoard, MemoryCard, ScoreBoard, VictoryModal,
                      GameHeader, CardSymbol
src/lib/game/         deck.ts (12 symbols, 24 cards, Fisher–Yates)
                      engine.ts (the rules, as pure functions)
                      storage.ts (best score, defensively parsed)
                      sound.ts (oscillator cues — no audio file to load)
                      useMemoryGame.ts (the only stateful piece)
```

Timer, move counter, personal best in `localStorage`, restart (button or
`R`), a win celebration, and synthesised sound with a toggle. Fully keyboard
operable: Tab and arrow keys move, Enter or Space turns a card, the victory
dialog traps focus and closes on Escape. Symbols are told apart by shape, not
colour. Like the rest of the app it makes no network request at all.

## The assessment engine

All business logic lives in `src/engine`. **No rule is written inside a React
component** — the components render what the engine returns.

```
src/engine/
  types.ts                 The domain: 9 capability domains, the profile, and the
                           declarative `Condition` union every rule is expressed in
  domains.ts               The nine domains and their base weights
  businessProfile/         Profile options + `deriveSignals()` — hasWebsite,
                           isLocal, isB2B, isYoung, isSmallTeam, prioritySet, …
  questionEngine/          `planAssessment(profile, answers)`
    conditions.ts          Evaluates a Condition, and explains it to the user
    selection.ts           Quotas, relevance ranking, screening breadth, ordering
  industryRules/           13 verticals: domain emphasis, injected topics, playbook;
                           plus the goal → domain weight table
  scoreEngine/             Nine domain scores, maturity stage, confidence, risk,
                           growth opportunity
  recommendationEngine/    Findings → ranked engagements, each citing its evidence
  roadmapEngine/           Six horizons, prerequisites, team-size concurrency
  proposalEngine/          The commercial document, from the recommendations only
```

How a question is chosen:

1. **Eligibility.** Every question declares `triggerConditions` — data, not
   code, so a rule is inspectable, testable and explainable. A business with
   no website is not asked about page speed, search rankings or site
   analytics; it is asked how customers reach it instead.
2. **Quotas.** 10 core + 10 industry + 10 goal + 5 business-size = 35, with
   spillover so a short industry bank still yields a full-length assessment.
3. **Screening breadth.** Every domain with anything eligible gets at least
   one question before depth is added, so the nine-axis report has no holes.
   A domain stays unscored only when nothing about it applies.
4. **Relevance.** Ranked by question weight × industry emphasis × goal
   emphasis, adjusted for the channels the business actually uses and its
   stage. Selection is deterministic — the same profile always produces the
   same set — and already-answered questions are pinned, so the flow only ever
   grows forwards.
5. **Follow-ups.** An answer can unlock a deeper question, inserted directly
   after its parent and removed again if the parent answer changes.

Data the engine reads:

```
src/data/questionBanks/       10 domain banks + 10 industry banks
                              132 questions: 61 domain, 60 industry, 11 follow-ups
src/data/services.ts          39 services: deliverables, benefits, effort,
                              timeline, cost, difficulty, impact, ROI, horizon
```

The screen, the proposal and the PDF are three renderings of one `Assessment`
object, so they cannot disagree.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS over CSS custom properties |
| Charts | Hand-built SVG — no charting library |
| PDF | @react-pdf/renderer, in the browser |
| Data | Bundled TypeScript modules in `src/data`, rules in `src/engine` |
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
  engine/                        The assessment engine — see above. All business rules.
    businessProfile/ questionEngine/ industryRules/
    scoreEngine/ recommendationEngine/ roadmapEngine/ proposalEngine/
    fixtures.ts                  Shared test businesses: clinic, manufacturer, restaurant
  data/
    questionBanks/               10 domain banks + industry/ — 132 questions
    services.ts                  The service catalogue
  lib/
    audit/                       Storage, provider, validation — state, not rules
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
2. Map the API's category/question payloads onto `Question` in
   `src/engine/types.ts` and swap `src/data/questionBanks/index.ts` for a
   loader. The engine consumes a bank, not a source; nothing above it knows
   where the questions came from.
3. Persist `AuditState` server-side alongside `localStorage`, so an audit can
   be resumed from another device.

Adding a vertical is two files and no code changes elsewhere: a bank in
`src/data/questionBanks/industry/`, and a rule in
`src/engine/industryRules/verticals.ts` declaring its domain emphasis,
priority services, injected topics and narrative.

Still open beyond that: the admin panel UI, Excel export, the client
dashboard, and magic-link email delivery.
