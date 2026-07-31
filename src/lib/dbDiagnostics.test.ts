import { describe, expect, it } from "vitest";
import { classifyDbError } from "@/lib/dbDiagnostics";

/**
 * Message strings below are verbatim from PostgreSQL 16 via Prisma 6,
 * captured by reproducing each failure against a real database.
 */

function knownRequestError(code: string, message: string) {
  const e = new Error(message) as Error & { code: string };
  e.code = code;
  return e;
}

describe("classifyDbError", () => {
  it("identifies an unreachable host", () => {
    const e = knownRequestError("P1001", "Can't reach database server at `db.x.supabase.co:5432`");
    expect(classifyDbError(e)?.code).toBe("DB_UNREACHABLE");
  });

  it("identifies failed authentication", () => {
    const e = knownRequestError("P1000", "Authentication failed against database server");
    expect(classifyDbError(e)?.code).toBe("DB_AUTH_FAILED");
  });

  it("identifies a missing database", () => {
    const e = knownRequestError("P1003", "Database `nosuchdb` does not exist");
    expect(classifyDbError(e)?.code).toBe("DB_NOT_FOUND");
  });

  it("identifies missing tables — the migrations-not-run case", () => {
    const e = knownRequestError(
      "P2021",
      "The table `public.categories` does not exist in the current database."
    );
    const diagnosis = classifyDbError(e);
    expect(diagnosis?.code).toBe("DB_TABLES_MISSING");
    expect(diagnosis?.hint).toMatch(/db:migrate/);
  });

  it("identifies a missing column — partially applied migrations", () => {
    expect(classifyDbError(knownRequestError("P2022", "Column does not exist"))?.code).toBe(
      "DB_COLUMN_MISSING"
    );
  });

  it("identifies a pooling misconfiguration", () => {
    const e = new Error('prepared statement "s0" already exists');
    (e as Error & { code?: string }).code = "P2010";
    // Falls through the code checks and matches on the message.
    expect(classifyDbError(e)?.code).toBe("DB_PGBOUNCER_CONFIG");
  });

  it("identifies a pool timeout", () => {
    expect(classifyDbError(knownRequestError("P2024", "Timed out fetching a connection"))?.code).toBe(
      "DB_TIMEOUT"
    );
  });

  it("classifies an unrecognised Prisma error rather than returning null", () => {
    const e = new Error("Some new PrismaClient failure nobody has seen");
    expect(classifyDbError(e)?.code).toBe("UNKNOWN");
  });

  it("returns null for errors that are not database related", () => {
    expect(classifyDbError(new TypeError("undefined is not a function"))).toBeNull();
    expect(classifyDbError("a string")).toBeNull();
    expect(classifyDbError(null)).toBeNull();
  });

  it("never leaks the original message, which embeds host and user", () => {
    const e = knownRequestError(
      "P1000",
      "Authentication failed against database server at `db.secret-project.supabase.co`, " +
        "the provided database credentials for `postgres.secretref` are not valid"
    );
    const diagnosis = classifyDbError(e);
    const serialized = JSON.stringify(diagnosis);
    expect(serialized).not.toContain("secret-project");
    expect(serialized).not.toContain("secretref");
  });
});
