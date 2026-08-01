import { getService } from "@/data/services";
import {
  PRIORITY_ORDER,
  collectFindings,
  computeScores,
  type CategoryScore,
  type Finding,
  type ScoreResult,
} from "@/lib/audit/scoring";
import type {
  AnswersMap,
  BusinessDetails,
  ClientDetails,
  Priority,
  Service,
} from "@/lib/audit/types";

/**
 * The report is a pure function of (answers, details). The on-screen report,
 * the proposal and the PDF are three renderings of this one object — there is
 * no second calculation anywhere in the app.
 */

export interface MaturityLevel {
  key: "nascent" | "emerging" | "established" | "advanced" | "leading";
  /** 1–5, for the stage indicator. */
  step: number;
  title: string;
  summary: string;
}

const MATURITY_LEVELS: Array<MaturityLevel & { min: number }> = [
  {
    min: 0,
    key: "nascent",
    step: 1,
    title: "Nascent",
    summary:
      "The fundamentals are not yet in place. Growth currently depends on individual effort rather than on anything the business owns.",
  },
  {
    min: 30,
    key: "emerging",
    step: 2,
    title: "Emerging",
    summary:
      "Some foundations exist but they are inconsistent. Results are unpredictable because the systems behind them are.",
  },
  {
    min: 50,
    key: "established",
    step: 3,
    title: "Established",
    summary:
      "The basics are working. The constraint has shifted from building foundations to connecting and measuring them.",
  },
  {
    min: 70,
    key: "advanced",
    step: 4,
    title: "Advanced",
    summary:
      "A capable operation with real systems. Remaining gains come from optimisation and automation rather than from new foundations.",
  },
  {
    min: 85,
    key: "leading",
    step: 5,
    title: "Leading",
    summary:
      "Operating ahead of most businesses in your category. Focus on defending the advantage and compounding it.",
  },
];

export function maturityFor(score: number): MaturityLevel {
  const level = [...MATURITY_LEVELS].reverse().find((candidate) => score >= candidate.min);
  const { min: _min, ...rest } = level ?? MATURITY_LEVELS[0];
  void _min;
  return rest;
}

export type RiskLevel = "critical" | "elevated" | "moderate" | "low";

export interface RiskAssessment {
  level: RiskLevel;
  label: string;
  summary: string;
}

export function riskFor(score: number, highPriorityCount: number): RiskAssessment {
  if (score < 40 || highPriorityCount >= 6) {
    return {
      level: "critical",
      label: "Critical",
      summary:
        "Multiple revenue-critical systems are missing at once. Compounding losses are likely already occurring.",
    };
  }
  if (score < 55 || highPriorityCount >= 3) {
    return {
      level: "elevated",
      label: "Elevated",
      summary:
        "Enough gaps exist to constrain growth and to make results depend on individuals rather than systems.",
    };
  }
  if (score < 72) {
    return {
      level: "moderate",
      label: "Moderate",
      summary:
        "The foundations hold, but specific weak points will limit scale if they are not addressed this quarter.",
    };
  }
  return {
    level: "low",
    label: "Low",
    summary:
      "No structural exposure identified. Remaining work is optimisation rather than remediation.",
  };
}

/** A service recommended by the audit, with the evidence behind it. */
export interface Recommendation {
  service: Service;
  priority: Priority;
  /** Every answer that pointed at this engagement. */
  findings: Finding[];
  /** The categories this engagement improves. */
  categoryNames: string[];
}

export interface RoadmapPhase {
  key: "phase-1" | "phase-2" | "phase-3";
  window: string;
  title: string;
  objective: string;
  recommendations: Recommendation[];
  effortDays: number;
  investmentMin: number;
  investmentMax: number;
}

export interface Report {
  generatedAt: string;
  client: ClientDetails;
  business: BusinessDetails;
  scores: ScoreResult;
  overall: number;
  maturity: MaturityLevel;
  risk: RiskAssessment;
  strengths: CategoryScore[];
  weaknesses: CategoryScore[];
  recommendations: Recommendation[];
  quickWins: Recommendation[];
  longTermMoves: Recommendation[];
  roadmap: RoadmapPhase[];
  investment: { min: number; max: number };
  effortDays: number;
  /** Percentage of the 35 questions actually answered. */
  completeness: number;
}

export interface BuildReportInput {
  answers: AnswersMap;
  client: ClientDetails;
  business: BusinessDetails;
  /** Injected so the report is deterministic in tests and in snapshots. */
  generatedAt?: string;
}

