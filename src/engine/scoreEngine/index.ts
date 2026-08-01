import { DOMAINS } from "@/engine/domains";
import { resolveDomainWeights } from "@/engine/industryRules";
import type { AssessmentPlan } from "@/engine/questionEngine";
import type {
  AnswerEntry,
  AnswersMap,
  BusinessProfile,
  DomainId,
  Question,
} from "@/engine/types";

/**
 * The scoring engine.
 *
 * Produces a score per capability domain, one weighted overall figure, and
 * three qualitative reads a consultant would give alongside it: how much the
 * numbers can be trusted, how exposed the business is, and how much upside is
 * actually available.
 *
 * Every function here is pure. The questionnaire's running total and the final
 * report call the same code with the same inputs, so they cannot disagree.
 */

export type Band = "strong" | "developing" | "at-risk";

export interface BandMeta {
  band: Band;
  label: string;
  /** CSS custom property holding the fixed status colour for this band. */
  colorVar: string;
}

export function bandFor(score: number): BandMeta {
  if (score >= 70) return { band: "strong", label: "Strong", colorVar: "var(--good)" };
  if (score >= 40) return { band: "developing", label: "Developing", colorVar: "var(--warning)" };
  return { band: "at-risk", label: "At risk", colorVar: "var(--critical)" };
}

export function isAnswered(entry: AnswerEntry | undefined): boolean {
  return Boolean(entry && !entry.skipped && entry.optionId);
}

/** Resolves one answer to its 0–100 contribution, or null if not answered. */
export function scoreOf(question: Question, entry: AnswerEntry | undefined): number | null {
  if (!isAnswered(entry)) return null;
  const option = question.options.find((candidate) => candidate.id === entry!.optionId);
  return option ? option.score : null;
}

export interface DomainScore {
  domainId: DomainId;
  name: string;
  shortName: string;
  description: string;
  /** Weight for this business, after industry and goal modifiers. */
  weight: number;
  score: number;
  answered: number;
  asked: number;
  band: Band;
  bandLabel: string;
  colorVar: string;
  /** True when nothing in this domain was asked — excluded from the overall. */
  notAssessed: boolean;
}

