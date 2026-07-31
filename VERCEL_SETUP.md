# Vercel Setup

Assumes Supabase is provisioned and migrated — see `SUPABASE_SETUP.md` first.

---

## 1. Import the project

1. <https://vercel.com/new> → import `adritdigital-commits/BUSINESS-AUDIT`
2. Framework preset: **Next.js** (auto-detected)
3. Build command: leave default. `package.json` already runs
   `node scripts/check-env.mjs && prisma generate && next build`
4. Node version: 20.x or later (enforced by `engines` in `package.json`)
5. **Do not deploy yet** — add environment variables first, or the first
   build ships without them.

---

## 2. Environment variables

**Settings → Environment Variables**, scoped to **Production** (and Preview if
you want working preview deployments):

| Variable | Where it comes from | Secret |
|---|---|---|
| `DATABASE_URL` | Supabase → Database → pooler, `?pgbouncer=true` | yes |
| `DIRECT_URL` | Supabase → Database → direct, port 5432 | yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API → Project URL | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API → anon key | no |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API → service_role | **yes** |

Optional: `NEXT_PUBLIC_CALENDLY_URL`.

See `.env.production.example` for the exact shape of each value.

> ### The one thing that breaks deployments
>
> `NEXT_PUBLIC_*` variables are **inlined into the JavaScript bundle at build
> time**. Adding them in the dashboard does **not** affect an existing
> deployment — it keeps whatever it was built with.
>
> **After adding or changing any variable, trigger a new deployment.**
> Restarting or redeploying-from-cache is not sufficient.
>
> This is precisely what caused the `500 MIDDLEWARE_INVOCATION_FAILED`
> outage: the middleware constructed a Supabase client from `undefined`
> credentials, threw, and — because the matcher covers every route — took
> down the entire site including public pages.
>
> The app now degrades gracefully instead of collapsing (public pages keep
> serving, protected pages still redirect), and `scripts/check-env.mjs` fails
> the build loudly. But the site will not actually *work* until the variables
> are present at build time.

---

## 3. Deploy

**Deployments → Redeploy**, with **"Use existing build cache" unchecked**.

Watch the build log for the preflight line:

```
✓ All 5 required environment variables are set.
```

If instead you see `WARNING: environment is not fully configured`, the build
will still succeed but the deployment will not function — fix the variables
and redeploy.

---

## 4. Point Supabase back at the deployment

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://your-domain.vercel.app`
- **Redirect URLs**: `https://your-domain.vercel.app/**`

Skipping this makes email confirmation and password reset links fail.

---

## 5. Verify

```bash
node scripts/verify-production.mjs https://your-domain.vercel.app
```

16 checks across the whole surface. Exits non-zero on any failure, so it can
gate a release. See `DEPLOYMENT_CHECKLIST.md` for the manual steps it cannot
cover (anything requiring a real signed-in session).

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `500 MIDDLEWARE_INVOCATION_FAILED` on every route | Supabase variables absent at build time | Add them, redeploy without cache |
| Site loads, `/api/categories` returns 500 | `DATABASE_URL` wrong or migrations not run | Check the string; run `npm run db:migrate` |
| Audit shows no questions | Migrations ran, seed did not | `npm run db:seed` |
| Login succeeds, redirect fails | Supabase Site URL / Redirect URLs unset | Section 4 above |
| `prepared statement "s0" already exists` | Pooled URL missing `?pgbouncer=true` | Add the parameter, redeploy |
| Connection-pool exhaustion under load | No `connection_limit` | Append `&connection_limit=1` to `DATABASE_URL` |
| Build fails on `prisma generate` | — | It needs no database; check `postinstall` is intact |
