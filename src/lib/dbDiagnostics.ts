/**
 * Classifies database failures into a safe, actionable code.
 *
 * Prisma's raw messages embed the host and database user, so they are never
 * returned to a caller. Each branch below maps to a short code plus a hint
 * describing the fix — enough to diagnose a deployment without leaking
 * anything about the connection.
 *
 * Signatures confirmed empirically against PostgreSQL 16.
 */

export type DbErrorCode =
  | "DB_UNREACHABLE"
  | "DB_AUTH_FAILED"
  | "DB_NOT_FOUND"
  | "DB_TABLES_MISSING"
  | "DB_COLUMN_MISSING"
  | "DB_PGBOUNCER_CONFIG"
  | "DB_TIMEOUT"
  | "DB_URL_MISSING"
  | "DB_URL_INVALID"
  | "UNKNOWN";

export interface DbDiagnosis {
  code: DbErrorCode;
  hint: string;
}

const HINTS: Record<DbErrorCode, string> = {
  DB_UNREACHABLE:
    "Cannot reach the database host. Check DATABASE_URL's host and port, and that the database is not paused.",
  DB_AUTH_FAILED:
    "Database rejected the credentials. Check the password in DATABASE_URL; percent-encode any @ : / ? # [ ] % characters.",
  DB_NOT_FOUND:
    "The named database does not exist. Check the path segment of DATABASE_URL — for Supabase it is usually /postgres.",
  DB_TABLES_MISSING:
    "Connected, but the tables do not exist. Migrations have not been applied to this database: run `npm run db:migrate`.",
  DB_COLUMN_MISSING:
    "A column is missing — migrations are partially applied. Run `npm run db:migrate`.",
  DB_PGBOUNCER_CONFIG:
    "Prepared-statement conflict from connection pooling. Append `?pgbouncer=true` to DATABASE_URL.",
  DB_TIMEOUT:
    "The database did not respond in time. Check pool limits; consider `&connection_limit=1` on serverless.",
  DB_URL_MISSING: "DATABASE_URL is not set in this environment.",
  DB_URL_INVALID: "DATABASE_URL is set but could not be parsed as a connection string.",
  UNKNOWN: "Unrecognised database error. Check the server logs for the full stack trace.",
};

/** Maps an unknown thrown value to a safe diagnosis, or null if it is not a database error. */
export function classifyDbError(error: unknown): DbDiagnosis | null {
  if (!(error instanceof Error)) return null;

  const name = error.constructor?.name ?? "";
  const code = (error as { code?: string }).code;
  const message = error.message ?? "";

  // Known request errors carry a stable P-code.
  if (code === "P2021") return diagnose("DB_TABLES_MISSING");
  if (code === "P2022") return diagnose("DB_COLUMN_MISSING");
  if (code === "P1001") return diagnose("DB_UNREACHABLE");
  if (code === "P1000") return diagnose("DB_AUTH_FAILED");
  if (code === "P1003") return diagnose("DB_NOT_FOUND");
  if (code === "P1008" || code === "P2024") return diagnose("DB_TIMEOUT");

  // Initialization errors do not expose a code, so match on the message.
  // Any P-coded error is a Prisma error regardless of the class name, which
  // is not preserved through some serialization boundaries.
  const isDbError =
    /^P\d{4}$/.test(code ?? "") ||
    name === "PrismaClientInitializationError" ||
    name === "PrismaClientKnownRequestError" ||
    name === "PrismaClientUnknownRequestError" ||
    /prisma/i.test(message);

  if (!isDbError) return null;

  if (/can'?t reach database server/i.test(message)) return diagnose("DB_UNREACHABLE");
  if (/authentication failed/i.test(message)) return diagnose("DB_AUTH_FAILED");
  if (/does not exist/i.test(message) && /database/i.test(message)) return diagnose("DB_NOT_FOUND");
  if (/does not exist in the current database/i.test(message)) return diagnose("DB_TABLES_MISSING");
  if (/prepared statement/i.test(message)) return diagnose("DB_PGBOUNCER_CONFIG");
  if (/timed out|timeout/i.test(message)) return diagnose("DB_TIMEOUT");
  if (/environment variable not found|datasource.*url/i.test(message)) return diagnose("DB_URL_MISSING");
  if (/invalid.*(connection string|url|protocol)/i.test(message)) return diagnose("DB_URL_INVALID");

  return diagnose("UNKNOWN");
}

function diagnose(code: DbErrorCode): DbDiagnosis {
  return { code, hint: HINTS[code] };
}
