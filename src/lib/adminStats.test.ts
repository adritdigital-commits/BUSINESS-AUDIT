import { beforeEach, describe, expect, it, vi } from "vitest";
import { completionRate, loadAdminStats, loadRecentAssessments } from "@/lib/adminStats";

const clientCount = vi.fn();
const assessmentCount = vi.fn();
const assessmentAggregate = vi.fn();
const assessmentFindMany = vi.fn();
const consultationCount = vi.fn();
const questionCount = vi.fn();
const categoryCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: { count: () => clientCount() },
    assessment: {
      count: (args?: unknown) => assessmentCount(args),
      aggregate: (args?: unknown) => assessmentAggregate(args),
      findMany: (args?: unknown) => assessmentFindMany(args),
    },
    consultation: { count: (args?: unknown) => consultationCount(args) },
    question: { count: (args?: unknown) => questionCount(args) },
    category: { count: (args?: unknown) => categoryCount(args) },
  },
}));

beforeEach(() => vi.clearAllMocks());

describe("completionRate", () => {
  it("returns a whole-number percentage", () => {
    expect(completionRate(1, 3)).toBe(33);
    expect(completionRate(3, 4)).toBe(75);
  });

  it("returns 0 rather than NaN when nothing has been started", () => {
    expect(completionRate(0, 0)).toBe(0);
    expect(Number.isNaN(completionRate(0, 0))).toBe(false);
  });

  it("guards against a negative or nonsensical total", () => {
    expect(completionRate(5, -1)).toBe(0);
  });

  it("reports 100 when everything completed", () => {
    expect(completionRate(7, 7)).toBe(100);
  });
});

describe("loadAdminStats", () => {
  function setup({ total = 10, completed = 4, avg = 55.4 }: { total?: number; completed?: number; avg?: number | null } = {}) {
    clientCount.mockResolvedValue(6);
    // Called three times: total, COMPLETED, IN_PROGRESS.
    assessmentCount
      .mockResolvedValueOnce(total)
      .mockResolvedValueOnce(completed)
      .mockResolvedValueOnce(total - completed);
    assessmentAggregate.mockResolvedValue({ _avg: { overallScore: avg } });
    consultationCount.mockResolvedValue(2);
    questionCount.mockResolvedValue(13);
    categoryCount.mockResolvedValue(8);
  }

  it("aggregates the headline numbers", async () => {
    setup();
    const stats = await loadAdminStats();

    expect(stats).toMatchObject({
      clientCount: 6,
      assessmentCount: 10,
      completedCount: 4,
      inProgressCount: 6,
      completionRate: 40,
      averageScore: 55.4,
      openConsultations: 2,
      questionCount: 13,
      categoryCount: 8,
    });
  });

  it("reports a null average score when nothing has been completed", async () => {
    setup({ total: 3, completed: 0, avg: null });
    const stats = await loadAdminStats();

    expect(stats.averageScore).toBeNull();
    expect(stats.completionRate).toBe(0);
  });

  it("counts only open consultation requests", async () => {
    setup();
    await loadAdminStats();
    expect(consultationCount).toHaveBeenCalledWith({ where: { status: "REQUESTED" } });
  });
});

describe("loadRecentAssessments", () => {
  it("falls back to a placeholder when the client row is missing", async () => {
    assessmentFindMany.mockResolvedValue([
      { id: "a1", status: "COMPLETED", overallScore: 70, startedAt: new Date(), client: null },
    ]);

    const [row] = await loadRecentAssessments();
    expect(row.businessName).toBe("Unknown business");
  });

  it("returns newest first and respects the limit", async () => {
    assessmentFindMany.mockResolvedValue([]);
    await loadRecentAssessments(3);

    expect(assessmentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3, orderBy: { startedAt: "desc" } })
    );
  });
});
