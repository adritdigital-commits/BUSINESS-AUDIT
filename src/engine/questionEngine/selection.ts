import { ALL_DOMAIN_QUESTIONS, industryQuestionsFor } from "@/data/questionBanks";
import { DOMAINS } from "@/engine/domains";
import { resolveDomainWeights } from "@/engine/industryRules";
import { isEligible, type RuleContext } from "@/engine/questionEngine/conditions";
import type { DomainId, Question, QuestionPool } from "@/engine/types";

/**
 * How many questions each pool contributes, before spillover.
 * 10 + 10 + 10 + 5 = 35, the ceiling on the base assessment.
 */
export const POOL_QUOTAS: Record<QuestionPool, number> = {
  core: 10,
  industry: 10,
  goal: 10,
  size: 5,
};

export const MAX_BASE_QUESTIONS = 35;

/** Presentation order of the pools when relevance ties. */
const POOL_RANK: Record<QuestionPool, number> = { core: 0, industry: 1, goal: 2, size: 3 };

const DOMAIN_ORDER = new Map<DomainId, number>(
  DOMAINS.map((domain, index) => [domain.id, index])
);

/**
 * How strongly a question matters to this specific business.
 *
 * Relevance is what turns one shared bank into a bespoke assessment: the same
 * question ranks differently for a healthcare clinic chasing retention than
 * for a manufacturer chasing leads.
 */
export function relevanceScore(question: Question, context: RuleContext): number {
  const domainWeights = resolveDomainWeights(context.profile);
  let score = question.weight * (domainWeights[question.category] ?? 1);

  // Directly serves something the client asked us to focus on.
  const matchedGoals = (question.goals ?? []).filter((goal) =>
    context.signals.prioritySet.has(goal)
  );
  score += matchedGoals.length * 0.6;

  if (question.goals && context.profile.primaryGoal) {
    if (question.goals.includes(context.profile.primaryGoal)) score += 0.9;
  }

  // Industry questions are, by construction, the most specific thing we can
  // ask — they lead unless a goal question is unusually well matched.
  if (question.pool === "industry") score += 1.1;

  // A question about a channel they actually use beats one about a channel
  // they do not.
  if (question.category === "seo" && context.signals.channelSet.has("google-search")) {
    score += 0.3;
  }
  if (question.category === "seo" && context.signals.channelSet.has("google-business-profile")) {
    score += 0.3;
  }
  if (question.category === "marketing" && context.signals.isSingleChannel) score += 0.4;
  if (question.category === "website" && !context.signals.hasWebsite) score += 0.5;

  // Advanced questions are wasted on a business that has not built the basics.
  if (question.difficulty === "advanced" && context.signals.isYoung) score -= 0.4;
  if (question.difficulty === "basic" && context.signals.isScaledRevenue) score -= 0.2;

  return Math.round(score * 1000) / 1000;
}

function byRelevance(context: RuleContext) {
  return (a: Question, b: Question): number => {
    const delta = relevanceScore(b, context) - relevanceScore(a, context);
    if (Math.abs(delta) > 0.0001) return delta;
    if (b.weight !== a.weight) return b.weight - a.weight;
    // Deterministic tiebreak: the same profile always produces the same set.
    return a.id.localeCompare(b.id);
  };
}

/** Every top-level question this profile is eligible for, by pool. */
export function eligibleCandidates(context: RuleContext): Record<QuestionPool, Question[]> {
  const candidates: Record<QuestionPool, Question[]> = {
    core: [],
    industry: [],
    goal: [],
    size: [],
  };

  const pool = [
    ...ALL_DOMAIN_QUESTIONS,
    ...industryQuestionsFor(context.profile.industry),
  ];

  const seen = new Set<string>();
  for (const question of pool) {
    if (seen.has(question.id)) continue;
    seen.add(question.id);
    if (!isEligible(question, context)) continue;

    // A goal question earns its place only if it serves a stated priority.
    if (question.pool === "goal" && question.goals?.length) {
      const serves = question.goals.some(
        (goal) =>
          context.signals.prioritySet.has(goal) || goal === context.profile.primaryGoal
      );
      if (!serves) {
        // Still usable as spillover, but not against the goal quota.
        candidates.core.push(question);
        continue;
      }
    }

    candidates[question.pool].push(question);
  }

  const sort = byRelevance(context);
  for (const key of Object.keys(candidates) as QuestionPool[]) {
    candidates[key].sort(sort);
  }

  return candidates;
}

