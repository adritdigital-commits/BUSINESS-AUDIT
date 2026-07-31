import { prisma } from "@/lib/prisma";

export interface AdminStats {
  clientCount: number;
  assessmentCount: number;
  completedCount: number;
  inProgressCount: number;
  /** Percentage of assessments that reached COMPLETED, 0–100. */
  completionRate: number;
  /** Mean overall score across completed assessments; null if none. */
  averageScore: number | null;
  openConsultations: number;
  questionCount: number;
  categoryCount: number;
}

/** Completion rate as a whole-number percentage, guarding divide-by-zero. */
export function completionRate(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export interface RecentAssessment {
  id: string;
  businessName: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  overallScore: number | null;
  startedAt: Date;
}

export async function loadAdminStats(): Promise<AdminStats> {
  const [
    clientCount,
    assessmentCount,
    completedCount,
    inProgressCount,
    scoreAgg,
    openConsultations,
    questionCount,
    categoryCount,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.assessment.count(),
    prisma.assessment.count({ where: { status: "COMPLETED" } }),
    prisma.assessment.count({ where: { status: "IN_PROGRESS" } }),
    prisma.assessment.aggregate({
      where: { status: "COMPLETED", overallScore: { not: null } },
      _avg: { overallScore: true },
    }),
    prisma.consultation.count({ where: { status: "REQUESTED" } }),
    prisma.question.count({ where: { isActive: true } }),
    prisma.category.count({ where: { isActive: true } }),
  ]);

  return {
    clientCount,
    assessmentCount,
    completedCount,
    inProgressCount,
    completionRate: completionRate(completedCount, assessmentCount),
    averageScore: scoreAgg._avg.overallScore,
    openConsultations,
    questionCount,
    categoryCount,
  };
}

export async function loadRecentAssessments(limit = 8): Promise<RecentAssessment[]> {
  const rows = await prisma.assessment.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
    select: {
      id: true,
      status: true,
      overallScore: true,
      startedAt: true,
      client: { select: { businessName: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    businessName: row.client?.businessName ?? "Unknown business",
    status: row.status,
    overallScore: row.overallScore,
    startedAt: row.startedAt,
  }));
}
