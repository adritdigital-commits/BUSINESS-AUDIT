# Deferred backend

**Nothing in this directory is compiled, routed, linted or tested.**

It is excluded from `tsconfig.json`, from `.eslintrc.json` and from
`vitest.config.mts`, and it sits outside `src/app`, which is the only tree
Next.js routes. The frontend cannot reach it even by accident — that property
is asserted by `src/offline.test.ts`, which fails the build if any active
source file imports Prisma, imports Supabase, calls `fetch`, or mentions an
`/api/` path.

Everything here needs a database, Supabase Auth, or both, at request time.
While the frontend runs entirely on the bundled question bank in `src/data`,
leaving any of it live would mean `npm run dev` on a clean checkout serves
500s — which is exactly what it did before.

## Contents

This tree mirrors `src/`, so restoring a file is a move back to the same path.

| Path here | Original path | Requires |
| --- | --- | --- |
| `app/api/**` | `src/app/api/**` | Prisma — **these are what answered `/api/categories`** |
| `app/(auth)/*` | `src/app/(auth)/*` | Supabase Auth |
| `app/auth/*` | `src/app/auth/*` | Supabase Auth |
| `app/admin/*` | `src/app/admin/*` | Prisma + staff session |
| `app/dashboard/*` | `src/app/dashboard/*` | Prisma + session |
| `app/consultation/page.tsx` | `src/app/consultation/page.tsx` | Prisma |
| `app/audit-id/page.tsx` | `src/app/audit/[id]/page.tsx` | Prisma |
| `app/report-id/page.tsx` | `src/app/report/[id]/page.tsx` | Prisma |
| `middleware.ts` | `src/middleware.ts` | Supabase Auth |
| `lib/prisma.ts` | `src/lib/prisma.ts` | Prisma |
| `lib/supabase/**` | `src/lib/supabase/**` | Supabase |
| `lib/auth.ts` | `src/lib/auth.ts` | Supabase + Prisma |
| `lib/api.ts` | `src/lib/api.ts` | Route-handler error mapping |
| `lib/apiClient.ts` | `src/lib/apiClient.ts` | The browser client that called `/api/*` |
| `lib/assessmentAccess.ts` | `src/lib/assessmentAccess.ts` | Prisma row types |
| `lib/questionBank.ts` | `src/lib/questionBank.ts` | Prisma |
| `lib/scoring.ts` | `src/lib/scoring.ts` | Prisma enum types |
| `lib/report.ts` | `src/lib/report.ts` | Prisma row types |
| `lib/adminStats.ts` | `src/lib/adminStats.ts` | Prisma |
| `lib/dashboardData.ts` | `src/lib/dashboardData.ts` | Prisma |
| `lib/dbDiagnostics.ts` | `src/lib/dbDiagnostics.ts` | Prisma |
| `lib/env.ts` | `src/lib/env.ts` | Supabase env contract |
| `lib/pdf/ReportDocument.tsx` | `src/lib/pdf/ReportDocument.tsx` | Server-side PDF for the API route |
| `lib/pdf/filename.ts` | `src/lib/pdf/filename.ts` | Used by the PDF route only |
| `components/AuditApp.tsx` | `src/components/AuditApp.tsx` | The prototype that fetched `/api/categories` |
| `components/{admin,auth,consultation,dashboard}/**` | same under `src/components/` | API calls / Supabase |
| `components/report/ReportView.tsx` | `src/components/report/ReportView.tsx` | Prisma-shaped `Report` |
| `components/ui/{Shell,theme}.{tsx,ts}` | same under `src/components/ui/` | Chrome for the pages above |
| `tests/factories.ts` | `tests/factories.ts` | Prisma-shaped fixtures |

Their unit tests travel with them and run again once they are restored.

The active frontend keeps its own copies where it needs the same idea:
`src/lib/audit/{scoring,report}.ts` score against local types, and
`src/lib/pdf/{AuditPdfDocument.tsx,download.ts}` render the PDF in the
browser. `src/lib/format.ts` stayed in place — it is pure formatting and both
sides use it.

## Restoring

1. `git mv` the directory back to its original path from the table above,
   restoring the `[id]` segment names for the two dynamic routes. They were
   renamed on the way in because `src/app/audit/[id]` collides with the local
   flow's `/audit/client`, `/audit/business` and `/audit/questions` — decide
   which owns `/audit` and `/report` before restoring those two.
2. Drop `src/_deferred` from the `exclude` lists in `tsconfig.json`,
   `vitest.config.mts` and `.eslintrc.json` (or narrow them to what is left).
3. Put Prisma back in the install and build path: restore
   `"postinstall": "prisma generate"` and, if you want the deploy gate back,
   `"build": "node scripts/check-env.mjs && prisma generate && next build"`.
   `npm run db:generate` runs the generator in the meantime.
4. Relax `src/offline.test.ts` to match whatever is allowed to talk to the
   backend — or delete it, if the frontend is no longer meant to run alone.

Nothing under `prisma/` was touched: the schema, the migrations and the seed
are exactly as they were.
