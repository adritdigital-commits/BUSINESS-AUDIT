import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@prisma/client";
import { countAnswers, loadDashboardData, summarizeProgress, type DashboardAssessment } from "@/lib/dashboardData";

const findUnique = vi.fn();
const findMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: { findUnique: (...a: unknown[]) => findUnique(...a) },
    assessment: { findMany: (...a: unknown[]) => findMany(...a) },
  },
}));

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "p1",
    email: "a@b.com",
    fullName: "Jane Founder",
    role: "CLIENT",
    clientId: "c1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Profile;
}

beforeEach(() => vi.clearAllMocks());

describe("countAnswers", () => {
  it("counts the keys of an answers object", () => {
    expect(countAnswers({ q1: {}, q2: {} })).toBe(2);
  });

  it("treats null, arrays and primitives as zero rather than throwing", () => {
    expect(countAnswers(null)).toBe(0);
    expect(countAnswers(undefined)).toBe(0);
    expect(countAnswers([1, 2, 3])).toBe(0);
    expect(countAnswers("nope")).toBe(0);
  });
});

describe("loadDashboardData", () => {
  it("returns an empty result for a profile with no client, without querying", async () => {
    const data = await loadDashboardData(profile({ clientId: null }));

    expect(data).toEqual({
      businessName: null,
      assessments: [],
      latestCompleted: null,
      inProgress: null,
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it("scopes the assessment query to the profile's client", async () => {
    findUnique.mockResolvedValue({ businessName: "Acme" });
    findMany.mockResolvedValue([]);

    await loadDashboardData(profile({ clientId: "c9" }));

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { clientId: "c9" } }));
  });

  it("surfaces the most recent completed assessment and any in-progress one", async () => {
    findUnique.mockResolvedValue({ businessName: "Acme" });
    findMany.mockResolvedValue([
      { id: "a3", status: "IN_PROGRESS", overallScore: null, startedAt: new Date("2026-03-01"), completedAt: null, answersJson: { q1: {} } },
      { id: "a2", status: "COMPLETED", overallScore: 72, startedAt: new Date("2026-02-01"), completedAt: new Date("2026-02-02"), answersJson: { q1: {}, q2: {} } },
      { id: "a1", status: "COMPLETED", overallScore: 40, startedAt: new Date("2026-01-01"), completedAt: new Date("2026-01-02"), answersJson: {} },
    ]);

    const data = await loadDashboardData(profile());

    expect(data.businessName).toBe("Acme");
    expect(data.assessments).toHaveLength(3);
    // findMany is ordered desc, so the first COMPLETED is the newest.
    expect(data.latestCompleted?.id).toBe("a2");
    expect(data.inProgress?.id).toBe("a3");
    expect(data.assessments[1].answeredCount).toBe(2);
  });

  it("reports no in-progress audit when every assessment is finished", async () => {
    findUnique.mockResolvedValue({ businessName: "Acme" });
    findMany.mockResolvedValue([
      { id: "a1", status: "COMPLETED", overallScore: 88, startedAt: new Date(), completedAt: new Date(), answersJson: {} },
    ]);

    const data = await loadDashboardData(profile());
    expect(data.inProgress).toBeNull();
    expect(data.latestCompleted?.id).toBe("a1");
  });

  it("handles a client row that has gone missing", async () => {
    findUnique.mockResolvedValue(null);
    findMany.mockResolvedValue([]);

    const data = await loadDashboardData(profile());
    expect(data.businessName).toBeNull();
  });
});

describe("summarizeProgress", () => {
  function completed(id: string, score: number | null): DashboardAssessment {
    return {
      id,
      status: "COMPLETED",
      overallScore: score,
      startedAt: new Date(),
      completedAt: new Date(),
      answeredCount: 5,
    };
  }

  it("returns null when nothing has been completed", () => {
    expect(summarizeProgress([])).toBeNull();
    expect(
      summarizeProgress([{ ...completed("a", 50), status: "IN_PROGRESS" }])
    ).toBeNull();
  });

  it("reports no delta from a single completed audit", () => {
    const summary = summarizeProgress([completed("a", 60)]);
    expect(summary).toMatchObject({ completedCount: 1, latestScore: 60, delta: null });
  });

  it("computes improvement from the first audit to the latest", () => {
    // Newest first, matching loadDashboardData's ordering.
    const summary = summarizeProgress([completed("new", 75), completed("old", 40)]);
    expect(summary).toMatchObject({ completedCount: 2, latestScore: 75, firstScore: 40, delta: 35 });
  });

  it("reports a negative delta when the score has regressed", () => {
    const summary = summarizeProgress([completed("new", 30), completed("old", 55)]);
    expect(summary?.delta).toBe(-25);
  });

  it("ignores completed audits with no score", () => {
    const summary = summarizeProgress([completed("a", null), completed("b", 44)]);
    expect(summary).toMatchObject({ completedCount: 1, latestScore: 44, delta: null });
  });
});
