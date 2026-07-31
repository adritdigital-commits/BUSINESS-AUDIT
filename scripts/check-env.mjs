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
 *
 * Reads `.env` for local development, the same file Prisma and Next.js read.
 * Real environment variables (Vercel, CI) always take precedence.
 */

import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

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
const production = process.argv.includes("--production");

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

// --- Production shape checks ------------------------------------------------
// Presence is not enough in production: the values must point at the SAME
// Supabase project, use the right ports, and not be swapped. Everything below
// is derived — no secret is ever printed.
const prodProblems = [];
const prodNotes = [];

if (production && missing.length === 0) {
  const dbUrl = process.env.DATABASE_URL.trim();
  const directUrl = process.env.DIRECT_URL.trim();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY.trim();

  const port = (u) => { try { return new URL(u).port; } catch { return ""; } };

  // DATABASE_URL — pooled, 6543, pgbouncer=true.
  if (port(dbUrl) === "5432") {
    prodNotes.push("DATABASE_URL uses port 5432 (direct). It works, but loses pooling; serverless should use 6543.");
  } else if (port(dbUrl) !== "6543") {
    prodProblems.push(`DATABASE_URL should use the pooled port 6543 (found ${port(dbUrl) || "none"}).`);
  }
  if (!/[?&]pgbouncer=true/.test(dbUrl)) {
    prodProblems.push('DATABASE_URL is missing ?pgbouncer=true — causes "prepared statement s0 already exists" under load.');
  }
  if (!/[?&]connection_limit=/.test(dbUrl)) {
    prodNotes.push("DATABASE_URL has no connection_limit. On Vercel, &connection_limit=1 is recommended.");
  }

  // DIRECT_URL — session mode, 5432. Prisma Migrate cannot use the pooler.
  if (port(directUrl) === "6543") {
    prodProblems.push("DIRECT_URL points at the transaction pooler (6543). Migrations will hang or fail; use 5432.");
  } else if (port(directUrl) !== "5432") {
    prodProblems.push(`DIRECT_URL should use the direct port 5432 (found ${port(directUrl) || "none"}).`);
  }

  // An un-encoded password silently truncates the URL at the special char.
  for (const [name, value] of [["DATABASE_URL", dbUrl], ["DIRECT_URL", directUrl]]) {
    const password = value.match(/^postgres(?:ql)?:\/\/[^:/?#]+:([^@]*)@/)?.[1];
    if (password && /[@:/?#[\]]/.test(decodeURIComponent(password) === password ? password : "")) {
      prodProblems.push(`${name} password contains a character that must be percent-encoded (@ : / ? # [ ]).`);
    }
  }

  // NEXT_PUBLIC_SUPABASE_URL — canonical project URL.
  const urlRef = supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/)?.[1];
  if (!urlRef) {
    prodProblems.push("NEXT_PUBLIC_SUPABASE_URL should look like https://<project-ref>.supabase.co (no path, no trailing segment).");
  }

  // Keys: legacy Supabase keys are unsigned-readable JWTs carrying `ref` and
  // `role`. Decoding the payload (no verification) catches the two dangerous
  // mistakes: keys swapped, or keys from a different project than the URL.
  const decode = (jwt) => {
    const part = jwt.split(".")[1];
    if (!part) return null;
    try { return JSON.parse(Buffer.from(part, "base64url").toString("utf8")); }
    catch { return null; }
  };

  const anonClaims = decode(anonKey);
  const serviceClaims = decode(serviceKey);

  if (anonClaims?.role && anonClaims.role !== "anon") {
    prodProblems.push(
      `NEXT_PUBLIC_SUPABASE_ANON_KEY carries role "${anonClaims.role}", not "anon". ` +
        "If this is the service_role key it is exposed to every browser and bypasses RLS — rotate it immediately."
    );
  }
  if (serviceClaims?.role && serviceClaims.role !== "service_role") {
    prodProblems.push(`SUPABASE_SERVICE_ROLE_KEY carries role "${serviceClaims.role}", not "service_role".`);
  }
  if (anonKey === serviceKey) {
    prodProblems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are identical.");
  }
  if (!anonClaims && !/^sb_publishable_/.test(anonKey)) {
    prodNotes.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is neither a JWT nor an sb_publishable_ key — cannot verify its role.");
  }
  if (!serviceClaims && !/^sb_secret_/.test(serviceKey)) {
    prodNotes.push("SUPABASE_SERVICE_ROLE_KEY is neither a JWT nor an sb_secret_ key — cannot verify its role.");
  }

  // Every value must belong to ONE project. Mixing two is a classic outage:
  // the app authenticates against project A and queries project B's database.
  const refs = new Map();
  if (urlRef) refs.set("NEXT_PUBLIC_SUPABASE_URL", urlRef);
  if (anonClaims?.ref) refs.set("NEXT_PUBLIC_SUPABASE_ANON_KEY", anonClaims.ref);
  if (serviceClaims?.ref) refs.set("SUPABASE_SERVICE_ROLE_KEY", serviceClaims.ref);
  for (const [name, value] of [["DATABASE_URL", dbUrl], ["DIRECT_URL", directUrl]]) {
    const ref =
      value.match(/postgres\.([a-z0-9]+)[:@]/)?.[1] ??
      value.match(/@db\.([a-z0-9]+)\.supabase\.co/)?.[1];
    if (ref) refs.set(name, ref);
  }
  const distinct = new Set(refs.values());
  if (distinct.size > 1) {
    prodProblems.push(
      "Values reference more than one Supabase project: " +
        [...refs].map(([n, r]) => `${n}→${r}`).join(", ") +
        ". All five must come from the same project."
    );
  } else if (distinct.size === 1) {
    prodNotes.push(`All values resolve to Supabase project "${[...distinct][0]}".`);
  }
}

if (missing.length === 0 && invalid.length === 0 && prodProblems.length === 0) {
  console.log(`✓ All ${REQUIRED.length} required environment variables are set.`);
  if (production) {
    console.log("✓ Production shape checks passed (ports, pgbouncer, key roles, project consistency).");
    for (const note of prodNotes) console.log(`  note: ${note}`);
  }
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

if (prodProblems.length > 0) {
  console.log("Production configuration problems:");
  for (const problem of prodProblems) console.log(`  ✗ ${problem}`);
  console.log("");
}

if (prodNotes.length > 0) {
  console.log("Notes:");
  for (const note of prodNotes) console.log(`  · ${note}`);
  console.log("");
}

console.log(
  "NEXT_PUBLIC_* values are inlined at build time. Adding them to the hosting\n" +
    "dashboard does not affect an existing deployment — you must redeploy.\n"
);

// A production shape problem is always fatal: unlike a missing variable during
// a local build, it means the deployed app would point somewhere wrong.
process.exit(strict || prodProblems.length > 0 ? 1 : 0);
