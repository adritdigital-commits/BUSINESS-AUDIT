import { getService } from "@/data/services";
import { getDomain } from "@/engine/domains";
import { goalEmphasisFor, industryRuleFor } from "@/engine/industryRules";
import type { AssessmentPlan } from "@/engine/questionEngine";
import { isAnswered } from "@/engine/scoreEngine";
import type {
  AnswersMap,
  BusinessProfile,
  DomainId,
  Priority,
  Service,
} from "@/engine/types";

/**
 * The recommendation engine.
 *
 * Nothing is recommended because it exists in the catalogue. A service reaches
 * the list only when an answer put it there, and its rank is then adjusted by
 * the things a consultant would weigh: what this industry needs first, what
 * the client said they care about, and what this business can plausibly fund.
 */

export const PRIORITY_ORDER: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

/** One gap the assessment found, traced to the answer that revealed it. */
export interface Finding {
  questionId: string;
  question: string;
  domainId: DomainId;
  domainName: string;
  serviceId: string;
  priority: Priority;
  insight: string;
  /** The answer as the client gave it, quoted back in the report. */
  answerLabel: string;
}

export interface Recommendation {
  service: Service;
  priority: Priority;
  findings: Finding[];
  /** Domains this engagement improves. */
  domainNames: string[];
  /** True when this industry's playbook leads with this engagement. */
  industryPriority: boolean;
  /** True when it directly serves one of the client's stated priorities. */
  goalAligned: boolean;
  /**
   * True when the investment is large relative to the business's revenue band.
   * Not a reason to withhold the recommendation — a reason to sequence it later
   * and say so.
   */
  stretch: boolean;
  /** Internal ranking score, exposed for tests and debugging. */
  rank: number;
}

/** Walks every answered question and collects what its answer triggered. */
export function collectFindings(plan: AssessmentPlan, answers: AnswersMap): Finding[] {
  const findings: Finding[] = [];

  for (const item of plan.questions) {
    const question = item.question;
    const entry = answers[question.id];
    if (!isAnswered(entry)) continue;

    const option = question.options.find((candidate) => candidate.id === entry.optionId);
    if (!option?.recommendedServices?.length) continue;

    for (const serviceId of option.recommendedServices) {
      findings.push({
        questionId: question.id,
        question: question.title,
        domainId: question.category,
        domainName: getDomain(question.category).name,
        serviceId,
        priority: option.priority ?? "MEDIUM",
        insight: option.insight ?? "",
        answerLabel: option.label,
      });
    }
  }

  return findings;
}

/** Revenue bands under which a six-figure engagement is a stretch. */
const CONSTRAINED_REVENUE = new Set(["pre-revenue", "under-25l"]);
const STRETCH_THRESHOLD = 100000;

export interface RecommendationInput {
  profile: BusinessProfile;
  plan: AssessmentPlan;
  answers: AnswersMap;
}

export function buildRecommendations({
  profile,
  plan,
  answers,
}: RecommendationInput): Recommendation[] {
  const findings = collectFindings(plan, answers);
  const rule = industryRuleFor(profile.industry);
  const goalDomains = collectGoalDomains(profile);

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
      if (!existing.domainNames.includes(finding.domainName)) {
        existing.domainNames.push(finding.domainName);
      }
      continue;
    }

    byService.set(finding.serviceId, {
      service,
      priority: finding.priority,
      findings: [finding],
      domainNames: [finding.domainName],
      industryPriority: rule.priorityServices.includes(service.id),
      goalAligned: goalDomains.has(service.domain),
      stretch:
        CONSTRAINED_REVENUE.has(profile.annualRevenue) && service.costMin >= STRETCH_THRESHOLD,
      rank: 0,
    });
  }

  const recommendations = Array.from(byService.values());
  for (const recommendation of recommendations) {
    recommendation.rank = rankOf(recommendation, rule.priorityServices);
  }

  return recommendations.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    return a.service.id.localeCompare(b.service.id);
  });
}

/**
 * Rank combines urgency, sector fit, stated priorities and evidence weight.
 * Affordability demotes rather than excludes: the client decides what to fund,
 * but the sequence should be one they could actually follow.
 */
function rankOf(recommendation: Recommendation, industryOrder: string[]): number {
  let rank = 0;

  rank += (3 - PRIORITY_ORDER[recommendation.priority]) * 10;

  if (recommendation.industryPriority) {
    const position = industryOrder.indexOf(recommendation.service.id);
    // Earlier in the industry playbook counts for more.
    rank += 8 - Math.min(position, 6);
  }

  if (recommendation.goalAligned) rank += 6;

  // More supporting answers means a wider, better-evidenced gap.
  rank += Math.min(recommendation.findings.length, 4) * 2;

  const impactBonus = { transformational: 5, high: 3.5, medium: 2, low: 1 } as const;
  rank += impactBonus[recommendation.service.impact];

  // Quick, cheap work outranks slow, expensive work at equal urgency.
  if (recommendation.service.difficulty === "easy") rank += 2.5;
  if (recommendation.service.difficulty === "complex") rank -= 2;

  if (recommendation.stretch) rank -= 6;

  return Math.round(rank * 100) / 100;
}

function collectGoalDomains(profile: BusinessProfile): Set<DomainId> {
  const domains = new Set<DomainId>();
  const goals = [...profile.priorities];
  if (profile.primaryGoal) goals.push(profile.primaryGoal);

  for (const goal of goals) {
    for (const domainId of Object.keys(goalEmphasisFor(goal)) as DomainId[]) {
      domains.add(domainId);
    }
  }

  return domains;
}