/**
 * Fills the quotas, then spills any unused allowance into the best remaining
 * candidates — a business in a sector with a short industry bank still gets a
 * full-length assessment rather than a thin one.
 *
 * `pinned` question ids are always kept: a question the client has already
 * answered must never vanish because a later answer shifted the ranking.
 */
export function selectQuestions(context: RuleContext, pinned: ReadonlySet<string>): Question[] {
  const candidates = eligibleCandidates(context);
  const chosen: Question[] = [];
  const chosenIds = new Set<string>();

  const take = (question: Question) => {
    if (chosenIds.has(question.id)) return false;
    chosenIds.add(question.id);
    chosen.push(question);
    return true;
  };

  // Anything already answered comes first and cannot be displaced.
  for (const list of Object.values(candidates)) {
    for (const question of list) {
      if (pinned.has(question.id)) take(question);
    }
  }

  // Screening pass. Relevance alone will happily spend all 35 slots on six
  // domains and leave three unscored — which reads, correctly, as "Not
  // assessed" on a nine-axis report. A consultant screens every area they can
  // and *then* goes deep, so reserve one slot per domain that has anything
  // eligible to ask. A domain with no eligible question stays unscored on
  // purpose: that is the no-website business not being asked about SEO.
  for (const question of screeningPicks(context, candidates, chosenIds)) {
    if (chosen.length >= MAX_BASE_QUESTIONS) break;
    take(question);
  }

  for (const poolName of Object.keys(POOL_QUOTAS) as QuestionPool[]) {
    const quota = POOL_QUOTAS[poolName];
    let filled = chosen.filter((question) => question.pool === poolName).length;
    for (const question of candidates[poolName]) {
      if (filled >= quota || chosen.length >= MAX_BASE_QUESTIONS) break;
      if (take(question)) filled += 1;
    }
  }

  if (chosen.length < MAX_BASE_QUESTIONS) {
    const remainder = (Object.keys(candidates) as QuestionPool[])
      .flatMap((poolName) => candidates[poolName])
      .filter((question) => !chosenIds.has(question.id))
      .sort(byRelevance(context));

    for (const question of remainder) {
      if (chosen.length >= MAX_BASE_QUESTIONS) break;
      take(question);
    }
  }

  return orderForPresentation(chosen);
}

/**
 * The best remaining question for each domain that is not yet represented,
 * heaviest domain first so a truncated pass still covers what matters most.
 */
function screeningPicks(
  context: RuleContext,
  candidates: Record<QuestionPool, Question[]>,
  chosenIds: ReadonlySet<string>
): Question[] {
  const weights = resolveDomainWeights(context.profile);
  const covered = new Set<DomainId>();
  for (const pool of Object.values(candidates)) {
    for (const question of pool) {
      if (chosenIds.has(question.id)) covered.add(question.category);
    }
  }

  const all = Object.values(candidates).flat().sort(byRelevance(context));
  const picks: Question[] = [];

  const order = DOMAINS.map((domain) => domain.id)
    .filter((id) => !covered.has(id))
    .sort((a, b) => {
      const delta = (weights[b] ?? 1) - (weights[a] ?? 1);
      if (Math.abs(delta) > 0.0001) return delta;
      return (DOMAIN_ORDER.get(a) ?? 99) - (DOMAIN_ORDER.get(b) ?? 99);
    });

  for (const domain of order) {
    const best = all.find(
      (question) => question.category === domain && !chosenIds.has(question.id)
    );
    if (best) picks.push(best);
  }

  return picks;
}

/**
 * Groups the selection into domain sections so the questionnaire reads as a
 * consultation rather than a shuffled list. Industry questions sit inside the
 * section they belong to, which is where a consultant would ask them.
 */
export function orderForPresentation(questions: Question[]): Question[] {
  return [...questions].sort((a, b) => {
    const domainDelta =
      (DOMAIN_ORDER.get(a.category) ?? 99) - (DOMAIN_ORDER.get(b.category) ?? 99);
    if (domainDelta !== 0) return domainDelta;

    const poolDelta = POOL_RANK[a.pool] - POOL_RANK[b.pool];
    if (poolDelta !== 0) return poolDelta;

    if (b.weight !== a.weight) return b.weight - a.weight;
    return a.id.localeCompare(b.id);
  });
}
