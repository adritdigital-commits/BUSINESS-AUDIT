import type { Category, Option, Priority, Question, Service } from "@prisma/client";

export type OptionWithService = Option & { recommendedService: Service | null };
export type QuestionWithOptions = Question & { options: OptionWithService[] };
export type CategoryWithQuestions = Category & { questions: QuestionWithOptions[] };

/** One answer as stored in Assessment.answersJson, keyed by questionId. */
export interface AnswerEntry {
  /** Selected option, for CHOICE / DROPDOWN / YES_NO. */
  optionId?: string;
  /** Selected options, for CHECKBOX (multi-select). */
  optionIds?: string[];
  /** Raw value, for SCALE (number) / TEXT / URL / EMAIL / ... (string). */
  value?: number | string;
}

export type AnswersMap = Record<string, AnswerEntry>;

export function indexQuestions(categories: CategoryWithQuestions[]): Record<string, QuestionWithOptions> {
  const byId: Record<string, QuestionWithOptions> = {};
  for (const cat of categories) {
    for (const q of cat.questions) byId[q.id] = q;
  }
  return byId;
}

/** Question.showIfJson shape — evaluated against another question's answer. */
export type ShowIfRule =
  | { questionId: string; equals: string }
  | { questionId: string; in: string[] }
  | { questionId: string; gt: number }
  | { questionId: string; gte: number }
  | { questionId: string; lt: number }
  | { questionId: string; lte: number };

export function isVisible(
  question: Pick<Question, "showIfJson">,
  answers: AnswersMap,
  questionsById: Record<string, QuestionWithOptions>
): boolean {
  if (!question.showIfJson) return true;
  const rule = question.showIfJson as ShowIfRule;
  const answer = answers[rule.questionId];
  if (!answer) return false;

  if ("equals" in rule) return answer.optionId === rule.equals;
  if ("in" in rule) return rule.in.includes(answer.optionId ?? "");

  const referenced = questionsById[rule.questionId];
  const points = referenced ? getPoints(referenced, answer, referenced.options) ?? 0 : 0;
  if ("gt" in rule) return points > rule.gt;
  if ("gte" in rule) return points >= rule.gte;
  if ("lt" in rule) return points < rule.lt;
  if ("lte" in rule) return points <= rule.lte;
  return true;
}

/**
 * Resolves an answer to a 0–100 point value for scoring.
 * - CHOICE / DROPDOWN / YES_NO: points of the selected option.
 * - CHECKBOX: average points across selected options.
 * - SCALE: the raw 1–10 (or scaleMin–scaleMax) value, normalized to 0–100.
 * - Anything else (TEXT, URL, EMAIL, PHONE, NUMBER, DATE, UPLOAD): unscored.
 */
export function getPoints(
  question: Pick<Question, "type" | "scaleMin" | "scaleMax">,
  answer: AnswerEntry | undefined,
  options: OptionWithService[] | undefined
): number | null {
  if (!answer) return null;

  if (question.type === "SCALE") {
    if (typeof answer.value !== "number") return null;
    const min = question.scaleMin ?? 1;
    const max = question.scaleMax ?? 10;
    if (max === min) return null;
    const clamped = Math.min(Math.max(answer.value, min), max);
    return ((clamped - min) / (max - min)) * 100;
  }

  if (question.type === "CHECKBOX") {
    if (!answer.optionIds?.length || !options) return null;
    const pts = answer.optionIds
      .map((id) => options.find((o) => o.id === id)?.points)
      .filter((p): p is number => typeof p === "number");
    return pts.length ? pts.reduce((a, b) => a + b, 0) / pts.length : null;
  }

  // CHOICE / DROPDOWN / YES_NO
  if (answer.optionId && options) {
    const opt = options.find((o) => o.id === answer.optionId);
    return opt ? opt.points : null;
  }

  return null;
}

export interface CategoryScore {
  categoryId: string;
  name: string;
  weight: number;
  score: number;
}

export interface ScoreResult {
  categoryScores: CategoryScore[];
  overall: number;
}

/**
 * Pure scoring function — run identically client-side (live progress
 * preview) and server-side (authoritative snapshot on completion) so the
 * numbers never disagree. Mirrors architecture doc §5.
 */
export function computeScore(categories: CategoryWithQuestions[], answers: AnswersMap): ScoreResult {
  const questionsById = indexQuestions(categories);

  const categoryScores = categories
    .filter((cat) => cat.isActive)
    .map((cat) => {
      const visibleQuestions = cat.questions.filter((q) => q.isActive && isVisible(q, answers, questionsById));
      const points = visibleQuestions
        .map((q) => getPoints(q, answers[q.id], q.options))
        .filter((p): p is number => p !== null);
      const score = points.length ? points.reduce((a, b) => a + b, 0) / points.length : null;
      return { categoryId: cat.id, name: cat.name, weight: cat.weight, score };
    });

  const scored = categoryScores.filter(
    (c): c is CategoryScore => c.score !== null
  );

  const totalWeight = scored.reduce((sum, c) => sum + c.weight, 0);
  const overall = totalWeight
    ? scored.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight
    : 0;

  return { categoryScores: scored, overall };
}

export interface TriggeredRecommendation {
  service: string;
  serviceId: string;
  priority: Priority;
  businessImpact: string | null;
  revenueImpact: string | null;
  timeToFix: string | null;
  costRangeMin: number | null;
  costRangeMax: number | null;
}

const PRIORITY_ORDER: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** Every triggered recommendedService across answered, visible questions, de-duplicated by service (keeping the highest-priority instance). */
export function collectRecommendations(
  categories: CategoryWithQuestions[],
  answers: AnswersMap
): TriggeredRecommendation[] {
  const triggered: TriggeredRecommendation[] = [];
  const questionsById = indexQuestions(categories);

  for (const cat of categories) {
    for (const q of cat.questions) {
      if (!q.isActive || !isVisible(q, answers, questionsById)) continue;
      const answer = answers[q.id];
      if (!answer) continue;

      const selectedOptions =
        q.type === "CHECKBOX"
          ? q.options.filter((o) => answer.optionIds?.includes(o.id))
          : q.options.filter((o) => o.id === answer.optionId);

      for (const opt of selectedOptions) {
        if (!opt.recommendedService || !opt.priority) continue;
        triggered.push({
          service: opt.recommendedService.name,
          serviceId: opt.recommendedService.id,
          priority: opt.priority,
          businessImpact: opt.businessImpact,
          revenueImpact: opt.revenueImpact,
          timeToFix: opt.timeToFix,
          costRangeMin: opt.costRangeMin,
          costRangeMax: opt.costRangeMax,
        });
      }
    }
  }

  const bestByService = new Map<string, TriggeredRecommendation>();
  for (const rec of triggered) {
    const existing = bestByService.get(rec.serviceId);
    if (!existing || PRIORITY_ORDER[rec.priority] < PRIORITY_ORDER[existing.priority]) {
      bestByService.set(rec.serviceId, rec);
    }
  }

  return Array.from(bestByService.values()).sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
}