export interface MaturityLevel {
  key: "nascent" | "emerging" | "established" | "advanced" | "leading";
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
      "The fundamentals are not yet in place. Growth depends on individual effort rather than on anything the business owns.",
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
      "The basics work. The constraint has shifted from building foundations to connecting and measuring them.",
  },
  {
    min: 70,
    key: "advanced",
    step: 4,
    title: "Advanced",
    summary:
      "A capable operation with real systems. Remaining gains come from optimisation rather than from new foundations.",
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

export type ConfidenceLevel = "low" | "moderate" | "high";

export interface ConfidenceAssessment {
  level: ConfidenceLevel;
  label: string;
  /** 0–100. How much of the assessment was actually completed. */
  percent: number;
  summary: string;
}

export type RiskLevel = "critical" | "elevated" | "moderate" | "low";

export interface RiskAssessment {
  level: RiskLevel;
  label: string;
  /** 0–100, where 100 is maximum exposure. */
  index: number;
  summary: string;
  /** The domains contributing most to the exposure. */
  drivers: string[];
}

export type OpportunityLevel = "limited" | "moderate" | "significant" | "substantial";

export interface OpportunityAssessment {
  level: OpportunityLevel;
  label: string;
  /** 0–100. Weighted headroom available across the assessed domains. */
  index: number;
  summary: string;
  /** Domains where closing the gap returns the most, in order. */
  topDomains: string[];
}

export interface AssessmentScores {
  domains: DomainScore[];
  overall: number;
  maturity: MaturityLevel;
  confidence: ConfidenceAssessment;
  risk: RiskAssessment;
  opportunity: OpportunityAssessment;
  answered: number;
  skipped: number;
  asked: number;
}

export interface ScoreInput {
  profile: BusinessProfile;
  answers: AnswersMap;
  plan: AssessmentPlan;
  /** High-priority findings, used to sharpen the risk read. */
  highPriorityFindings?: number;
}

export function scoreAssessment({
  profile,
  answers,
  plan,
  highPriorityFindings = 0,
}: ScoreInput): AssessmentScores {
  const weights = resolveDomainWeights(profile);

  const asked = new Map<DomainId, Question[]>();
  for (const item of plan.questions) {
    const list = asked.get(item.question.category) ?? [];
    list.push(item.question);
    asked.set(item.question.category, list);
  }

  const domains: DomainScore[] = DOMAINS.map((domain) => {
    const questions = asked.get(domain.id) ?? [];
    const scores = questions
      .map((question) => scoreOf(question, answers[question.id]))
      .filter((value): value is number => value !== null);

    const score = scores.length
      ? round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : 0;
    const meta = bandFor(score);

    return {
      domainId: domain.id,
      name: domain.name,
      shortName: domain.shortName,
      description: domain.description,
      weight: weights[domain.id],
      score,
      answered: scores.length,
      asked: questions.length,
      band: meta.band,
      bandLabel: meta.label,
      colorVar: meta.colorVar,
      notAssessed: scores.length === 0,
    };
  });

  const scored = domains.filter((domain) => !domain.notAssessed);
  const totalWeight = scored.reduce((sum, domain) => sum + domain.weight, 0);
  const overall = totalWeight
    ? round(scored.reduce((sum, d) => sum + d.score * d.weight, 0) / totalWeight)
    : 0;

  let answered = 0;
  let skipped = 0;
  for (const item of plan.questions) {
    const entry = answers[item.question.id];
    if (isAnswered(entry)) answered += 1;
    else if (entry?.skipped) skipped += 1;
  }

  return {
    domains,
    overall,
    maturity: maturityFor(overall),
    confidence: assessConfidence(plan.questions.length, answered, skipped, scored.length),
    risk: assessRisk(scored, overall, highPriorityFindings),
    opportunity: assessOpportunity(scored),
    answered,
    skipped,
    asked: plan.questions.length,
  };
}

/**
 * How much the numbers can be trusted.
 *
 * Coverage of the questionnaire matters, but so does breadth: answering every
 * website question and skipping every sales one produces a high completion
 * rate and a report that cannot be relied on.
 */
export function assessConfidence(
  asked: number,
  answered: number,
  skipped: number,
  domainsScored: number
): ConfidenceAssessment {
  const completion = asked ? answered / asked : 0;
  const breadth = domainsScored / DOMAINS.length;
  const percent = Math.round(Math.min(completion * 0.65 + breadth * 0.35, 1) * 100);

  if (percent >= 80) {
    return {
      level: "high",
      label: "High",
      percent,
      summary:
        "Enough of the assessment was completed, across enough areas, for these figures to be acted on directly.",
    };
  }
  if (percent >= 55) {
    return {
      level: "moderate",
      label: "Moderate",
      percent,
      summary:
        skipped > 0
          ? `Usable, with caveats. ${skipped} question${skipped === 1 ? " was" : "s were"} skipped, so some areas rest on fewer data points than others.`
          : "Usable, with caveats. Some areas rest on fewer data points than others.",
    };
  }
  return {
    level: "low",
    label: "Low",
    percent,
    summary:
      "Treat these figures as directional. Too little of the assessment was completed to draw firm conclusions from any single score.",
  };
}

/**
 * Exposure. Weighted by how much each weak domain matters to this business,
 * so a low automation score costs a restaurant less than a low review score.
 */
export function assessRisk(
  scored: DomainScore[],
  overall: number,
  highPriorityFindings: number
): RiskAssessment {
  const totalWeight = scored.reduce((sum, domain) => sum + domain.weight, 0);
  const weightedGap = totalWeight
    ? scored.reduce((sum, d) => sum + d.weight * (100 - d.score), 0) / totalWeight
    : 0;

  const findingPressure = Math.min(highPriorityFindings * 4, 25);
  const index = Math.round(Math.min(weightedGap * 0.8 + findingPressure, 100));

  // A pile of urgent findings is itself the signal, whatever the average
  // score says. A business can score well overall and still be carrying six
  // things that each need fixing this month.
  const manyUrgent = highPriorityFindings >= 6;
  const someUrgent = highPriorityFindings >= 3;

  const drivers = [...scored]
    .filter((domain) => domain.score < 55)
    .sort((a, b) => b.weight * (100 - b.score) - a.weight * (100 - a.score))
    .slice(0, 3)
    .map((domain) => domain.name);

  if (index >= 65 || overall < 35 || manyUrgent) {
    return {
      level: "critical",
      label: "Critical",
      index,
      drivers,
      summary:
        "Several revenue-critical capabilities are missing at once. Losses are compounding now, not at some future point.",
    };
  }
  if (index >= 45 || overall < 52 || someUrgent) {
    return {
      level: "elevated",
      label: "Elevated",
      index,
      drivers,
      summary:
        "Enough gaps exist to constrain growth and to keep results dependent on individuals rather than systems.",
    };
  }
  if (index >= 28) {
    return {
      level: "moderate",
      label: "Moderate",
      index,
      drivers,
      summary:
        "The foundations hold. Specific weak points will limit scale if they are not addressed this quarter.",
    };
  }
  return {
    level: "low",
    label: "Low",
    index,
    drivers,
    summary: "No structural exposure identified. Remaining work is optimisation, not remediation.",
  };
}

/**
 * How much upside is actually available, and where.
 *
 * Headroom alone is misleading — a weak domain that barely matters to this
 * business is not an opportunity. Weighting the gap is what separates the two.
 */
export function assessOpportunity(scored: DomainScore[]): OpportunityAssessment {
  const totalWeight = scored.reduce((sum, domain) => sum + domain.weight, 0);
  const index = totalWeight
    ? Math.round(scored.reduce((sum, d) => sum + d.weight * (100 - d.score), 0) / totalWeight)
    : 0;

  const topDomains = [...scored]
    .sort((a, b) => b.weight * (100 - b.score) - a.weight * (100 - a.score))
    .slice(0, 3)
    .filter((domain) => domain.score < 85)
    .map((domain) => domain.name);

  if (index >= 55) {
    return {
      level: "substantial",
      label: "Substantial",
      index,
      topDomains,
      summary:
        "Most of the value in this plan is still on the table. The first phase alone should move the overall score materially.",
    };
  }
  if (index >= 38) {
    return {
      level: "significant",
      label: "Significant",
      index,
      topDomains,
      summary:
        "Meaningful upside in a small number of areas. Concentrating effort there will out-perform spreading it evenly.",
    };
  }
  if (index >= 20) {
    return {
      level: "moderate",
      label: "Moderate",
      index,
      topDomains,
      summary:
        "The obvious wins are largely taken. Gains from here come from optimisation and compounding rather than new foundations.",
    };
  }
  return {
    level: "limited",
    label: "Limited",
    index,
    topDomains,
    summary:
      "Little headroom remains against this assessment. The priority is defending the position rather than extending it.",
  };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
