import { ZodError } from "zod";
import { AuthError } from "@/lib/auth";

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
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
