# Local Development

How to run the whole application on localhost, including the database, with
no Supabase project and no production credentials.

---

## What needs real credentials, and what doesn't

| Area | Runs locally without Supabase? |
|---|---|
| Homepage, the audit flow, scoring, reports, PDF | Yes |
| The question bank and all public API routes | Yes |
| Assessment create / autosave / resume / complete | Yes |
| Consultation booking | Yes |
| Route gating (anonymous is redirected/rejected) | Yes |
| **Signing in, signing up, password reset** | **No — needs a real Supabase project** |
| **Anything behind a session: /dashboard, /admin** | **No — needs a real Supabase project** |

The reason is that Supabase Auth owns `auth.users` and issues the session
cookie. There is no local stand-in for it in this repo. Everything else talks
to Postgres through Prisma and works against a plain local database.

Supply these three from a real Supabase project when you need the auth half:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Do not invent them — a placeholder lets the app boot, but every auth call
fails at the network layer. That failure is handled (the app degrades to
"signed out" instead of erroring), which is why the rest of the app still
works.

---

## 1. Start a local Postgres

Any PostgreSQL 14+ instance works. Example using a throwaway cluster:

```bash
initdb -D /tmp/pgdata -U postgres --auth=trust
pg_ctl -D /tmp/pgdata -o '-p 55432' -w start
createdb -h 127.0.0.1 -p 55432 -U postgres business_audit_dev
```

## 2. Provide the Supabase-shaped `auth` schema

This step is not optional. `prisma/migrations/*_init` puts a **real foreign
key** on `auth.users`, and the RLS migration defines policies that call
`auth.uid()`. Against a plain Postgres with no `auth` schema, `db:migrate`
fails with `relation "auth.users" does not exist`.

```bash
psql -h 127.0.0.1 -p 55432 -U postgres -d business_audit_dev <<'SQL'
CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id                 uuid PRIMARY KEY,
  email              text UNIQUE,
  raw_user_meta_data jsonb,
  raw_app_meta_data  jsonb,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
SQL
```

Only the columns the signup trigger reads are needed: `id`, `email`,
`raw_user_meta_data`, `raw_app_meta_data`.

## 3. Configure `.env`

```bash
cp .env.example .env
```

Then set the database pair to your local instance. Locally the two URLs are
the same — the pooled/direct split only exists on Supabase:

```
DATABASE_URL="postgresql://postgres@127.0.0.1:55432/business_audit_dev"
DIRECT_URL="postgresql://postgres@127.0.0.1:55432/business_audit_dev"
```

Leave the three Supabase values as placeholders if you are not testing auth.
They must be non-empty, or the middleware logs a warning and skips session
refresh.

Verify:

```bash
npm run check-env      # reads .env; expects all 5 present
```

## 4. Initialize the database

```bash
npm install
npm run db:baseline    # creates _prisma_migrations; see SUPABASE_SETUP.md §3
npm run db:migrate
npm run db:seed
```

`db:baseline` is needed here for the same reason as on Supabase: the `auth`
schema you created in step 2 makes the database non-empty, so Prisma would
otherwise abort with `P3005`.

## 5. Run

```bash
npm run dev            # http://localhost:3000
```

---

## Verifying the local install

`/api/health` reports everything in one request:

```bash
curl -s localhost:3000/api/health
```

Expect `"ready": true` and counts of `8 / 13 / 35 / 24`.

The full suite also runs against localhost:

```bash
node scripts/verify-production.mjs http://localhost:3000
```

Expect **63 passed, 0 failed**. Every check that requires a signed-in
session verifies the *gate* (anonymous is redirected or rejected) rather than
the page, so the suite passes without real Supabase credentials.

---

## Destructive commands

`db:push`, `db:migrate:dev` and `db:reset` reconcile the database to
`schema.prisma`, which models `auth.users` with only its `id` column — they
will **drop** `email`, `raw_user_meta_data` and `raw_app_meta_data`, breaking
the signup trigger. `scripts/guard-destructive-db.mjs` blocks them against any
non-local host, but they are permitted against localhost, so re-run step 2
if you use them.
