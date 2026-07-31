import type { Priority, QuestionType } from "@prisma/client";
import type { Report } from "@/lib/report";
import type { AnswerEntry, CategoryScore } from "@/lib/scoring";

/**
 * Typed browser client for the audit API. The single place that knows how
 * to talk to `/api`, so callers never hand-roll fetch or error handling.
 */

export class ApiError extends Error {
  status: number;
  issues?: unknown;

  constructor(message: string, status: number, issues?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
  }

  /** Message safe to render to an end user. */
  get userMessage(): string {
    if (this.status === 0) return "Can't reach the server. Check your connection and try again.";
    if (this.status === 403) return "This audit link is no longer valid.";
    if (this.status === 404) return "We couldn't find that audit.";
    if (this.status === 409) return "This audit has already been completed.";
    if (this.status >= 500) return "Something went wrong on our end. Please try again.";
    return this.message;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    // Network failure — fetch rejects rather than returning a status.
    throw new ApiError("Network request failed", 0);
  }

  if (response.status === 204) return undefined as T;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const payload = body as { error?: string; issues?: unknown } | null;
    throw new ApiError(payload?.error ?? response.statusText, response.status, payload?.issues);
  }

  return body as T;
}

// --- Shapes returned by the API (serialized, so dates are strings) --------

export interface ApiOption {
  id: string;
  label: string;
  points: number;
  order: number;
  priority: Priority | null;
  timeToFix: string | null;
  costRangeMin: number | null;
  costRangeMax: number | null;
  recommendedService: { id: string; name: string } | null;
}

export interface ApiQuestion {
  id: string;
  categoryId: string;
  text: string;
  type: QuestionType;
  order: number;
  showIfJson: unknown;
  scaleMin: number | null;
  scaleMax: number | null;
  options: ApiOption[];
}

export interface ApiCategory {
  id: string;
  name: string;
  slug: string;
  weight: number;
  order: number;
  questions: ApiQuestion[];
}

export interface ApiAssessment {
  id: string;
  clientId: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  resumeToken: string | null;
  overallScore: number | null;
}

// --- Endpoints ------------------------------------------------------------

export const auditApi = {
  /** The active question bank. Public — no session required. */
  async getCategories(signal?: AbortSignal): Promise<ApiCategory[]> {
    const data = await request<{ categories: ApiCategory[] }>("/api/categories", { signal });
    return data.categories;
  },

  /** Starts an assessment. Anonymous callers receive a resumeToken. */
  async startAssessment(input: {
    businessName: string;
    email?: string;
  }): Promise<ApiAssessment> {
    const data = await request<{ assessment: ApiAssessment }>("/api/assessments", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return data.assessment;
  },

  /** Autosaves one answer and returns the recomputed live score. */
  async saveAnswer(
    assessmentId: string,
    token: string | null,
    questionId: string,
    answer: AnswerEntry
  ): Promise<{ overall: number; categoryScores: CategoryScore[] }> {
    return request(`/api/assessments/${assessmentId}/answer${tokenQuery(token)}`, {
      method: "POST",
      body: JSON.stringify({ questionId, answer }),
    });
  },

  /** Finalizes the assessment and returns the frozen report snapshot. */
  async complete(assessmentId: string, token: string | null): Promise<Report> {
    const data = await request<{ report: Report }>(
      `/api/assessments/${assessmentId}/complete${tokenQuery(token)}`,
      { method: "POST" }
    );
    return data.report;
  },

  /** Fetches the report — frozen if completed, live preview otherwise. */
  async getReport(assessmentId: string, token: string | null): Promise<{ report: Report; live: boolean }> {
    return request(`/api/assessments/${assessmentId}/report${tokenQuery(token)}`);
  },
};

function tokenQuery(token: string | null): string {
  return token ? `?token=${encodeURIComponent(token)}` : "";
}
