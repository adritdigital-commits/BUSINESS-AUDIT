import type { Assessment } from "@/engine";
import { activePhases } from "@/engine/roadmapEngine";
import type { Difficulty, Impact, Priority } from "@/engine/types";

/**
 * The proposal engine.
 *
 * Scope comes exclusively from what the assessment triggered. There is no
 * catalogue dump and no upsell: an engagement appears here only if an answer
 * put it on the list, and every line carries the answer that justified it.
 */

export interface ProposalLineItem {
  serviceId: string;
  name: string;
  summary: string;
  priority: Priority;
  phase: string;
  difficulty: Difficulty;
  impact: Impact;
  effortDays: number;
  timeline: string;
  costMin: number;
  costMax: number;
  roi: string;
  deliverables: string[];
  benefits: string[];
  /** Plain-language justification, drawn from the answers that triggered it. */
  rationale: string;
  stretch: boolean;
}

export interface Proposal {
  reference: string;
  issuedAt: string;
  validUntil: string;
  preparedFor: string;
  contactName: string;
  contactEmail: string;
  headline: string;
  executiveSummary: string;
  lineItems: ProposalLineItem[];
  phases: ReturnType<typeof activePhases>;
  totalEffortDays: number;
  investmentMin: number;
  investmentMax: number;
  engagementWindow: string;
  outcomes: string[];
  assumptions: string[];
  /** Named so the client can see the plan was built for their sector. */
  industryNote: string;
}

export function buildProposal(assessment: Assessment): Proposal {
  const issued = new Date(assessment.generatedAt);
  const valid = new Date(issued.getTime());
  valid.setDate(valid.getDate() + 30);

  const phases = activePhases(assessment.roadmap);

  const phaseOf = new Map<string, string>();
  for (const phase of phases) {
    for (const task of phase.tasks) phaseOf.set(task.serviceId, phase.label);
  }

  const lineItems: ProposalLineItem[] = assessment.recommendations.map((recommendation) => ({
    serviceId: recommendation.service.id,
    name: recommendation.service.name,
    summary: recommendation.service.summary,
    priority: recommendation.priority,
    phase: phaseOf.get(recommendation.service.id) ?? "Scheduled at kick-off",
    difficulty: recommendation.service.difficulty,
    impact: recommendation.service.impact,
    effortDays: recommendation.service.effortDays,
    timeline: recommendation.service.timeline,
    costMin: recommendation.service.costMin,
    costMax: recommendation.service.costMax,
    roi: recommendation.service.roi,
    deliverables: recommendation.service.deliverables,
    benefits: recommendation.service.benefits,
    rationale: rationaleFor(recommendation),
    stretch: recommendation.stretch,
  }));

  return {
    reference: referenceFor(assessment),
    issuedAt: assessment.generatedAt,
    validUntil: valid.toISOString(),
    preparedFor: assessment.profile.businessName || "Your business",
    contactName: assessment.contact.fullName,
    contactEmail: assessment.contact.email,
    headline: headlineFor(assessment),
    executiveSummary: summaryFor(assessment),
    lineItems,
    phases,
    totalEffortDays: assessment.effortDays,
    investmentMin: assessment.investment.min,
    investmentMax: assessment.investment.max,
    engagementWindow: windowFor(phases.length),
    outcomes: outcomesFor(assessment),
    assumptions: [
      "Investment bands are indicative and confirmed after a scoping call.",
      "Timelines assume a single point of contact and feedback within two working days.",
      "Third-party costs — hosting, ad spend, licences — are billed at cost and quoted separately.",
      "Phases can run in parallel where your team's capacity allows, compressing the calendar.",
      "Scope is drawn only from the answers given; anything not assessed is not included.",
    ],
    industryNote: assessment.industry.narrative,
  };
}

/**
 * A stable, human-readable reference derived from the business and the issue
 * date — the same assessment always produces the same reference, so nothing
 * changes between a re-render, the on-screen copy and the PDF.
 */
