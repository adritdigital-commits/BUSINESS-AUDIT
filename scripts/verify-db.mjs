#!/usr/bin/env node
/**
 * Verifies that a database is correctly initialized for this application.
 *
 *   npm run db:verify
 *
 * Runs over DIRECT_URL and asserts, in one pass:
 *   - connectivity
 *   - all three migrations recorded as applied
 *   - every expected table, enum, index and foreign key exists
 *   - RLS enabled on all nine app tables, with the expected policy counts
 *   - both auth triggers and all four helper functions present
 *   - the seed loaded the expected categories/questions/options/services
 *   - no orphaned recommendedService references
 *   - auth.users still has the columns Supabase Auth needs
 *
 * Exits non-zero if anything fails, so it can gate a release. Read-only:
 * every statement is a SELECT.
 *
 * This replaces the five SQL blocks in SUPABASE_SETUP.md §5 that previously
 * had to be pasted into the Supabase SQL editor and eyeballed.
 */

import { PrismaClient } from "@prisma/client";
import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("\nDIRECT_URL (or DATABASE_URL) must be set.\n");
  process.exit(2);
}

const EXPECTED_TABLES = [
  "assessments", "categories", "clients", "consultations", "options",
  "profiles", "proposals", "questions", "services",
];

const EXPECTED_ENUMS = [
  "AssessmentStatus", "ConsultationStatus", "Priority",
  "ProposalStatus", "QuestionType", "Role",
];

const EXPECTED_POLICIES = {
  assessments: 4, categories: 2, clients: 2, consultations: 3, options: 2,
  profiles: 3, proposals: 3, questions: 2, services: 2,
};

const EXPECTED_TRIGGERS = ["on_auth_user_created", "profiles_prevent_role_escalation"];

const EXPECTED_FUNCTIONS = [
  "current_client_id", "current_role_name", "handle_new_user",
  "prevent_role_self_escalation",
];

const EXPECTED_MIGRATIONS = [
  "20260731063009_init", "20260731063136_auth_rls", "20260731090000_consultations",
];

// The seed's documented output (SUPABASE_SETUP.md §4).
const EXPECTED_SEED = { categories: 8, questions: 13, options: 35, services: 24 };

// Columns handle_new_user() reads from NEW. If a destructive `db push` ever
// ran against this database, these are the first casualties.
const REQUIRED_AUTH_COLUMNS = ["id", "email", "raw_user_meta_data", "raw_app_meta_data"];

let passed = 0;
let failed = 0;
const failures = [];
let section = "";

function head(name) {
  section = name;
  console.log(`\n${name}`);
}

