# Deferred surfaces

Nothing in this directory is routed or executed. Next.js only routes files
under `src/app`; `src/middleware.ts` is likewise the only path the Edge
middleware is loaded from.

These files were moved here — not deleted — while the frontend runs entirely
on the bundled question bank in `src/data`, with no database, no Supabase and
no authentication. Every one of them requires at least one of those three at
request time, so leaving them routed would mean the app could not be run with
`npm run dev` on a clean checkout.

| Path here | Original path | Requires |
| --- | --- | --- |
| `app/(auth)/*` | `src/app/(auth)/*` | Supabase Auth |
| `app/auth/*` | `src/app/auth/*` | Supabase Auth |
| `app/admin/*` | `src/app/admin/*` | Prisma + staff session |
| `app/dashboard/*` | `src/app/dashboard/*` | Prisma + session |
| `app/consultation/page.tsx` | `src/app/consultation/page.tsx` | Prisma |
| `app/audit-id/page.tsx` | `src/app/audit/[id]/page.tsx` | Prisma |
| `app/report-id/page.tsx` | `src/app/report/[id]/page.tsx` | Prisma |
| `middleware.ts` | `src/middleware.ts` | Supabase Auth |

The API route handlers under `src/app/api` were **not** moved. They still
compile and are still the backend contract; the frontend simply does not call
them yet.

## Restoring one

Move the directory back to its original path from the table above (restoring
the `[id]` segment names for the two dynamic routes), and re-add
`src/middleware.ts`. The two dynamic routes were renamed on the way in because
`src/app/audit/[id]` would otherwise collide with the local flow's
`/audit/client`, `/audit/business` and `/audit/questions` segments — decide
which owns `/audit` before restoring them.
