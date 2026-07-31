#!/usr/bin/env node
/**
 * Prepares a Supabase database to receive `prisma migrate deploy`.
 *
 *   node scripts/baseline-db.mjs
 *
 * Why
 * ---
 * schema.prisma declares `schemas = ["auth", "public"]`, so Prisma treats the
 * Supabase-owned `auth` schema as part of the database it manages. `auth` is
 * never empty on Supabase — GoTrue creates `auth.users` at project creation —
 * so `migrate deploy` sees a non-empty database with no migration history and
 * aborts with P3005 ("The database schema is not empty"), even though `public`
 * has zero tables and every migration still needs to run.
 *
 * This applies prisma/baseline.sql, which creates the empty
 * `_prisma_migrations` table. No migration is marked as applied, so
 * `migrate deploy` still runs all of them. Re-running is a no-op.
 *
 * Uses DIRECT_URL: the pooler (6543) cannot run DDL.
 */

import { spawnSync } from "node:child_process";
import { loadEnvFile } from "./load-env.mjs";

// Prisma's CLI reads `.env` on its own; a bare node script does not.
loadEnvFile();

const url = process.env.DIRECT_URL?.trim();

if (!url) {
  console.error(
    "\nRefusing to baseline: DIRECT_URL is not set.\n\n" +
      "It must be the DIRECT connection string (port 5432), not the pooled one.\n" +
      "Prisma Migrate cannot run DDL through the transaction pooler.\n"
  );
  process.exit(1);
}

let port = "";
try {
  port = new URL(url).port;
} catch {
  console.error("\nRefusing to baseline: DIRECT_URL could not be parsed as a URL.\n");
  process.exit(1);
}

if (port === "6543") {
  console.error(
    "\nRefusing to baseline: DIRECT_URL points at the transaction pooler (port 6543).\n\n" +
      "Use the direct connection string on port 5432. Migrations run through the\n" +
      "pooler hang or fail — see SUPABASE_SETUP.md.\n"
  );
  process.exit(1);
}

console.log("Baselining migration history (creates _prisma_migrations if absent)...");

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "db", "execute", "--url", url, "--file", "prisma/baseline.sql"],
  { stdio: "inherit" }
);

if (result.status !== 0) {
  console.error("\nBaseline failed. The database was not modified.\n");
  process.exit(result.status ?? 1);
}

console.log("Baseline complete — `npm run db:migrate` can now apply all migrations.");
