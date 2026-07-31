import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@prisma/client";
import { countAnswers, loadDashboardData } from "@/lib/dashboardData";

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
