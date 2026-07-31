import { prisma } from "@/lib/prisma";
import type { Profile } from "@prisma/client";

export interface DashboardAssessment {
  id: string;
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  overallScore: number | null;
  startedAt: Date;
  completedAt: Date | null;
  answeredCount: number;
}

export interface DashboardData {
  businessName: string | null;
  assessments: DashboardAssessment[];
  latestCompleted: DashboardAssessment | null;
  inProgress: DashboardAssessment | null;
}

/**
 * Everything the client dashboard and history views need, scoped to the
 * signed-in profile's business. A profile with no `clientId` (registered
 * but never audited) gets an empty result rather than an error.
 */
export async function loadDashboardData(profile: Profile): Promise<DashboardData> {
  if (!profile.clientId) {
    return { businessName: null, assessments: [], latestCompleted: null, inProgress: null };
  }

  const [client, rows] = await Promise.all([
    prisma.client.findUnique({
      where: { id: profile.clientId },
      select: { businessName: true },
    }),
    prisma.assessment.findMany({
      where: { clientId: profile.clientId },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        status: true,
        overallScore: true,
        startedAt: true,
        completedAt: true,
        answersJson: true,
      },
    }),
  ]);

  const assessments: DashboardAssessment[] = rows.map((row) => ({
    id: row.id,
    status: row.status,
    overallScore: row.overallScore,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    answeredCount: countAnswers(row.answersJson),
  }));

  return {
    businessName: client?.businessName ?? null,
    assessments,
    latestCompleted: assessments.find((a) => a.status === "COMPLETED") ?? null,
    inProgress: assessments.find((a) => a.status === "IN_PROGRESS") ?? null,
  };
}

/** answersJson is `{ [questionId]: AnswerEntry }` — count its keys defensively. */
export function countAnswers(answersJson: unknown): number {
  if (!answersJson || typeof answersJson !== "object" || Array.isArray(answersJson)) return 0;
  return Object.keys(answersJson as Record<string, unknown>).length;
}
