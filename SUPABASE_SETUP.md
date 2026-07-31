# Supabase Setup

For a **fresh Supabase project**. Nothing is assumed to exist.

Time: ~15 minutes.

---

## 1. Create the project

1. <https://supabase.com/dashboard> → **New project**
2. Choose a region close to your users (India → `ap-south-1`).
3. **Save the database password now.** It appears once and goes into both
   connection strings.
4. Wait for provisioning (~2 min).

Supabase Auth (`auth.users`, `auth.uid()`) is provisioned automatically. The
schema depends on it — `public.profiles.id` is a real foreign key into
`auth.users.id` — so migrations must run against a Supabase database, not a
plain PostgreSQL instance.

---

## 2. Collect credentials

**Project Settings → Database → Connection string**

| Variable | String | Port | Used by |
|---|---|---|---|
| `DATABASE_URL` | Transaction pooler, add `?pgbouncer=true` | 6543 | App at runtime |
| `DIRECT_URL` | Session / direct | 5432 | Prisma Migrate |

Both are required. Prisma Migrate cannot run DDL through the pooler.

**Project Settings → API**

| Variable | Value | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` / publishable | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` | **Secret — server only** |

---

## 3. Run migrations

From a machine that can reach Supabase:

```bash
npm ci

export DATABASE_URL="<pooled connection string>"
export DIRECT_URL="<direct connection string>"

npm run check-env          # confirms all five variables are present
npm run db:migrate         # prisma migrate deploy
```

Three migrations apply in order:

| Migration | Creates |
|---|---|
| `*_init` | 8 tables, 5 enums, all indexes and foreign keys |
| `*_auth_rls` | `handle_new_user` trigger, role-escalation guard, RLS on 8 tables |
| `*_consultations` | `consultations` table, its enum, and 3 RLS policies |

Expected output ends with `All migrations have been successfully applied.`

### SQL applied (reference)

You do not need to run these by hand — `db:migrate` does it. Listed so you
know what lands in the database.

**Helper functions** (`SECURITY DEFINER`, to avoid RLS self-recursion):

```sql
public.current_role_name()  -- returns the caller's Role
public.current_client_id()  -- returns the caller's clientId
```

**Triggers on `auth.users` and `public.profiles`:**

```sql
on_auth_user_created            -- auto-creates a profile row on signup
profiles_prevent_role_escalation -- reverts non-admin role changes
```

The signup trigger reads the role from `raw_app_meta_data` only — which is
service-role writable — and ignores `raw_user_meta_data`, which a user
controls at signup. This is what makes self-registration as ADMIN impossible.

---

## 4. Seed the question bank

```bash
npm run db:seed
```

Loads 8 categories, 13 questions, 35 options and 24 services, plus one demo
client/assessment/proposal.

**Skip the demo rows in production** if you prefer a clean database — they use
fixed ids (`seed-demo-client`, `seed-demo-assessment`, `seed-demo-proposal`)
and can be deleted safely:

```sql
delete from proposals   where id = 'seed-demo-proposal';
delete from assessments where id = 'seed-demo-assessment';
delete from clients     where id = 'seed-demo-client';
```

---

## 5. Verify

### Seed verification

Supabase → SQL Editor:

```sql
select
  (select count(*) from categories) as categories,   -- expect 8
  (select count(*) from questions)  as questions,    -- expect 13
  (select count(*) from options)    as options,      -- expect 35
  (select count(*) from services)   as services;     -- expect 24
```

Conditional logic wired correctly (expect 2 rows):

```sql
select text, "showIfJson" from questions where "showIfJson" is not null;
```

### RLS verification

Every public table must have RLS enabled (expect 9 rows, all `t`):

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
```

Policies present (expect 23):

```sql
select tablename, count(*) as policies
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;
```

Expected shape:

| Table | Policies |
|---|---|
| assessments | 4 |
| categories | 2 |
| clients | 2 |
| consultations | 3 |
| options | 2 |
| profiles | 3 |
| proposals | 3 |
| questions | 2 |
| services | 2 |

### Authentication verification

Confirm the signup trigger and the escalation guard both work:

```sql
-- 1. A new auth user must get a profile, defaulting to CLIENT.
insert into auth.users (id, email)
values ('11111111-1111-1111-1111-111111111111', 'trigger-test@example.com');

select email, role from public.profiles where email = 'trigger-test@example.com';
-- expect: CLIENT

-- 2. A user must NOT be able to self-register as ADMIN via user_metadata.
insert into auth.users (id, email, raw_user_meta_data)
values ('22222222-2222-2222-2222-222222222222', 'escalate@example.com',
        '{"role":"ADMIN"}'::jsonb);

select email, role from public.profiles where email = 'escalate@example.com';
-- expect: CLIENT  ← if this says ADMIN, stop and re-check the trigger

-- Clean up
delete from auth.users where email in ('trigger-test@example.com', 'escalate@example.com');
```

---

## 6. Configure Auth redirects

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://your-domain.vercel.app`
- **Redirect URLs**: add `https://your-domain.vercel.app/**`

Without this, email confirmation and password-reset links bounce.

---

## 7. Create the first admin

Signup cannot grant elevated roles by design. Register normally through
`/register`, then promote:

```sql
update public.profiles set role = 'ADMIN' where email = 'you@example.com';
```

Confirm:

```sql
select email, role from public.profiles where role in ('ADMIN','STAFF');
```

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| `relation "auth.users" does not exist` | Target is not a Supabase project |
| Migrations hang or time out | `DIRECT_URL` points at the pooler (6543); use 5432 |
| `prepared statement "s0" already exists` | `DATABASE_URL` missing `?pgbouncer=true` |
| `Can't reach database server` | Password not percent-encoded, or wrong region host |
| `Table 'public.categories' does not exist` | Migrations not run, or run against a different project |
| Question bank empty in the app | Migrations ran but `db:seed` did not |
