#!/usr/bin/env node
/**
 * Preflight check for the environment variables the deployed app needs.
 *
 *   node scripts/check-env.mjs            # warn only (used during build)
 *   node scripts/check-env.mjs --strict   # exit 1 if anything is missing
 *
 * Catches the misconfiguration that produced a site-wide
 * MIDDLEWARE_INVOCATION_FAILED: NEXT_PUBLIC_* values are inlined at build
 * time, so a variable added to the hosting dashboard *after* a build is not
 * present in that build. Run this in the build step and the failure is loud
 * and early instead of a 500 on every request.
 */

const REQUIRED = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    note: "Supabase → Settings → API → Project URL. Inlined at build time.",
    validate: (v) => (/^https:\/\/.+/.test(v) ? null : "should start with https://"),
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    note: "Supabase → Settings → API → anon/publishable key. Inlined at build time.",
    validate: (v) => (v.length > 20 ? null : "looks too short to be a real key"),
  },
  {
    name: "DATABASE_URL",
    note: "Pooled connection (port 6543) with ?pgbouncer=true.",
    validate: (v) => (v.startsWith("postgres") ? null : "should be a postgres:// URL"),
  },
  {
    name: "DIRECT_URL",
    note: "Direct connection (port 5432). Prisma Migrate cannot use the pooler.",
    validate: (v) => (v.startsWith("postgres") ? null : "should be a postgres:// URL"),
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    note: "Supabase → Settings → API → service_role key. Server-only.",
    validate: (v) => (v.length > 20 ? null : "looks too short to be a real key"),
  },
];

const strict = process.argv.includes("--strict");

const missing = [];
const invalid = [];

for (const item of REQUIRED) {
  const value = process.env[item.name];
  if (!value || !value.trim()) {
    missing.push(item);
    continue;
  }
  const problem = item.validate?.(value.trim());
  if (problem) invalid.push({ ...item, problem });
}

if (missing.length === 0 && invalid.length === 0) {
  console.log(`✓ All ${REQUIRED.length} required environment variables are set.`);
  process.exit(0);
}

const label = strict ? "ERROR" : "WARNING";
console.log(`\n${label}: environment is not fully configured.\n`);

if (missing.length > 0) {
  console.log("Missing:");
  for (const item of missing) console.log(`  ✗ ${item.name}\n      ${item.note}`);
  console.log("");
}

if (invalid.length > 0) {
  console.log("Set but suspicious:");
  for (const item of invalid) console.log(`  ! ${item.name} — ${item.problem}`);
  console.log("");
}

console.log(
  "NEXT_PUBLIC_* values are inlined at build time. Adding them to the hosting\n" +
    "dashboard does not affect an existing deployment — you must redeploy.\n"
);

process.exit(strict ? 1 : 0);
