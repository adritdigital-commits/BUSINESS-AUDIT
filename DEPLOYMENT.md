# Deployment

The app deploys to Vercel with Supabase as the production database. Every
step below has been verified locally against a real Postgres and a real
production build — what remains requires account access (Vercel project
creation, Supabase provisioning, billing) that only the account owner can
grant.

Total time: ~15 minutes.

---

## 1. Create the Supabase project

1. <https://supabase.com/dashboard> → **New project**
2. Note the database password you set — it goes in the connection strings.
3. Wait for provisioning to finish (~2 min).

## 2. Collect credentials

**Project Settings → Database → Connection string**, and read both:

| Variable | Which string | Port | Used for |
|---|---|---|---|
| `DATABASE_URL` | Transaction pooler, append `?pgbouncer=true` | 6543 | Runtime queries |
| `DIRECT_URL` | Session / direct connection | 5432 | Prisma Migrate |

Both are required — Prisma Migrate cannot run over the pooler.

**Project Settings → API**:

| Variable | Value | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / publishable key | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key | **Server only — never expose** |

## 3. Run migrations and seed

From a machine with network access to Supabase, against the project clone:

```bash
npm ci
export DATABASE_URL="<pooled connection string>"
export DIRECT_URL="<direct connection string>"

npm run db:baseline    # one-time, before the first migrate on a Supabase DB
npm run db:migrate     # applies all three migrations
npm run db:seed        # loads the 8 worked categories + service library
```

> `db:baseline` is required on Supabase. Because `schema.prisma` manages both
> `auth` and `public`, and Supabase always provisions `auth.users`, Prisma
> sees a non-empty database with no migration history and aborts with
> `P3005 The database schema is not empty` — even though `public` is empty.
> `db:baseline` creates the empty `_prisma_migrations` table so `migrate
> deploy` proceeds; it marks nothing as applied and skips no migration.
> See SUPABASE_SETUP.md §3.

Migration order matters and is handled automatically:
1. `*_init` — tables, enums, indexes, foreign keys
2. `*_auth_rls` — the `handle_new_user` trigger, role-escalation guard, and
   all RLS policies
3. `*_consultations` — the `consultations` table, its enum, and its RLS policies

> The `*_init` migration adds a foreign key from `public.profiles.id` to
> `auth.users.id`, so it must run against a database where Supabase Auth is
> already provisioned. On a real Supabase project it always is.

Verify:

```bash
npx prisma studio     # should show 8 categories, 13 questions, 24 services
```

## 4. Create the Vercel project

1. <https://vercel.com/new> → import `adritdigital-commits/BUSINESS-AUDIT`
2. Framework preset: **Next.js** (auto-detected)
3. Build command: leave default — `package.json` already runs
   `prisma generate && next build`
4. Do **not** deploy yet; add environment variables first.

## 5. Configure environment variables

In **Settings → Environment Variables**, add all five to Production
(and Preview, if you want working preview deploys):

```
DATABASE_URL                    postgresql://...pooler...:6543/postgres?pgbouncer=true
DIRECT_URL                      postgresql://...:5432/postgres
NEXT_PUBLIC_SUPABASE_URL        https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY   <anon key>
SUPABASE_SERVICE_ROLE_KEY       <service role key>
```

Then **Deploy**.

## 6. Configure Supabase Auth redirects

Supabase → **Authentication → URL Configuration**:

- Site URL: `https://<your-deployment>.vercel.app`
- Redirect URLs: add `https://<your-deployment>.vercel.app/**`

Without this, magic links and OAuth callbacks bounce.

## 7. Create the first admin

New signups default to `CLIENT` by design — the signup path cannot grant
`ADMIN`. Promote the first admin directly:

```sql
-- Supabase → SQL Editor, after the user has signed up once
update public.profiles set role = 'ADMIN' where email = 'you@example.com';
```

Subsequent staff can be invited via the Auth Admin API with
`app_metadata: { role: 'STAFF' }` (see `src/lib/supabase/admin.ts`).

## 8. Verify the deployment

```bash
node scripts/verify-deployment.mjs https://<your-deployment>.vercel.app
```

Runs 34 checks covering homepage render, database connectivity, the seeded
question bank, auth gating on all privileged endpoints, assessment
creation, conditional-logic gating, scoring, completion, report generation,
and snapshot immutability. Exits non-zero on any failure.

Expected output ends with `34 passed, 0 failed`.

---

## Troubleshooting

**`Can't reach database server`** — `DATABASE_URL` is probably the direct
string rather than the pooled one, or the password contains unescaped
special characters. URL-encode the password.

**`prepared statement "s0" already exists`** — the pooled URL is missing
`?pgbouncer=true`.

**`Table 'public.categories' does not exist`** — migrations were not run, or
were run against a different project than the one Vercel points at.

**Question bank is empty / homepage loads but audit has no questions** —
migrations ran but `npm run db:seed` did not.

**`relation "auth.users" does not exist` during migration** — the target
database is not a Supabase project (Auth not provisioned).

**Migrations time out** — `DIRECT_URL` is pointing at the pooler (6543).
Prisma Migrate needs the session-mode port (5432).
