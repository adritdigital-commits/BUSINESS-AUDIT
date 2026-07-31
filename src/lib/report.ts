import {
  type AnswersMap,
  type CategoryScore,
  type CategoryWithQuestions,
  type TriggeredRecommendation,
  collectRecommendations,
  computeScore,
} from "@/lib/scoring";

export interface BudgetRange {
  min: number;
  max: number;
}

export interface Roadmap {
  days1to30: TriggeredRecommendation[];
  days31to60: TriggeredRecommendation[];
  days61to90: TriggeredRecommendation[];
}

export interface Report {
  overall: number;
  categoryScores: CategoryScore[];
  strengths: CategoryScore[];
  weaknesses: CategoryScore[];
  recommendations: TriggeredRecommendation[];
  roadmap: Roadmap;
  budget: BudgetRange;
  generatedAt: string;
}

/**
 * The report is a pure function of (categories, answers). It powers the
 * on-screen report, the PDF, and the Excel export — one source of truth,
 * three renderers. Mirrors architecture doc §9.
 */
export function generateReport(categories: CategoryWithQuestions[], answers: AnswersMap): Report {
  const { categoryScores, overall } = computeScore(categories, answers);

  const strengths = categoryScores.filter((c) => c.score >= 70).sort((a, b) => b.score - a.score);
  const weaknesses = categoryScores.filter((c) => c.score < 50).sort((a, b) => a.score - b.score);

  const recommendations = collectRecommendations(categories, answers);

  // Days 1–30: high priority, fastest wins. Days 31–60: medium priority /
  // builds on phase 1. Days 61–90: remaining lower-priority, scale/automate.
  const roadmap: Roadmap = {
    days1to30: recommendations.filter((r) => r.priority === "HIGH"),
    days31to60: recommendations.filter((r) => r.priority === "MEDIUM"),
    days61to90: recommendations.filter((r) => r.priority === "LOW"),
  };

  const budget = recommendations.reduce<BudgetRange>(
    (acc, r) => ({
      min: acc.min + (r.costRangeMin ?? 0),
      max: acc.max + (r.costRangeMax ?? 0),
    }),
    { min: 0, max: 0 }
  );

  return {
    overall,
    categoryScores,
    strengths,
    weaknesses,
    recommendations,
    roadmap,
    budget,
    generatedAt: new Date().toISOString(),
  };
}