export function buildReport({
  answers,
  client,
  business,
  generatedAt,
}: BuildReportInput): Report {
  const scores = computeScores(answers);
  const findings = collectFindings(answers);
  const recommendations = toRecommendations(findings);

  const highPriorityCount = recommendations.filter((r) => r.priority === "HIGH").length;

  const strengths = scores.categoryScores
    .filter((category) => category.answered > 0 && category.score >= 70)
    .sort((a, b) => b.score - a.score);

  const weaknesses = scores.categoryScores
    .filter((category) => category.answered > 0 && category.score < 55)
    .sort((a, b) => a.score - b.score);

  // A quick win is high-value work that fits inside a month of effort; the
  // split is by effort, not by priority, so a fast critical fix stays a
  // quick win rather than being buried in a long-term programme.
  const quickWins = recommendations.filter((r) => r.service.effortDays <= 10);
  const longTermMoves = recommendations.filter((r) => r.service.effortDays > 10);

  const roadmap = buildRoadmap(recommendations);
  const investment = recommendations.reduce(
    (acc, r) => ({ min: acc.min + r.service.costMin, max: acc.max + r.service.costMax }),
    { min: 0, max: 0 }
  );
  const effortDays = recommendations.reduce((sum, r) => sum + r.service.effortDays, 0);

  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    client,
    business,
    scores,
    overall: scores.overall,
    maturity: maturityFor(scores.overall),
    risk: riskFor(scores.overall, highPriorityCount),
    strengths,
    weaknesses,
    recommendations,
    quickWins,
    longTermMoves,
    roadmap,
    investment,
    effortDays,
    completeness: scores.total ? Math.round((scores.answered / scores.total) * 100) : 0,
  };
}

/**
 * Collapses findings to one recommendation per service, keeping the highest
 * priority any answer assigned it and carrying every supporting finding.
 * Ordered by priority, then by the size of the gap it closes.
 */
function toRecommendations(findings: Finding[]): Recommendation[] {
  const byService = new Map<string, Recommendation>();

  for (const finding of findings) {
    const service = getService(finding.serviceId);
    if (!service) continue;

    const existing = byService.get(finding.serviceId);
    if (existing) {
      existing.findings.push(finding);
      if (PRIORITY_ORDER[finding.priority] < PRIORITY_ORDER[existing.priority]) {
        existing.priority = finding.priority;
      }
      if (!existing.categoryNames.includes(finding.categoryName)) {
        existing.categoryNames.push(finding.categoryName);
      }
      continue;
    }

    byService.set(finding.serviceId, {
      service,
      priority: finding.priority,
      findings: [finding],
      categoryNames: [finding.categoryName],
    });
  }

  return Array.from(byService.values()).sort((a, b) => {
    const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (byPriority !== 0) return byPriority;
    // More supporting evidence means a wider gap, so it leads.
    if (b.findings.length !== a.findings.length) return b.findings.length - a.findings.length;
    return a.service.effortDays - b.service.effortDays;
  });
}

function buildRoadmap(recommendations: Recommendation[]): RoadmapPhase[] {
  const phases: RoadmapPhase[] = [
    {
      key: "phase-1",
      window: "Days 1–30",
      title: "Close the critical gaps",
      objective:
        "Stop the losses that are already happening. Nothing here is optional if the next two phases are to pay back.",
      recommendations: recommendations.filter((r) => r.priority === "HIGH"),
      effortDays: 0,
      investmentMin: 0,
      investmentMax: 0,
    },
    {
      key: "phase-2",
      window: "Days 31–60",
      title: "Build the growth systems",
      objective:
        "Turn the repaired foundations into repeatable demand and conversion, measured against real targets.",
      recommendations: recommendations.filter((r) => r.priority === "MEDIUM"),
      effortDays: 0,
      investmentMin: 0,
      investmentMax: 0,
    },
    {
      key: "phase-3",
      window: "Days 61–90",
      title: "Automate and compound",
      objective:
        "Remove the manual load, instrument what is working, and make the gains hold without supervision.",
      recommendations: recommendations.filter((r) => r.priority === "LOW"),
      effortDays: 0,
      investmentMin: 0,
      investmentMax: 0,
    },
  ];

  // A later phase left empty while an earlier one is overloaded reads as a
  // gap in the plan. Defer the single longest-lead engagement from the most
  // crowded earlier phase into it, so the sequence stays believable.
  for (let index = 1; index < phases.length; index += 1) {
    const phase = phases[index];
    if (phase.recommendations.length > 0) continue;

    const donor = phases
      .slice(0, index)
      .filter((candidate) => candidate.recommendations.length > 2)
      .sort((a, b) => b.recommendations.length - a.recommendations.length)[0];
    if (!donor) continue;

    const deferred = [...donor.recommendations].sort(
      (a, b) => b.service.effortDays - a.service.effortDays
    )[0];
    donor.recommendations = donor.recommendations.filter((r) => r !== deferred);
    phase.recommendations.push(deferred);
  }

  for (const phase of phases) {
    phase.effortDays = phase.recommendations.reduce((sum, r) => sum + r.service.effortDays, 0);
    phase.investmentMin = phase.recommendations.reduce((sum, r) => sum + r.service.costMin, 0);
    phase.investmentMax = phase.recommendations.reduce((sum, r) => sum + r.service.costMax, 0);
  }

  return phases;
}