export function referenceFor(assessment: Assessment): string {
  const issued = new Date(assessment.generatedAt);
  const year = issued.getUTCFullYear();
  const month = `${issued.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${issued.getUTCDate()}`.padStart(2, "0");

  const seed = `${assessment.profile.businessName}|${assessment.contact.email}|${assessment.profile.industry}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }

  return `RPT-${year}${month}${day}-${`${hash}`.padStart(5, "0")}`;
}

function windowFor(phaseCount: number): string {
  if (phaseCount === 0) return "No remediation required";
  if (phaseCount <= 4) return `${phaseCount * 30} days`;
  return phaseCount <= 5 ? "6 months" : "12 months";
}

function headlineFor(assessment: Assessment): string {
  if (assessment.recommendations.length === 0) {
    return "A maintenance and optimisation engagement";
  }
  const focus =
    assessment.scores.opportunity.topDomains[0] ??
    assessment.weaknesses[0]?.name ??
    assessment.recommendations[0].domainNames[0];
  return `A ${windowFor(activePhases(assessment.roadmap).length)} programme, led by ${focus}`;
}

function summaryFor(assessment: Assessment): string {
  const name = assessment.profile.businessName || "The business";
  const scores = assessment.scores;
  const high = assessment.recommendations.filter((r) => r.priority === "HIGH").length;
  const count = assessment.recommendations.length;
  const phases = activePhases(assessment.roadmap).length;

  if (count === 0) {
    return (
      `${name} scored ${Math.round(scores.overall)} out of 100 across ${scores.domains.filter((d) => !d.notAssessed).length} ` +
      `assessed areas — ${scores.maturity.title.toLowerCase()} maturity, with no structural gaps identified. ` +
      `This proposal covers ongoing optimisation rather than remediation.`
    );
  }

  const weakest = assessment.weaknesses[0];
  const gapSentence = weakest
    ? ` The weakest area is ${weakest.name} at ${Math.round(weakest.score)} out of 100, and it anchors the first phase.`
    : "";

  return (
    `${name} scored ${Math.round(scores.overall)} out of 100 against an assessment built for ` +
    `${assessment.industry.label.toLowerCase()}, placing it at the ${scores.maturity.title.toLowerCase()} ` +
    `stage with ${scores.risk.label.toLowerCase()} risk and ${scores.opportunity.label.toLowerCase()} ` +
    `growth headroom.${gapSentence} We have identified ${count} engagement${count === 1 ? "" : "s"}, ` +
    `${high} of which ${high === 1 ? "is" : "are"} high priority, sequenced across ${phases} ` +
    `phase${phases === 1 ? "" : "s"}. Confidence in these figures is ${scores.confidence.label.toLowerCase()}.`
  );
}

/**
 * Outcomes are drawn from the recommended engagements themselves, deduped and
 * capped — specific to this client rather than a generic list.
 */
function outcomesFor(assessment: Assessment): string[] {
  const seen = new Set<string>();
  const outcomes: string[] = [];

  for (const recommendation of assessment.recommendations) {
    for (const benefit of recommendation.service.benefits) {
      if (seen.has(benefit)) continue;
      seen.add(benefit);
      outcomes.push(benefit);
      if (outcomes.length >= 8) return outcomes;
    }
  }

  if (outcomes.length === 0) {
    return [
      "Maintain the current standard as the business scales",
      "Catch regressions before they affect revenue",
      "Free capacity for growth work rather than remediation",
    ];
  }

  return outcomes;
}

function rationaleFor(recommendation: {
  findings: Array<{ answerLabel: string; question: string; insight: string }>;
  service: { summary: string };
}): string {
  const [first] = recommendation.findings;
  if (!first) return recommendation.service.summary;
  const insight = first.insight ? ` ${first.insight}` : "";
  return `You answered “${first.answerLabel}” to “${first.question}”.${insight}`;
}
