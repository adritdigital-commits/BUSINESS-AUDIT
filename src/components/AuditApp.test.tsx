import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuditApp from "@/components/AuditApp";
import type { ApiCategory } from "@/lib/apiClient";

/**
 * Integration tests for the audit flow against a mocked API. These are the
 * regression net for the bug that made this feature necessary: the UI
 * previously never talked to the backend at all.
 */

const gateOptionYes = { id: "opt_yes", label: "Yes, basic site", points: 40, order: 1, priority: null, timeToFix: null, costRangeMin: null, costRangeMax: null, recommendedService: null };
const gateOptionNo = { id: "opt_no", label: "No website", points: 0, order: 0, priority: "HIGH" as const, timeToFix: "3–5 weeks", costRangeMin: 40000, costRangeMax: 150000, recommendedService: { id: "svc_web", name: "Website Development" } };

const CATEGORIES: ApiCategory[] = [
  {
    id: "cat_web",
    name: "Website & Digital Presence",
    slug: "website-digital-presence",
    weight: 1,
    order: 0,
    questions: [
      {
        id: "q_exists",
        categoryId: "cat_web",
        text: "Does your business currently have a website?",
        type: "CHOICE",
        order: 0,
        showIfJson: null,
        scaleMin: null,
        scaleMax: null,
        options: [gateOptionNo, gateOptionYes],
      },
      {
        id: "q_speed",
        categoryId: "cat_web",
        text: "How would you rate your site's speed?",
        type: "SCALE",
        order: 1,
        showIfJson: { questionId: "q_exists", in: ["opt_yes"] },
        scaleMin: 1,
        scaleMax: 10,
        options: [],
      },
    ],
  },
];

const REPORT = {
  overall: 40,
  categoryScores: [{ categoryId: "cat_web", name: "Website & Digital Presence", weight: 1, score: 40 }],
  strengths: [],
  weaknesses: [{ categoryId: "cat_web", name: "Website & Digital Presence", weight: 1, score: 40 }],
  recommendations: [
    {
      service: "Website Development",
      serviceId: "svc_web",
      priority: "HIGH" as const,
      businessImpact: null,
      revenueImpact: null,
      timeToFix: "3–5 weeks",
      costRangeMin: 40000,
      costRangeMax: 150000,
    },
  ],
  roadmap: {
    days1to30: [
      { service: "Website Development", serviceId: "svc_web", priority: "HIGH" as const, businessImpact: null, revenueImpact: null, timeToFix: "3–5 weeks", costRangeMin: 40000, costRangeMax: 150000 },
    ],
    days31to60: [],
    days61to90: [],
  },
  budget: { min: 40000, max: 150000 },
  generatedAt: "2026-07-31T00:00:00.000Z",
};

function mockFetch(handlers: Record<string, () => Partial<Response> & { jsonBody?: unknown }>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    const key = Object.keys(handlers).find((k) => url.startsWith(k));
    if (!key) throw new Error(`Unhandled fetch: ${url}`);
    const result = handlers[key]();
    return {
      ok: result.ok ?? true,
      status: result.status ?? 200,
      statusText: "",
      json: async () => result.jsonBody,
    } as Response;
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("AuditApp — loading the question bank", () => {
  it("shows a loading state before the question bank arrives", () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    render(<AuditApp />);
    expect(screen.getByText("Loading the audit…")).toBeInTheDocument();
  });

  it("shows an error state with a retry when the question bank fails", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ "/api/categories": () => ({ ok: false, status: 500, jsonBody: { error: "boom" } }) })
    );
    render(<AuditApp />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("shows an empty state when no questions are published", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ "/api/categories": () => ({ jsonBody: { categories: [] } }) })
    );
    render(<AuditApp />);

    expect(await screen.findByText("The audit isn't ready yet")).toBeInTheDocument();
  });

  it("enables the start button once the bank loads and a name is entered", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      mockFetch({ "/api/categories": () => ({ jsonBody: { categories: CATEGORIES } }) })
    );
    render(<AuditApp />);

    const begin = await screen.findByRole("button", { name: /Begin the audit/ });
    expect(begin).toBeDisabled();

    await user.type(screen.getByPlaceholderText("Your business name"), "Acme Co");
    expect(begin).toBeEnabled();
  });
});