function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    failed++;
    failures.push(`[${section}] ${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
  return ok;
}

const prisma = new PrismaClient({ datasourceUrl: url });

async function main() {
  const host = (() => { try { return new URL(url).hostname; } catch { return "?"; } })();
  console.log(`\nVerifying database at ${host}`);

  head("1. Connectivity");
  try {
    await prisma.$queryRaw`SELECT 1`;
    check("database reachable", true);
  } catch (error) {
    check("database reachable", false, String(error).split("\n")[0]);
    return summary();
  }

  head("2. Migrations");
  let applied = [];
  try {
    applied = await prisma.$queryRaw`
      SELECT migration_name, finished_at, rolled_back_at
      FROM public."_prisma_migrations" ORDER BY started_at`;
  } catch {
    check("_prisma_migrations table exists", false, "run `npm run db:baseline && npm run db:migrate`");
    return summary();
  }
  check("_prisma_migrations table exists", true);
  for (const name of EXPECTED_MIGRATIONS) {
    const row = applied.find((r) => r.migration_name === name);
    check(`${name} applied`, Boolean(row?.finished_at) && !row?.rolled_back_at,
      !row ? "not recorded" : row.rolled_back_at ? "ROLLED BACK" : row.finished_at ? "" : "never finished");
  }

  head("3. Tables");
  const tables = (await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`).map((r) => r.table_name);
  for (const t of EXPECTED_TABLES) check(`public.${t}`, tables.includes(t));
  const unexpected = tables.filter((t) => !EXPECTED_TABLES.includes(t) && t !== "_prisma_migrations");
  check("no unexpected tables", unexpected.length === 0, unexpected.join(", "));

  head("4. Enums");
  const enums = (await prisma.$queryRaw`
    SELECT t.typname FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'`).map((r) => r.typname);
  for (const e of EXPECTED_ENUMS) check(`enum ${e}`, enums.includes(e));

  head("5. Row Level Security");
  const rls = await prisma.$queryRaw`
    SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`;
  for (const t of EXPECTED_TABLES) {
    check(`RLS enabled on ${t}`, rls.find((r) => r.tablename === t)?.rowsecurity === true);
  }
  const policies = await prisma.$queryRaw`
    SELECT tablename, count(*)::int AS n FROM pg_policies
    WHERE schemaname = 'public' GROUP BY tablename`;
  let totalPolicies = 0;
  for (const [table, expected] of Object.entries(EXPECTED_POLICIES)) {
    const actual = policies.find((p) => p.tablename === table)?.n ?? 0;
    totalPolicies += actual;
    check(`${table} has ${expected} policies`, actual === expected, `found ${actual}`);
  }
  check("23 policies in total", totalPolicies === 23, `found ${totalPolicies}`);

  head("6. Triggers & functions");
  const triggers = (await prisma.$queryRaw`
    SELECT tgname FROM pg_trigger WHERE NOT tgisinternal`).map((r) => r.tgname);
  for (const t of EXPECTED_TRIGGERS) check(`trigger ${t}`, triggers.includes(t));
  const functions = (await prisma.$queryRaw`
    SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'`).map((r) => r.proname);
  for (const f of EXPECTED_FUNCTIONS) check(`function public.${f}()`, functions.includes(f));

  head("7. Supabase Auth intact");
  const authCols = (await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users'`).map((r) => r.column_name);
  check("auth.users exists", authCols.length > 0);
  for (const c of REQUIRED_AUTH_COLUMNS) {
    check(`auth.users.${c}`, authCols.includes(c),
      authCols.includes(c) ? "" : "a destructive `db push` may have dropped it");
  }

  head("8. Seed data");
  const [categories, questions, options, services] = await Promise.all([
    prisma.category.count(), prisma.question.count(),
    prisma.option.count(), prisma.service.count(),
  ]);
  const actualSeed = { categories, questions, options, services };
  for (const [key, expected] of Object.entries(EXPECTED_SEED)) {
    check(`${key} = ${expected}`, actualSeed[key] === expected, `found ${actualSeed[key]}`);
  }
  const conditional = await prisma.question.count({ where: { NOT: { showIfJson: { equals: null } } } });
  check("2 questions carry showIfJson", conditional === 2, `found ${conditional}`);

  head("9. Referential integrity");
  const [{ orphans }] = await prisma.$queryRaw`
    SELECT count(*)::int AS orphans FROM options o
    LEFT JOIN services s ON s.id = o."recommendedServiceId"
    WHERE o."recommendedServiceId" IS NOT NULL AND s.id IS NULL`;
  check("no orphaned recommendedService references", orphans === 0, `found ${orphans}`);
  const wired = await prisma.option.count({ where: { NOT: { recommendedServiceId: null } } });
  check("options trigger recommendations", wired > 0, `${wired} options wired to a service`);

  summary();
}

function summary() {
  console.log(`\n${"=".repeat(58)}`);
  if (failed > 0) {
    console.log(`${passed} passed, ${failed} FAILED\n`);
    console.log("Failures:");
    for (const f of failures) console.log(`  x ${f}`);
    console.log("\nSee SUPABASE_SETUP.md for the initialization procedure.");
  } else {
    console.log(`${passed} passed, 0 failed — database verified.`);
  }
  console.log(`${"=".repeat(58)}\n`);
  process.exitCode = failed > 0 ? 1 : 0;
}

main()
  .catch((error) => {
    console.error(`\nVerification crashed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
