import type {
  AnswersMap,
  BusinessProfile,
  Condition,
  ProfileSignals,
  Question,
} from "@/engine/types";

/** Everything a rule may look at. Nothing else is in scope for a condition. */
export interface RuleContext {
  profile: BusinessProfile;
  signals: ProfileSignals;
  answers: AnswersMap;
}

/**
 * Evaluates one declarative condition.
 *
 * Conditions are data, so a rule can be tested in isolation, serialised, and
 * explained back to the user. Anything a rule needs must be reachable from
 * `RuleContext` — a condition may never reach into module state or the DOM.
 */
export function evaluate(condition: Condition, context: RuleContext): boolean {
  const { profile, signals, answers } = context;

  switch (condition.kind) {
    case "industry":
      return profile.industry !== "" && condition.in.includes(profile.industry);

    case "businessType":
      return profile.businessType !== "" && condition.in.includes(profile.businessType);

    case "businessAge":
      return profile.businessAge !== "" && condition.in.includes(profile.businessAge);

    case "teamSize":
      return profile.teamSize !== "" && condition.in.includes(profile.teamSize);

    case "revenue":
      return profile.annualRevenue !== "" && condition.in.includes(profile.annualRevenue);

    case "priority":
      return condition.anyOf.some((goal) => signals.prioritySet.has(goal));

    case "channel":
      return condition.anyOf.some((channel) => signals.channelSet.has(channel));

    case "signal": {
      const value = signals[condition.is];
      // Only the boolean signals are comparable; the Set members are for
      // lookups elsewhere and never appear in a `signal` condition.
      if (typeof value !== "boolean") return false;
      return value === condition.equals;
    }

    case "answered": {
      const entry = answers[condition.questionId];
      if (!entry || entry.skipped || !entry.optionId) return false;
      return condition.optionIn.includes(entry.optionId);
    }

    case "not":
      return !evaluate(condition.condition, context);
  }
}

/** A question is eligible when every one of its conditions holds. */
export function isEligible(question: Question, context: RuleContext): boolean {
  if (!question.triggerConditions?.length) return true;
  return question.triggerConditions.every((condition) => evaluate(condition, context));
}

/**
 * A short, human explanation of why a question is being asked, for the badge
 * shown beside adaptive questions. Returns null when the question is universal
 * and needs no justification.
 */
export function explainSelection(
  question: Question,
  context: RuleContext,
  industryLabel: string
): string | null {
  if (question.rationale) return question.rationale;
  if (question.pool === "industry") return `Specific to ${industryLabel.toLowerCase()}`;

  if (question.pool === "goal" && question.goals?.length) {
    const matched = question.goals.filter((goal) => context.signals.prioritySet.has(goal));
    if (matched.length > 0) return "Matched to a priority you selected";
  }

  if (question.pool === "size") return "Based on the size and stage of your business";
  return null;
}
