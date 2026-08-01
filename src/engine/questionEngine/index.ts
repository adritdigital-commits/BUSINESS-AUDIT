import { deriveSignals, industryLabel } from "@/engine/businessProfile";
import { getDomain } from "@/engine/domains";
import { industryRuleFor } from "@/engine/industryRules";
import {
  explainSelection,
  isEligible,
  type RuleContext,
} from "@/engine/questionEngine/conditions";
import {
  MAX_BASE_QUESTIONS,
  POOL_QUOTAS,
  selectQuestions,
} from "@/engine/questionEngine/selection";
import type { AnswersMap, BusinessProfile, Question } from "@/engine/types";

export * from "@/engine/questionEngine/conditions";
export {
  MAX_BASE_QUESTIONS,
  POOL_QUOTAS,
  eligibleCandidates,
  relevanceScore,
  selectQuestions,
} from "@/engine/questionEngine/selection";

/** A question as it appears in the flow, with the reason it is being asked. */
export interface PlannedQuestion {
  question: Question;
  /** Section heading — the domain the question belongs to. */
  sectionName: string;
  /** Short justification shown beside adaptive questions, or null. */
  reason: string | null;
  /** True when this was unlocked by a previous answer. */
  isFollowUp: boolean;
  parentId?: string;
}

export interface AssessmentPlan {
  questions: PlannedQuestion[];
  /** Base questions, before any follow-up was unlocked. */
  baseCount: number;
  followUpCount: number;
  /** Distinct sections in order, for the progress rail. */
  sections: string[];
  /** What this industry adds that a generic audit would not ask. */
  injectedTopics: string[];
  industryNarrative: string;
}

/**
 * Builds the live assessment for a profile and the answers so far.
 *
 * Pure and re-entrant: the UI calls it on every answer, and the result is a
 * function of its inputs alone. Two guarantees make that safe to do —
 *
 *   1. Selection is deterministic. The same inputs always produce the same
 *      questions in the same order.
 *   2. Answered questions are pinned. A later answer can add or remove
 *      unanswered questions, but it can never remove one already answered,
 *      so the flow only ever grows forwards.
 */
export function planAssessment(
  profile: BusinessProfile,
  answers: AnswersMap = {}
): AssessmentPlan {
  const context: RuleContext = {
    profile,
    signals: deriveSignals(profile),
    answers,
  };

  const answeredIds = new Set(
    Object.entries(answers)
      .filter(([, entry]) => entry.optionId || entry.skipped)
      .map(([questionId]) => questionId)
  );

  const base = selectQuestions(context, answeredIds);
  const label = industryLabel(profile.industry || undefined) || "your sector";

  const planned: PlannedQuestion[] = [];
  for (const question of base) {
    planned.push({
      question,
      sectionName: getDomain(question.category).name,
      reason: explainSelection(question, context, label),
      isFollowUp: false,
    });

    // Follow-ups sit directly beneath the answer that unlocked them, which is
    // where a consultant would ask them.
    for (const followUp of unlockedFollowUps(question, context)) {
      planned.push({
        question: followUp,
        sectionName: getDomain(followUp.category).name,
        reason: "Asked because of your previous answer",
        isFollowUp: true,
        parentId: question.id,
      });
    }
  }

  const rule = industryRuleFor(profile.industry);
  const sections: string[] = [];
  for (const item of planned) {
    if (sections[sections.length - 1] !== item.sectionName) {
      if (!sections.includes(item.sectionName)) sections.push(item.sectionName);
    }
  }

  return {
    questions: planned,
    baseCount: base.length,
    followUpCount: planned.length - base.length,
    sections,
    injectedTopics: rule.injectedTopics,
    industryNarrative: rule.narrative,
  };
}

/**
 * The follow-ups a parent's current answer has unlocked, filtered by their own
 * conditions. Recursive, so a follow-up may itself unlock another.
 */
function unlockedFollowUps(parent: Question, context: RuleContext): Question[] {
  if (!parent.followUpQuestions?.length) return [];

  const entry = context.answers[parent.id];
  if (!entry?.optionId || entry.skipped) return [];

  const option = parent.options.find((candidate) => candidate.id === entry.optionId);
  if (!option?.unlocks?.length) return [];

  const unlocked: Question[] = [];
  for (const id of option.unlocks) {
    const followUp = parent.followUpQuestions.find((candidate) => candidate.id === id);
    if (!followUp || !isEligible(followUp, context)) continue;
    unlocked.push(followUp);
    unlocked.push(...unlockedFollowUps(followUp, context));
  }

  return unlocked;
}

/** Upper bound on the assessment, used for copy on the landing page. */
export const MAX_TOTAL_QUESTIONS = MAX_BASE_QUESTIONS;

/** The quota breakdown, exposed so the UI can explain how the set was built. */
export const QUOTA_BREAKDOWN = POOL_QUOTAS;
