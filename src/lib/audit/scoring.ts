import { CATEGORIES, ORDERED_QUESTIONS } from "@/data/questionBank";
import type {
  AnswerEntry,
  AnswersMap,
  Category,
  CategoryId,
  Priority,
  Question,
} from "@/lib/audit/types";

/**
 * The scoring engine. Every function here is pure and synchronous, so the
 * questionnaire's live progress figures and the final report are computed by
 * the same code from the same inputs and can never disagree.
 */

export const PRIORITY_ORDER: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** Score bands. Colour is the fixed status ramp; the label always ships with it. */
export type Band = "strong" | "developing" | "at-risk";

export interface BandMeta {
  band: Band;
  label: string;
  /** CSS custom property holding the status colour for this band. */
  colorVar: string;
}

export function bandFor(score: number): BandMeta {
  if (score >= 70) return { band: "strong", label: "Strong", colorVar: "var(--good)" };
  if (score >= 40)
    return { band: "developing", label: "Developing", colorVar: "var(--warning)" };
  return { band: "at-risk", label: "At risk", colorVar: "var(--critical)" };
}

/** True when the entry carries a real answer rather than a skip or a blank. */
export function isAnswered(entry: AnswerEntry | undefined): boolean {
  if (!entry || entry.skipped) return false;
  return typeof entry.optionId === "string" || typeof entry.value === "number";
}

/**
 * Resolves an answer to its 0–100 contribution, or null when the question was
 * skipped or never reached. SCALE answers are normalised across the question's
 * own range so a 1–10 and a 1–5 scale are directly comparable.
 */
export function getPoints(question: Question, entry: AnswerEntry | undefined): number | null {
  if (!isAnswered(entry)) return null;

  if (question.type === "SCALE") {
    const value = entry!.value;
    if (typeof value !== "number") return null;
    const min = question.scaleMin ?? 1;
    const max = question.scaleMax ?? 10;
    if (max <= min) return null;
    const clamped = Math.min(Math.max(value, min), max);
    return ((clamped - min) / (max - min)) * 100;
  }

  const option = question.options.find((candidate) => candidate.id === entry!.optionId);
  return option ? option.points : null;
}

export interface CategoryScore {
  categoryId: CategoryId;
  name: string;
  shortName: string;
  description: string;
  weight: number;
  /** 0–100. */
  score: number;
  answered: number;
  total: number;
  band: Band;
  bandLabel: string;
  colorVar: string;
}

export interface ScoreResult {
  categoryScores: CategoryScore[];
  /** Weighted mean of the scored categories, 0–100. */
  overall: number;
  answered: number;
  skipped: number;
  total: number;
}

/**
 * Categories with no answered questions are reported with a zero score but
 * excluded from the weighted overall, so skipping a whole section lowers
 * confidence rather than silently manufacturing a bad result.
 */
export function computeScores(answers: AnswersMap): ScoreResult {
  const categoryScores: CategoryScore[] = CATEGORIES.map((category) =>
    scoreCategory(category, answers)
  );

  const scored = categoryScores.filter((category) => category.answered > 0);
  const totalWeight = scored.reduce((sum, category) => sum + category.weight, 0);
  const overall = totalWeight
    ? scored.reduce((sum, category) => sum + category.score * category.weight, 0) / totalWeight
    : 0;

  let answered = 0;
  let skipped = 0;
  for (const question of ORDERED_QUESTIONS) {
    const entry = answers[question.id];
    if (isAnswered(entry)) answered += 1;
    else if (entry?.skipped) skipped += 1;
  }

  return {
    categoryScores,
    overall: round(overall),
    answered,
    skipped,
    total: ORDERED_QUESTIONS.length,
  };
}

function scoreCategory(category: Category, answers: AnswersMap): CategoryScore {
  const questions = ORDERED_QUESTIONS.filter((question) => question.categoryId === category.id);
  const points = questions
    .map((question) => getPoints(question, answers[question.id]))
    .filter((value): value is number => value !== null);

  const score = points.length
    ? round(points.reduce((sum, value) => sum + value, 0) / points.length)
    : 0;
  const meta = bandFor(score);

  return {
    categoryId: category.id,
    name: category.name,
    shortName: category.shortName,
    description: category.description,
    weight: category.weight,
    score,
    answered: points.length,
    total: questions.length,
    band: meta.band,
    bandLabel: meta.label,
    colorVar: meta.colorVar,
  };
}

/** One gap the audit found, traced back to the answer that revealed it. */
export interface Finding {
  questionId: string;
  question: string;
  categoryId: CategoryId;
  categoryName: string;
  serviceId: string;
  priority: Priority;
  impact: string;
  /** The answer as the client gave it, quoted back in the report. */
  answerLabel: string;
}

/**
 * Walks every answered question and collects the engagements its answer
 * triggers. Findings keep one entry per question, so the report can show why
 * a service was recommended; de-duplication by service happens downstream.
 */
export function collectFindings(answers: AnswersMap): Finding[] {
  const findings: Finding[] = [];

  for (const question of ORDERED_QUESTIONS) {
    const entry = answers[question.id];
    if (!isAnswered(entry)) continue;
    const category = CATEGORIES.find((candidate) => candidate.id === question.categoryId);
    if (!category) continue;

    if (question.type === "SCALE") {
      const value = entry!.value as number;
      const threshold = question.scaleThreshold;
      if (
        question.scaleService &&
        typeof threshold === "number" &&
        value <= threshold
      ) {
        findings.push({
          questionId: question.id,
          question: question.text,
          categoryId: category.id,
          categoryName: category.name,
          serviceId: question.scaleService,
          priority: question.scalePriority ?? "MEDIUM",
          impact: question.scaleImpact ?? "",
          answerLabel: `${value} out of ${question.scaleMax ?? 10}`,
        });
      }
      continue;
    }

    const option = question.options.find((candidate) => candidate.id === entry!.optionId);
    if (!option?.service) continue;

    findings.push({
      questionId: question.id,
      question: question.text,
      categoryId: category.id,
      categoryName: category.name,
      serviceId: option.service,
      priority: option.priority ?? "MEDIUM",
      impact: option.impact ?? "",
      answerLabel: option.label,
    });
  }

  return findings;
}

export function round(value: number): number {
  return Math.round(value * 10) / 10;
}
