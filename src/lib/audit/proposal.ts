import type { Recommendation, Report, RoadmapPhase } from "@/lib/audit/report";

/**
 * The proposal is generated from the report, not from the answers — so the
 * commercial document and the diagnostic behind it can never drift apart.
 */

export interface ProposalLineItem {
  serviceId: string;
  name: string;
  summary: string;
  priority: Recommendation["priority"];
  /** The phase this engagement sits in. */
  phase: string;
  effortDays: number;
  timeline: string;
  costMin: number;
  costMax: number;
  deliverables: string[];
  benefits: string[];
  /** Plain-language justification, drawn from the answers that triggered it. */
  rationale: string;
}

export interface Proposal {
  reference: string;
  issuedAt: string;
  validUntil: string;
  preparedFor: string;
  contactName: string;
  contactEmail: string;
  headline: string;
  /** Two or three sentences a decision-maker can read on their own. */
  executiveSummary: string;
  lineItems: ProposalLineItem[];
  phases: RoadmapPhase[];
  totalEffortDays: number;
  investmentMin: number;
  investmentMax: number;
  /** Calendar span across all phases with outstanding work. */
  engagementWindow: string;
  outcomes: string[];
  assumptions: string[];
}

export function buildProposal(report: Report): Proposal {
  const issued = new Date(report.generatedAt);
  const valid = new Date(issued.getTime());
  valid.setDate(valid.getDate() + 30);

  const phaseOf = new Map<string, string>();
  for (const phase of report.roadmap) {
    for (const recommendation of phase.recommendations) {
      phaseOf.set(recommendation.service.id, `${phase.window} · ${phase.title}`);
    }
  }

  const lineItems: ProposalLineItem[] = report.recommendations.map((recommendation) => ({
    serviceId: recommendation.service.id,
    name: recommendation.service.name,
    summary: recommendation.service.summary,
    priority: recommendation.priority,
    phase: phaseOf.get(recommendation.service.id) ?? "Scheduled on kick-off",
    effortDays: recommendation.service.effortDays,
    timeline: recommendation.service.timeline,
    costMin: recommendation.service.costMin,
    costMax: recommendation.service.costMax,
    deliverables: recommendation.service.deliverables,
    benefits: recommendation.service.benefits,
    rationale: rationaleFor(recommendation),
  }));

  const activePhases = report.roadmap.filter((phase) => phase.recommendations.length > 0);
  const engagementWindow = activePhases.length
    ? `${activePhases.length * 30} days`
    : "No remediation required";

  return {
    reference: referenceFor(report),
    issuedAt: report.generatedAt,
    validUntil: valid.toISOString(),
    preparedFor: report.business.businessName || "Your business",
    contactName: report.client.fullName,
    contactEmail: report.client.email,
    headline: headlineFor(report),
    executiveSummary: summaryFor(report),
    lineItems,
    phases: report.roadmap,
    totalEffortDays: report.effortDays,
    investmentMin: report.investment.min,
    investmentMax: report.investment.max,
    engagementWindow,
    outcomes: outcomesFor(report),
    assumptions: [
      "Investment bands are indicative and confirmed after a scoping call.",
      "Timelines assume a single point of contact and feedback within two working days.",
      "Third-party costs — hosting, ad spend, licences — are billed at cost and quoted separately.",
      "Phases can run in parallel where your team's capacity allows, compressing the calendar.",
    ],
  };
}

/**
 * A stable, human-readable reference derived from the business name and the
 * issue date — the same report always produces the same reference, so nothing
 * changes between a re-render, the on-screen copy and the PDF.
 */
export function referenceFor(report: Report): string {
  const issued = new Date(report.generatedAt);
  const year = issued.getUTCFullYear();
  const month = `${issued.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${issued.getUTCDate()}`.padStart(2, "0");

  const seed = `${report.business.businessName}|${report.client.email}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }

  return `RPT-${year}${month}${day}-${`${hash}`.padStart(5, "0")}`;
}

function headlineFor(report: Report): string {
  if (report.recommendations.length === 0) {
    return "A maintenance and optimisation engagement";
  }
  // Category names are proper nouns ("SEO", "Brand & Positioning") and are
  // never case-folded into the sentence.
  const focus = report.weaknesses[0]?.shortName ?? report.recommendations[0].categoryNames[0];
  const days = report.roadmap.filter((phase) => phase.recommendations.length).length * 30;
  return `A ${days}-day programme, led by ${focus}`;
}

function summaryFor(report: Report): string {
  const name = report.business.businessName || "The business";
  const high = report.recommendations.filter((r) => r.priority === "HIGH").length;
  const weakest = report.weaknesses[0];

  if (report.recommendations.length === 0) {
    return `${name} scored ${Math.round(report.overall)} out of 100 — ${report.maturity.title.toLowerCase()} maturity, with no structural gaps identified. This proposal covers ongoing optimisation rather than remediation.`;
  }

  const gapSentence = weakest
    ? ` The weakest area is ${weakest.name} at ${Math.round(weakest.score)} out of 100, and it anchors the first phase of work.`
    : "";

  const phases = report.roadmap.filter((phase) => phase.recommendations.length).length;
  const count = report.recommendations.length;

  return (
    `${name} scored ${Math.round(report.overall)} out of 100 across seven areas of ` +
    `digital and commercial maturity, placing it at the ${report.maturity.title.toLowerCase()} ` +
    `stage with ${report.risk.label.toLowerCase()} risk.${gapSentence} ` +
    `We have identified ${count} engagement${count === 1 ? "" : "s"}, ${high} of which ` +
    `${high === 1 ? "is" : "are"} high priority, sequenced across ${phases} ` +
    `phase${phases === 1 ? "" : "s"}.`
  );
}

function outcomesFor(report: Report): string[] {
  // Benefits are drawn from the recommended engagements themselves, deduped
  // and capped, so the outcomes section is specific to this client rather
  // than a generic list.
  const seen = new Set<string>();
  const outcomes: string[] = [];

  for (const recommendation of report.recommendations) {
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

function rationaleFor(recommendation: Recommendation): string {
  const [first] = recommendation.findings;
  if (!first) return recommendation.service.summary;
  const impact = first.impact ? ` ${first.impact}` : "";
  return `You answered "${first.answerLabel}" to "${first.question}".${impact}`;
}
