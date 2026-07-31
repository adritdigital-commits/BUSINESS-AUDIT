# Deployment Checklist

Work top to bottom. Do not skip step 6 — a build that predates the
environment variables will not work no matter what the dashboard says.

---

## 1. Supabase

- [ ] Project created; database password saved
- [ ] `DATABASE_URL` copied — pooled, port **6543**, ends `?pgbouncer=true`
- [ ] `DIRECT_URL` copied — direct, port **5432**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` copied
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` copied
- [ ] `SUPABASE_SERVICE_ROLE_KEY` copied and stored as a secret

Details: `SUPABASE_SETUP.md`

## 2. Database

- [ ] `npm run check-env:production` — all 5 set, right ports, one project
- [ ] `npm run db:baseline` — one-time; without it `db:migrate` fails with `P3005`
- [ ] `npm run db:migrate` — all three migrations applied
- [ ] `npm run db:seed` — question bank loaded
- [ ] `npm run db:verify` — 58 checks; covers everything below in one command
- [ ] Seed verified: **8** categories, **13** questions, **35** options, **24** services
- [ ] Conditional logic verified: **2** questions carry `showIfJson`

```sql
select
  (select count(*) from categories) as categories,
  (select count(*) from questions)  as questions,
  (select count(*) from options)    as options,
  (select count(*) from services)   as services;
```

## 3. Row Level Security

- [ ] All **9** public tables report `rowsecurity = t`
- [ ] **23** policies exist in total

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public' order by tablename;

select count(*) from pg_policies where schemaname = 'public';
```

## 4. Authentication behaviour

- [ ] Inserting an `auth.users` row auto-creates a `profiles` row
- [ ] The new profile defaults to `CLIENT`
- [ ] A signup carrying `{"role":"ADMIN"}` in `raw_user_meta_data` still
      produces `CLIENT` — **if this yields ADMIN, stop and fix the trigger**

SQL in `SUPABASE_SETUP.md` §5.

## 5. Vercel environment variables

Set for the **Production** environment:

- [ ] `DATABASE_URL`
- [ ] `DIRECT_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- [ ] `NEXT_PUBLIC_CALENDLY_URL`

## 6. Deploy — the step that is usually got wrong

- [ ] Triggered a **fresh** deployment **after** the variables were set
- [ ] Build cache **not** reused
- [ ] Build log shows `✓ All 5 required environment variables are set.`

> `NEXT_PUBLIC_*` values are compiled into the JavaScript bundle at build
> time. An existing deployment keeps whatever it was built with, so adding a
> variable in the dashboard changes nothing until you rebuild. This is the
> exact cause of the `500 MIDDLEWARE_INVOCATION_FAILED` outage.

## 7. Supabase redirect URLs

- [ ] Site URL set to the production domain
- [ ] Redirect URLs include `https://your-domain.vercel.app/**`

## 8. Automated verification

- [ ] `node scripts/verify-production.mjs https://your-domain.vercel.app`
- [ ] Ends with `59 passed, 0 failed`

Covers: environment variables · middleware · database connection · security ·
authentication surface · assessment creation · autosave · resume · report
generation · PDF · consultation booking · dashboard, admin and question-
management gates · database writes.

## 9. Manual checks the script cannot perform

These need a real session, so verify them by hand once:

- [ ] Register a new account at `/register`
- [ ] Confirmation email arrives (if confirmation is enabled)
- [ ] Sign in at `/login`
- [ ] `/dashboard` renders and shows the empty state
- [ ] Complete an audit while signed in; it appears on the dashboard
- [ ] `/dashboard/history` lists it
- [ ] Resume an unfinished audit from the dashboard
- [ ] Promote yourself to ADMIN (SQL below), then confirm `/admin` renders
- [ ] `/admin/questions` lists categories; reorder persists after refresh
- [ ] Sign out returns you to `/login`
- [ ] Forgot-password email arrives and the reset link works

```sql
update public.profiles set role = 'ADMIN' where email = 'you@example.com';
```

## 10. Post-launch

- [ ] Delete the demo seed rows if you want a clean database
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is not exposed to the browser
      (it must never be prefixed `NEXT_PUBLIC_`)
- [ ] Note the known gaps in `RELEASE_NOTES.md` — most importantly there is
      **no rate limiting** on `POST /api/assessments`, which is public and
      writes two rows per call

---

## If something fails

| Symptom | Go to |
|---|---|
| 500 on every route | `VERCEL_SETUP.md` → Troubleshooting |
| API 500s, pages fine | Database section of `VERCEL_SETUP.md` |
| Audit has no questions | Step 2 above — seed did not run |
| Login redirect fails | Step 7 above |
| Migration errors | `SUPABASE_SETUP.md` → Troubleshooting |
