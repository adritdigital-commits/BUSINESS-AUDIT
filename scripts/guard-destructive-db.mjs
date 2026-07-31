#!/usr/bin/env node
/**
 * Refuses to run a destructive Prisma command against a non-local database.
 *
 *   node scripts/guard-destructive-db.mjs <command-label>
 *
 * Why this exists
 * ---------------
 * `prisma db push` and `prisma migrate dev` reconcile the database to
 * schema.prisma. Our schema models `auth.users` with only the `id` column,
 * because that is all we need for the `profiles.id` foreign key — but the
 * real Supabase table also holds `email`, `raw_user_meta_data`,
 * `raw_app_meta_data` and more.
 *
 * Prisma therefore treats those columns as drift and DROPS them. Verified:
 * running `db push` against a Supabase-shaped database reduced `auth.users`
 * to a single `id` column. In production that destroys Supabase Auth —
 * every user's email is lost and `handle_new_user()` breaks, because it
 * reads NEW.email and NEW.raw_app_meta_data.
 *
 * Production migrations must always go through `prisma migrate deploy`
 * (`npm run db:migrate`), which only applies the committed SQL files and
 * never diffs against the schema.
 */

const label = process.argv[2] ?? "this command";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

if (!url) {
  console.error(`\nRefusing to run ${label}: no DATABASE_URL or DIRECT_URL is set.\n`);
  process.exit(1);
}

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "::1", "0.0.0.0", "host.docker.internal"];

let host = "";
try {
  host = new URL(url).hostname;
} catch {
  console.error(`\nRefusing to run ${label}: the connection string could not be parsed.\n`);
  process.exit(1);
}

const isLocal = LOCAL_HOSTS.includes(host);

if (!isLocal) {
  console.error(`
${"=".repeat(70)}
BLOCKED: ${label} targets a remote database (${host}).

This command reconciles the database to schema.prisma. Because the schema
models auth.users with only its id column, Prisma would DROP the rest —
email, raw_user_meta_data, raw_app_meta_data — destroying Supabase Auth.

For a remote or production database, use:

    npm run db:migrate        # prisma migrate deploy

which applies only the committed migration files and never diffs.

If you genuinely need this against a remote database, run the underlying
prisma command directly and understand what it will drop first:

    npx prisma migrate diff \\
      --from-url "$DIRECT_URL" \\
      --to-schema-datamodel prisma/schema.prisma --script
${"=".repeat(70)}
`);
  process.exit(1);
}

console.log(`Target is local (${host}) — proceeding with ${label}.`);
