import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";
import { classifyDbError } from "@/lib/dbDiagnostics";

/** Uniform error → JSON response mapping for route handlers. */
export function handleApiError(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return Response.json({ error: "Validation failed", issues: error.issues }, { status: 400 });
  }
  if (error instanceof Error && "code" in error && error.code === "P2025") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  console.error(error);

  // A bare "Internal server error" makes a deployment undiagnosable without
  // log access. The classification below is derived from the error type only
  // — it never echoes Prisma's message, which embeds the host and db user.
  const dbDiagnosis = classifyDbError(error);
  if (dbDiagnosis) {
    return Response.json(
      { error: "Database error", code: dbDiagnosis.code, hint: dbDiagnosis.hint },
      { status: 500 }
    );
  }

  return Response.json({ error: "Internal server error" }, { status: 500 });
}
