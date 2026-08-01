import { prisma } from "@/lib/prisma";
import { classifyDbError } from "@/lib/dbDiagnostics";
import { readSupabaseEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — deployment diagnostics in a single request.
 *
 * Reports which environment variables are present (never their values),
 * whether the database is reachable, whether migrations have been applied,
 * and whether the question bank is seeded. Returns 503 when the deployment
 * cannot serve the audit, so it doubles as an uptime check.
 *
 * Everything here is derived from presence and error type. No secret, host,
 * connection string or database user is ever included in the response.
 */
export async function GET() {
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
    DIRECT_URL: Boolean(process.env.DIRECT_URL?.trim()),
  };
  const missingEnv = Object.entries(env)
    .filter(([, present]) => !present)
    .map(([name]) => name);

  // Whether the pooled URL carries the pgbouncer flag — a frequent cause of
  // intermittent "prepared statement already exists" failures on serverless.
  const pgbouncerFlagged = /[?&]pgbouncer=true/.test(process.env.DATABASE_URL ?? "");

  const database: {
    reachable: boolean;
    migrationsApplied: boolean | null;
    seeded: boolean | null;
    counts: Record<string, number> | null;
    code?: string;
    hint?: string;
  } = { reachable: false, migrationsApplied: null, seeded: null, counts: null };

  try {
    // 1. Can we connect at all?
    await prisma.$queryRaw`SELECT 1`;
    database.reachable = true;

    // 2. Do the application tables exist?
    const [categories, questions, options, services] = await Promise.all([
      prisma.category.count(),
      prisma.question.count(),
      prisma.option.count(),
      prisma.service.count(),
    ]);

    database.migrationsApplied = true;
    database.counts = { categories, questions, options, services };
    database.seeded = categories > 0 && questions > 0;
  } catch (error) {
    const diagnosis = classifyDbError(error);
    database.code = diagnosis?.code ?? "UNKNOWN";
    database.hint = diagnosis?.hint ?? "Unrecognised error. Check server logs.";
    if (diagnosis?.code === "DB_TABLES_MISSING" || diagnosis?.code === "DB_COLUMN_MISSING") {
      database.reachable = true;
      database.migrationsApplied = false;
    }
    console.error("[health] database check failed:", error);
  }

  const supabaseConfigured = readSupabaseEnv().ok;
  const ready =
    missingEnv.length === 0 &&
    database.reachable &&
    database.migrationsApplied === true &&
    database.seeded === true;

  return Response.json(
    {
      ready,
      env: { missing: missingEnv, pgbouncerFlagged },
      supabaseConfigured,
      database,
      checkedAt: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 }
  );
}
