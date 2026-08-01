import { industryLabel } from "@/engine/businessProfile";
import { industryRuleFor } from "@/engine/industryRules";
import { planAssessment, type AssessmentPlan } from "@/engine/questionEngine";
import {
  buildRecommendations,
  collectFindings,
  type Finding,
  type Recommendation,
} from "@/engine/recommendationEngine";
import { buildRoadmap, type RoadmapPhase } from "@/engine/roadmapEngine";
import { scoreAssessment, type AssessmentScores, type DomainScore } from "@/engine/scoreEngine";
import type { AnswersMap, BusinessProfile, ContactDetails } from "@/engine/types";

export * from "@/engine/types";
export { DOMAINS, getDomain } from "@/engine/domains";

/**
 * The assessment, assembled.
 *
 * This is the only object the UI renders. The report, the proposal and the PDF
 * are three views of it, so they cannot present different numbers. Every field
 * is derived — nothing here is stored, and re-running with the same inputs
 * always produces the same result.
 */
export interface Assessment {
  generatedAt: string;
  contact: ContactDetails;
  profile: BusinessProfile;

  plan: AssessmentPlan;
  scores: AssessmentScores;
  findings: Finding[];
  recommendations: Recommendation[];
  roadmap: RoadmapPhase[];

  strengths: DomainScore[];
  weaknesses: DomainScore[];
  /** Ten consultant-days or fewer — do these while the rest is being scoped. */
  quickWins: Recommendation[];
  longTermMoves: Recommendation[];

  investment: { min: number; max: number };
  effortDays: number;

  industry: {
    label: string;
    narrative: string;
    injectedTopics: string[];
  };
}

export interface RunAssessmentInput {
  contact: ContactDetails;
  profile: BusinessProfile;
  answers: AnswersMap;
  /** Injected so the assessment is deterministic in tests and snapshots. */
  generatedAt?: string;
}

export function runAssessment({
  contact,
  profile,
  answers,
  generatedAt,
}: RunAssessmentInput): Assessment {
  const plan = planAssessment(profile, answers);
  const findings = collectFindings(plan, answers);
  const recommendations = buildRecommendations({ profile, plan, answers });

  const highPriorityFindings = recommendations.filter((r) => r.priority === "HIGH").length;
  const scores = scoreAssessment({ profile, answers, plan, highPriorityFindings });

  const roadmap = buildRoadmap({ profile, recommendations });
  const rule = industryRuleFor(profile.industry);

  const assessed = scores.domains.filter((domain) => !domain.notAssessed);

  const investment = recommendations.reduce(
    (acc, r) => ({ min: acc.min + r.service.costMin, max: acc.max + r.service.costMax }),
    { min: 0, max: 0 }
  );

  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    contact,
    profile,
    plan,
    scores,
    findings,
    recommendations,
    roadmap,
    strengths: assessed
      .filter((domain) => domain.score >= 70)
      .sort((a, b) => b.score - a.score),
    weaknesses: assessed
      .filter((domain) => domain.score < 55)
      .sort((a, b) => a.score - b.score),
    quickWins: recommendations.filter((r) => r.service.effortDays <= 10),
    longTermMoves: recommendations.filter((r) => r.service.effortDays > 10),
    investment,
    effortDays: recommendations.reduce((sum, r) => sum + r.service.effortDays, 0),
    industry: {
      label: industryLabel(profile.industry || undefined) || rule.label,
      narrative: rule.narrative,
      injectedTopics: rule.injectedTopics,
    },
  };
}