describe("AuditApp — the audit flow", () => {
  async function startAudit(fetchMock: ReturnType<typeof vi.fn>) {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", fetchMock);
    render(<AuditApp />);

    await screen.findByRole("button", { name: /Begin the audit/ });
    await user.type(screen.getByPlaceholderText("Your business name"), "Acme Co");
    await user.click(screen.getByRole("button", { name: /Begin the audit/ }));
    return user;
  }

  const happyPath = () =>
    mockFetch({
      "/api/categories": () => ({ jsonBody: { categories: CATEGORIES } }),
      "/api/assessments/a1/answer": () => ({ jsonBody: { overall: 0, categoryScores: [] } }),
      "/api/assessments/a1/complete": () => ({ jsonBody: { report: REPORT } }),
      "/api/assessments": () => ({
        status: 201,
        jsonBody: { assessment: { id: "a1", clientId: "c1", status: "IN_PROGRESS", resumeToken: "tok", overallScore: null } },
      }),
    });

  it("creates an assessment in the database when the audit begins", async () => {
    const fetchMock = happyPath();
    await startAudit(fetchMock);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/assessments",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(await screen.findByText("Does your business currently have a website?")).toBeInTheDocument();
  });

  it("autosaves each answer to the backend", async () => {
    const fetchMock = happyPath();
    const user = await startAudit(fetchMock);

    await screen.findByText("Does your business currently have a website?");
    await user.click(screen.getByRole("radio", { name: /No website/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/assessments/a1/answer?token=tok",
        expect.objectContaining({ method: "POST" })
      );
    });
    expect(await screen.findByText("Progress saved")).toBeInTheDocument();
  });

  it("surfaces a save failure without losing the user's answer", async () => {
    const fetchMock = mockFetch({
      "/api/categories": () => ({ jsonBody: { categories: CATEGORIES } }),
      "/api/assessments/a1/answer": () => ({ ok: false, status: 500, jsonBody: { error: "nope" } }),
      "/api/assessments": () => ({
        status: 201,
        jsonBody: { assessment: { id: "a1", clientId: "c1", status: "IN_PROGRESS", resumeToken: "tok", overallScore: null } },
      }),
    });
    const user = await startAudit(fetchMock);

    await screen.findByText("Does your business currently have a website?");
    await user.click(screen.getByRole("radio", { name: /No website/ }));

    expect(await screen.findByText(/Couldn't save that answer/)).toBeInTheDocument();
    // Selection is preserved locally so the user can continue.
    expect(screen.getByRole("radio", { name: /No website/ })).toHaveAttribute("aria-checked", "true");
  });

  it("applies conditional logic — 'No website' skips the gated follow-up", async () => {
    const fetchMock = happyPath();
    const user = await startAudit(fetchMock);

    await screen.findByText("Does your business currently have a website?");
    // Only the ungated question counts toward the total.
    expect(screen.getByText("1 / 1")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /No website/ }));
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });

  it("applies conditional logic — a real website reveals the gated follow-up", async () => {
    const fetchMock = happyPath();
    const user = await startAudit(fetchMock);

    await screen.findByText("Does your business currently have a website?");
    await user.click(screen.getByRole("radio", { name: /Yes, basic site/ }));

    await waitFor(() => expect(screen.getByText("1 / 2")).toBeInTheDocument());
  });

  it("exposes progress to assistive technology", async () => {
    const fetchMock = happyPath();
    await startAudit(fetchMock);

    const bar = await screen.findByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "1");
  });

  it("completes the assessment and renders the generated report", async () => {
    const fetchMock = happyPath();
    const user = await startAudit(fetchMock);

    await screen.findByText("Does your business currently have a website?");
    await user.click(screen.getByRole("radio", { name: /No website/ }));
    await user.click(screen.getByRole("button", { name: /See my report/ }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/assessments/a1/complete?token=tok",
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(await screen.findByText(/Here's where things stand/)).toBeInTheDocument();
    // Appears twice by design: once as a recommendation, once in the roadmap.
    expect(screen.getAllByText("Website Development")).toHaveLength(2);
    expect(screen.getByText("HIGH PRIORITY")).toBeInTheDocument();
    // Budget comes from the API's cost range, formatted in Indian notation —
    // once on the recommendation, once in the total investment band.
    expect(screen.getAllByText(/₹40k – ₹1.5L/).length).toBeGreaterThan(0);
  });

  it("shows an error if report generation fails, staying on the audit", async () => {
    const fetchMock = mockFetch({
      "/api/categories": () => ({ jsonBody: { categories: CATEGORIES } }),
      "/api/assessments/a1/answer": () => ({ jsonBody: { overall: 0, categoryScores: [] } }),
      "/api/assessments/a1/complete": () => ({ ok: false, status: 500, jsonBody: { error: "fail" } }),
      "/api/assessments": () => ({
        status: 201,
        jsonBody: { assessment: { id: "a1", clientId: "c1", status: "IN_PROGRESS", resumeToken: "tok", overallScore: null } },
      }),
    });
    const user = await startAudit(fetchMock);

    await screen.findByText("Does your business currently have a website?");
    await user.click(screen.getByRole("radio", { name: /No website/ }));
    await user.click(screen.getByRole("button", { name: /See my report/ }));

    expect(await screen.findByText(/Something went wrong on our end/)).toBeInTheDocument();
    expect(screen.getByText("Does your business currently have a website?")).toBeInTheDocument();
  });
});

describe("AuditApp — resuming a saved assessment", () => {
  const resumeFetch = (answersJson: Record<string, unknown>) =>
    mockFetch({
      "/api/categories": () => ({ jsonBody: { categories: CATEGORIES } }),
      "/api/assessments/a1/answer": () => ({ jsonBody: { overall: 0, categoryScores: [] } }),
      "/api/assessments/a1?token=tok": () => ({
        jsonBody: {
          assessment: { id: "a1", clientId: "c1", status: "IN_PROGRESS", resumeToken: "tok", overallScore: null, answersJson },
        },
      }),
      "/api/assessments/a1": () => ({
        jsonBody: {
          assessment: { id: "a1", clientId: "c1", status: "IN_PROGRESS", resumeToken: null, overallScore: null, answersJson },
        },
      }),
    });

  it("skips the intro and loads saved answers", async () => {
    const fetchMock = resumeFetch({ q_exists: { optionId: "opt_yes" } });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuditApp resumeAssessmentId="a1" resumeToken="tok" />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/assessments/a1?token=tok", expect.anything());
    });
    // Never shows the business-name intro.
    expect(screen.queryByPlaceholderText("Your business name")).not.toBeInTheDocument();
  });

  it("lands on the first unanswered question rather than the start", async () => {
    // q_exists answered with "Yes" ungates q_speed, which is unanswered.
    const fetchMock = resumeFetch({ q_exists: { optionId: "opt_yes" } });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuditApp resumeAssessmentId="a1" resumeToken="tok" />);

    expect(await screen.findByText("How would you rate your site's speed?")).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("restores the previously selected option when stepping back", async () => {
    const user = userEvent.setup();
    const fetchMock = resumeFetch({ q_exists: { optionId: "opt_yes" } });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuditApp resumeAssessmentId="a1" resumeToken="tok" />);

    await screen.findByText("How would you rate your site's speed?");
    await user.click(screen.getByRole("button", { name: /Back/ }));

    expect(await screen.findByText("Does your business currently have a website?")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Yes, basic site/ })).toHaveAttribute("aria-checked", "true");
  });

  it("surfaces an error when the saved assessment cannot be loaded", async () => {
    const fetchMock = mockFetch({
      "/api/categories": () => ({ jsonBody: { categories: CATEGORIES } }),
      "/api/assessments/a1": () => ({ ok: false, status: 403, jsonBody: { error: "nope" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<AuditApp resumeAssessmentId="a1" resumeToken="bad" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/no longer valid/i);
  });

  it("still shows the intro when no resume id is supplied", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch({ "/api/categories": () => ({ jsonBody: { categories: CATEGORIES } }) })
    );
    render(<AuditApp />);
    expect(await screen.findByPlaceholderText("Your business name")).toBeInTheDocument();
  });
});
