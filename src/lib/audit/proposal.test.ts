import { describe, expect, it } from "vitest";
import { ORDERED_QUESTIONS } from "@/data/questionBank";
import { buildProposal } from "@/lib/audit/proposal";
import { buildReport, type Report } from "@/lib/audit/report";
import type { AnswersMap, BusinessDetails, ClientDetails } from "@/lib/audit/types";

const CLIENT: ClientDetails = {
  fullName: "Priya Sharma",
  email: "priya@northline.co.in",
  phone: "",
  role: "Founder / Owner",
};

const BUSINESS: BusinessDetails = {
  businessName: "Northline Interiors",
  website: "",
  industry: "Real estate & construction",
  teamSize: "11–50 people",
  annualRevenue: "₹1 – 5 crore",
  primaryGoal: "Generate more qualified leads",
};

function reportFor(kind: "best" | "worst"): Report {
  const answers: AnswersMap = {};
  for (const question of ORDERED_QUESTIONS) {
    if (question.type === "SCALE") {
      answers[question.id] = {
        value: kind === "best" ? (question.scaleMax ?? 10) : (question.scaleMin ?? 1),
      };
    } else {
      const option =
        kind === "best" ? question.options[question.options.length - 1] : question.options[0];
      answers[question.id] = { optionId: option.id };
    }
  }
  return buildReport({
    answers,
    client: CLIENT,
    business: BUSINESS,
    generatedAt: "2026-08-01T09:20:00.000Z",
  });
}

describe("buildProposal", () => {
  it("derives one line item per recommendation, with the report's totals", () => {
    const report = reportFor("worst");
    const proposal = buildProposal(report);

    expect(proposal.lineItems).toHaveLength(report.recommendations.length);
    expect(proposal.totalEffortDays).toBe(report.effortDays);
    expect(proposal.investmentMin).toBe(report.investment.min);
    expect(proposal.investmentMax).toBe(report.investment.max);

    const lineItemTotal = proposal.lineItems.reduce((sum, item) => sum + item.effortDays, 0);
    expect(lineItemTotal).toBe(proposal.totalEffortDays);
  });

  it("assigns every line item to a roadmap phase", () => {
    const proposal = buildProposal(reportFor("worst"));
    for (const item of proposal.lineItems) {
      expect(item.phase, item.serviceId).toMatch(/^Days \d+–\d+ · /);
    }
  });

  it("quotes the triggering answer as the rationale", () => {
    const proposal = buildProposal(reportFor("worst"));
    const item = proposal.lineItems.find((candidate) => candidate.serviceId === "website-build")!;
    expect(item.rationale).toContain("No website at all");
    expect(item.rationale).toContain("Does your business have a website today?");
  });

  it("preserves the case of category names in the headline and summary", () => {
    const proposal = buildProposal(reportFor("worst"));
    expect(proposal.headline).not.toMatch(/\bseo\b/);
    expect(proposal.executiveSummary).not.toMatch(/\bseo &/);
  });

  it("states the score, engagement count and phase count in the summary", () => {
    const report = reportFor("worst");
    const proposal = buildProposal(report);

    expect(proposal.executiveSummary).toContain(BUSINESS.businessName);
    expect(proposal.executiveSummary).toContain(`${Math.round(report.overall)} out of 100`);
    expect(proposal.executiveSummary).toContain(`${report.recommendations.length} engagements`);
  });

  it("expires 30 days after issue", () => {
    const proposal = buildProposal(reportFor("worst"));
    const issued = new Date(proposal.issuedAt).getTime();
    const valid = new Date(proposal.validUntil).getTime();
    expect(Math.round((valid - issued) / 86_400_000)).toBe(30);
  });

  it("generates a stable reference for the same report", () => {
    const report = reportFor("worst");
    expect(buildProposal(report).reference).toBe(buildProposal(report).reference);
    expect(buildProposal(report).reference).toMatch(/^RPT-\d{8}-\d{5}$/);
  });

  it("generates a different reference for a different business", () => {
    const a = buildProposal(reportFor("worst"));
    const other = { ...reportFor("worst"), business: { ...BUSINESS, businessName: "Other Co" } };
    expect(buildProposal(other).reference).not.toBe(a.reference);
  });

  it("degrades to a maintenance proposal when nothing was triggered", () => {
    const proposal = buildProposal(reportFor("best"));

    expect(proposal.lineItems).toEqual([]);
    expect(proposal.totalEffortDays).toBe(0);
    expect(proposal.engagementWindow).toBe("No remediation required");
    expect(proposal.headline).toBe("A maintenance and optimisation engagement");
    expect(proposal.outcomes.length).toBeGreaterThan(0);
  });

  it("draws outcomes from the recommended services, without duplicates", () => {
    const proposal = buildProposal(reportFor("worst"));
    expect(proposal.outcomes.length).toBeGreaterThan(0);
    expect(proposal.outcomes.length).toBeLessThanOrEqual(8);
    expect(new Set(proposal.outcomes).size).toBe(proposal.outcomes.length);
  });

  it("always ships assumptions so the commercial terms are explicit", () => {
    const proposal = buildProposal(reportFor("worst"));
    expect(proposal.assumptions.length).toBeGreaterThan(0);
    expect(proposal.assumptions.join(" ")).toContain("indicative");
  });
});
