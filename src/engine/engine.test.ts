import { describe, expect, it } from "vitest";
import { runAssessment } from "@/engine";
import { deriveSignals, isProfileComplete, PRIORITY_PICK_COUNT } from "@/engine/businessProfile";
import {
  CLINIC,
  CONTACT,
  MANUFACTURER_NO_SITE,
  NEW_RESTAURANT,
  answerAll,
  answerBest,
  answerWorst,
  profile,
} from "@/engine/fixtures";
import { goalEmphasisFor, industryRuleFor, resolveDomainWeights } from "@/engine/industryRules";
import { buildProposal } from "@/engine/proposalEngine";
import { planAssessment } from "@/engine/questionEngine";
import { activePhases, HORIZONS } from "@/engine/roadmapEngine";
import { assessConfidence, assessRisk, bandFor, maturityFor } from "@/engine/scoreEngine";
import type { AnswersMap } from "@/engine/types";

const AT = "2026-08-01T09:20:00.000Z";
const run = (target: Parameters<typeof answerAll>[0], answers: AnswersMap) =>
  runAssessment({ contact: CONTACT, profile: target, answers, generatedAt: AT });

// ---------------------------------------------------------------- profile

describe("business profile", () => {
  it("derives whether a website exists", () => {
    expect(deriveSignals(CLINIC).hasWebsite).toBe(true);
    expect(deriveSignals(MANUFACTURER_NO_SITE).hasWebsite).toBe(false);
    expect(deriveSignals(profile({ website: "   " })).hasWebsite).toBe(false);
  });

  it("derives channel and audience signals", () => {
    const clinic = deriveSignals(CLINIC);
    expect(clinic.isDigitallyAcquired).toBe(true);
    expect(clinic.isLocal).toBe(true);
    expect(clinic.isB2C).toBe(true);
    expect(clinic.isSingleChannel).toBe(false);

    const manufacturer = deriveSignals(MANUFACTURER_NO_SITE);
    expect(manufacturer.isB2B).toBe(true);
    expect(manufacturer.isDigitallyAcquired).toBe(false);
    expect(manufacturer.isLargeTeam).toBe(true);
    expect(manufacturer.isEstablished).toBe(true);
  });

  it("requires every field before an assessment can be planned", () => {
    expect(isProfileComplete(CLINIC)).toBe(true);
    expect(isProfileComplete(profile({ industry: "" }))).toBe(false);
    expect(isProfileComplete(profile({ acquisitionChannels: [] }))).toBe(false);
    expect(isProfileComplete(profile({ priorities: ["seo"] }))).toBe(false);
    expect(PRIORITY_PICK_COUNT).toBe(3);
  });
});

// ---------------------------------------------------------- industry rules

describe("industry rules", () => {
  it("weights domains differently per industry", () => {
    const clinicWeights = resolveDomainWeights(CLINIC);
    const manufacturerWeights = resolveDomainWeights(MANUFACTURER_NO_SITE);
    expect(clinicWeights.customerExperience).toBeGreaterThan(
      manufacturerWeights.customerExperience
    );
    expect(manufacturerWeights.sales).toBeGreaterThan(clinicWeights.sales);
  });

  it("raises the weight of a domain the client prioritised", () => {
    const withSeo = resolveDomainWeights(
      profile({ priorities: ["seo", "google-ranking", "more-leads"], primaryGoal: "seo" })
    );
    const without = resolveDomainWeights(
      profile({ priorities: ["crm", "automation", "reporting"], primaryGoal: "crm" })
    );
    expect(withSeo.seo).toBeGreaterThan(without.seo);
    expect(without.crm).toBeGreaterThan(withSeo.crm);
  });

  it("counts the primary goal twice", () => {
    const primary = resolveDomainWeights(
      profile({ priorities: ["automation", "sales", "brand" as never], primaryGoal: "automation" })
    );
    const secondary = resolveDomainWeights(
      profile({ priorities: ["automation", "sales", "brand" as never], primaryGoal: "sales" })
    );
    expect(primary.automation).toBeGreaterThan(secondary.automation);
  });

  it("clamps weights so one goal cannot dominate the score", () => {
    const extreme = resolveDomainWeights(
      profile({ priorities: ["seo", "google-ranking", "analytics"], primaryGoal: "seo" })
    );
    for (const weight of Object.values(extreme)) {
      expect(weight).toBeGreaterThanOrEqual(0.4);
      expect(weight).toBeLessThanOrEqual(3.5);
    }
  });

  it("falls back to a generic rule for an unknown industry", () => {
    expect(industryRuleFor("").id).toBe("other");
    expect(industryRuleFor("nonprofit").id).toBe("nonprofit");
  });

  it("expresses the brief's goal-to-domain mapping as data", () => {
    expect(goalEmphasisFor("more-leads")).toMatchObject({ seo: expect.any(Number), website: expect.any(Number) });
    expect(goalEmphasisFor("automation")).toMatchObject({ automation: expect.any(Number), crm: expect.any(Number) });
  });
});

// ----------------------------------------------------------- score engine

describe("score engine", () => {
  it("labels each band and never relies on colour alone", () => {
    expect(bandFor(85)).toMatchObject({ band: "strong", label: "Strong" });
    expect(bandFor(69.9)).toMatchObject({ band: "developing", label: "Developing" });
    expect(bandFor(39.9)).toMatchObject({ band: "at-risk", label: "At risk" });
  });

  it("places each score on the five-stage maturity ladder", () => {
    expect(maturityFor(0).step).toBe(1);
    expect(maturityFor(30).step).toBe(2);
    expect(maturityFor(50).step).toBe(3);
    expect(maturityFor(70).step).toBe(4);
    expect(maturityFor(85).step).toBe(5);
  });

  it("scores a best-case assessment at 100, with low risk and no weaknesses", () => {
    const assessment = run(CLINIC, answerBest(CLINIC));
    expect(assessment.scores.overall).toBe(100);
    expect(assessment.scores.risk.level).toBe("low");
    expect(assessment.scores.opportunity.level).toBe("limited");
    expect(assessment.weaknesses).toEqual([]);
    expect(assessment.strengths.length).toBeGreaterThan(4);
  });

  it("scores a worst-case assessment low, with critical risk and wide headroom", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    expect(assessment.scores.overall).toBeLessThan(35);
    expect(assessment.scores.maturity.key).toBe("nascent");
    expect(assessment.scores.risk.level).toBe("critical");
    expect(assessment.scores.opportunity.level).toBe("substantial");
    expect(assessment.recommendations.length).toBeGreaterThan(5);
  });

  it("produces a score for all nine domains, marking unasked ones", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    expect(assessment.scores.domains).toHaveLength(9);
    for (const domain of assessment.scores.domains) {
      expect(domain.score).toBeGreaterThanOrEqual(0);
      expect(domain.score).toBeLessThanOrEqual(100);
      if (domain.asked === 0) expect(domain.notAssessed).toBe(true);
    }
  });

  it("excludes unassessed domains from the overall", () => {
    // Answer only the first question, leaving most domains untouched.
    const plan = planAssessment(CLINIC);
    const first = plan.questions[0].question;
    const best = first.options[first.options.length - 1];
    const assessment = run(CLINIC, { [first.id]: { optionId: best.id } });

    expect(assessment.scores.overall).toBe(100);
    expect(assessment.scores.domains.filter((d) => d.notAssessed).length).toBeGreaterThan(5);
  });

  it("reports confidence from completion and breadth together", () => {
    expect(assessConfidence(30, 30, 0, 9).level).toBe("high");
    // Everything answered but only one domain covered is not high confidence.
    expect(assessConfidence(30, 30, 0, 1).level).toBe("moderate");
    expect(assessConfidence(30, 4, 6, 2).level).toBe("low");
  });

  it("mentions skipped questions in the confidence summary", () => {
    const assessment = run(CLINIC, {
      ...answerAll(CLINIC, 0),
      [planAssessment(CLINIC).questions[0].question.id]: { skipped: true },
    });
    expect(assessment.scores.skipped).toBeGreaterThan(0);
  });

  it("escalates risk on volume of high-priority findings, not just a low score", () => {
    // A business can average well and still be carrying several things that
    // each need fixing this month.
    expect(assessRisk([], 90, 0).level).toBe("low");
    expect(assessRisk([], 90, 3).level).toBe("elevated");
    expect(assessRisk([], 90, 6).level).toBe("critical");
  });

  it("names the domains driving risk and opportunity", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    expect(assessment.scores.risk.drivers.length).toBeGreaterThan(0);
    expect(assessment.scores.opportunity.topDomains.length).toBeGreaterThan(0);
  });
});

// -------------------------------------------------- recommendation engine

describe("recommendation engine", () => {
  it("recommends nothing that no answer triggered", () => {
    // The real invariant: every recommendation traces to an answer, and no
    // recommendation exists without one.
    for (const target of [CLINIC, MANUFACTURER_NO_SITE, NEW_RESTAURANT]) {
      const assessment = run(target, answerWorst(target));
      const triggered = new Set(assessment.findings.map((finding) => finding.serviceId));
      for (const recommendation of assessment.recommendations) {
        expect(triggered, recommendation.service.id).toContain(recommendation.service.id);
      }
    }
  });

  it("recommends only what a top-scoring business genuinely still needs", () => {
    const assessment = run(CLINIC, answerBest(CLINIC));

    // A handful at most, none of them urgent, and each still evidenced.
    expect(assessment.recommendations.length).toBeLessThanOrEqual(3);
    expect(assessment.recommendations.every((r) => r.priority !== "HIGH")).toBe(true);
    for (const recommendation of assessment.recommendations) {
      expect(recommendation.findings.length).toBeGreaterThan(0);
    }
  });

  it("attaches the evidence for every recommendation", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    for (const recommendation of assessment.recommendations) {
      expect(recommendation.findings.length, recommendation.service.id).toBeGreaterThan(0);
      for (const finding of recommendation.findings) {
        expect(finding.answerLabel.length).toBeGreaterThan(0);
        expect(finding.question.length).toBeGreaterThan(0);
      }
    }
  });

  it("collapses repeated triggers into one recommendation, keeping the highest priority", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    const ids = assessment.recommendations.map((r) => r.service.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(assessment.recommendations.some((r) => r.findings.length > 1)).toBe(true);
  });

  it("ranks the industry's own playbook services above generic ones", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    const rule = industryRuleFor("healthcare");
    const industryRanked = assessment.recommendations.filter((r) =>
      rule.priorityServices.includes(r.service.id)
    );
    expect(industryRanked.length).toBeGreaterThan(0);

    const firstIndustryIndex = assessment.recommendations.findIndex((r) =>
      rule.priorityServices.includes(r.service.id)
    );
    expect(firstIndustryIndex).toBeLessThan(4);
  });

  it("marks a large investment as a stretch for a pre-revenue business", () => {
    const assessment = run(NEW_RESTAURANT, answerWorst(NEW_RESTAURANT));
    const stretched = assessment.recommendations.filter((r) => r.stretch);
    expect(stretched.length).toBeGreaterThan(0);
    for (const item of stretched) expect(item.service.costMin).toBeGreaterThanOrEqual(100000);
  });

  it("does not mark a stretch for a business with revenue", () => {
    const assessment = run(MANUFACTURER_NO_SITE, answerWorst(MANUFACTURER_NO_SITE));
    expect(assessment.recommendations.every((r) => !r.stretch)).toBe(true);
  });

  it("recommends the industry's characteristic services when the answers warrant", () => {
    const clinic = run(CLINIC, answerWorst(CLINIC));
    const clinicIds = clinic.recommendations.map((r) => r.service.id);
    expect(clinicIds).toContain("booking-system");

    const manufacturer = run(MANUFACTURER_NO_SITE, answerWorst(MANUFACTURER_NO_SITE));
    const manufacturerIds = manufacturer.recommendations.map((r) => r.service.id);
    expect(manufacturerIds).toContain("product-catalogue");

    // And never each other's.
    expect(clinicIds).not.toContain("product-catalogue");
    expect(manufacturerIds).not.toContain("booking-system");
  });

  it("splits quick wins from long-term moves by effort", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    expect(assessment.quickWins.every((r) => r.service.effortDays <= 10)).toBe(true);
    expect(assessment.longTermMoves.every((r) => r.service.effortDays > 10)).toBe(true);
    expect(assessment.quickWins.length + assessment.longTermMoves.length).toBe(
      assessment.recommendations.length
    );
  });
});

// -------------------------------------------------------- roadmap engine

describe("roadmap engine", () => {
  it("always returns all six horizons", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    expect(assessment.roadmap).toHaveLength(6);
    expect(assessment.roadmap.map((phase) => phase.id)).toEqual(HORIZONS.map((h) => h.id));
  });

  it("schedules every recommendation exactly once", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    const scheduled = assessment.roadmap.flatMap((phase) => phase.tasks.map((t) => t.serviceId));
    expect(new Set(scheduled).size).toBe(assessment.recommendations.length);
    expect(scheduled.length).toBe(assessment.recommendations.length);
  });

  it("totals effort and investment per phase from its own tasks", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    for (const phase of assessment.roadmap) {
      expect(phase.effortDays).toBe(phase.tasks.reduce((sum, t) => sum + t.effortDays, 0));
      expect(phase.investmentMin).toBe(phase.tasks.reduce((sum, t) => sum + t.costMin, 0));
      expect(phase.investmentMax).toBe(phase.tasks.reduce((sum, t) => sum + t.costMax, 0));
    }
  });

  it("never schedules work before something it depends on", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    const phaseOf = new Map<string, number>();
    assessment.roadmap.forEach((phase, index) => {
      for (const task of phase.tasks) phaseOf.set(task.serviceId, index);
    });

    const pairs: Array<[string, string]> = [
      ["analytics-tracking", "executive-dashboard"],
      ["crm-implementation", "lifecycle-messaging"],
      ["crm-implementation", "retention-programme"],
    ];
    for (const [prerequisite, dependent] of pairs) {
      const a = phaseOf.get(prerequisite);
      const b = phaseOf.get(dependent);
      if (a === undefined || b === undefined) continue;
      expect(b, `${dependent} after ${prerequisite}`).toBeGreaterThan(a);
    }
  });

  it("respects what a solo operator can run at once", () => {
    const assessment = run(NEW_RESTAURANT, answerWorst(NEW_RESTAURANT));
    // Capacity holds across the first quarter — the phases a client actually
    // works to. The two later horizons are overflow buckets: work that will
    // not fit earlier has nowhere further to be pushed, and anything other
    // work depends on stops one phase short of the end so its dependants
    // still have somewhere to sit.
    for (const phase of assessment.roadmap.slice(0, 4)) {
      expect(phase.tasks.length, phase.id).toBeLessThanOrEqual(1);
    }
  });

  it("lets a larger team run more in parallel", () => {
    const assessment = run(MANUFACTURER_NO_SITE, answerWorst(MANUFACTURER_NO_SITE));
    const busiest = Math.max(...assessment.roadmap.map((phase) => phase.tasks.length));
    expect(busiest).toBeGreaterThan(1);
  });

  it("defers a stretch investment out of the earliest phases", () => {
    const assessment = run(NEW_RESTAURANT, answerWorst(NEW_RESTAURANT));
    const stretched = assessment.recommendations.filter((r) => r.stretch).map((r) => r.service.id);
    const early = assessment.roadmap
      .slice(0, 1)
      .flatMap((phase) => phase.tasks.map((task) => task.serviceId));
    for (const id of stretched) expect(early).not.toContain(id);
  });

  it("gives every task the commercial detail the brief asks for", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    for (const phase of activePhases(assessment.roadmap)) {
      for (const task of phase.tasks) {
        expect(task.difficulty).toBeTruthy();
        expect(task.impact).toBeTruthy();
        expect(task.costMax).toBeGreaterThanOrEqual(task.costMin);
        expect(task.roi.length).toBeGreaterThan(10);
        expect(task.sequencingNote.length).toBeGreaterThan(10);
      }
    }
  });
});

// ------------------------------------------------------- proposal engine

describe("proposal engine", () => {
  it("scopes only what the assessment triggered", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    const proposal = buildProposal(assessment);
    expect(proposal.lineItems).toHaveLength(assessment.recommendations.length);

    const proposed = new Set(proposal.lineItems.map((item) => item.serviceId));
    const recommended = new Set(assessment.recommendations.map((r) => r.service.id));
    expect(proposed).toEqual(recommended);
  });

  it("matches the assessment's totals", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    const proposal = buildProposal(assessment);
    expect(proposal.totalEffortDays).toBe(assessment.effortDays);
    expect(proposal.investmentMin).toBe(assessment.investment.min);
    expect(proposal.investmentMax).toBe(assessment.investment.max);
  });

  it("assigns every line item to a real phase", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    const proposal = buildProposal(assessment);
    const labels = new Set(proposal.phases.map((phase) => phase.label));
    for (const item of proposal.lineItems) expect(labels).toContain(item.phase);
  });

  it("quotes the triggering answer as the rationale", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    const proposal = buildProposal(assessment);
    for (const item of proposal.lineItems) {
      expect(item.rationale, item.serviceId).toMatch(/You answered/);
    }
  });

  it("names the industry and the score in the executive summary", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    const proposal = buildProposal(assessment);
    expect(proposal.executiveSummary).toContain(CLINIC.businessName);
    expect(proposal.executiveSummary).toContain("healthcare");
    expect(proposal.executiveSummary).toContain(`${Math.round(assessment.scores.overall)} out of 100`);
    expect(proposal.industryNote.length).toBeGreaterThan(40);
  });

  it("generates a stable reference and a 30-day validity", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    const a = buildProposal(assessment);
    const b = buildProposal(assessment);
    expect(a.reference).toBe(b.reference);
    expect(a.reference).toMatch(/^RPT-\d{8}-\d{5}$/);

    const days = (new Date(a.validUntil).getTime() - new Date(a.issuedAt).getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(30);
  });

  it("degrades to a maintenance proposal when nothing was triggered", () => {
    // Answering every question at its best AND removing the one deliberate
    // top-answer trigger leaves nothing to scope.
    const assessment = run(CLINIC, answerBest(CLINIC));
    const empty = { ...assessment, recommendations: [], roadmap: [], investment: { min: 0, max: 0 }, effortDays: 0 };
    const proposal = buildProposal(empty);

    expect(proposal.lineItems).toEqual([]);
    expect(proposal.engagementWindow).toBe("No remediation required");
    expect(proposal.headline).toBe("A maintenance and optimisation engagement");
    expect(proposal.outcomes.length).toBeGreaterThan(0);
  });
});

// ------------------------------------------------------- whole assessment

describe("runAssessment", () => {
  it("is deterministic for the same inputs", () => {
    const answers = answerWorst(CLINIC);
    expect(JSON.stringify(run(CLINIC, answers))).toBe(JSON.stringify(run(CLINIC, answers)));
  });

  it("carries the contact, profile and industry context through", () => {
    const assessment = run(CLINIC, answerWorst(CLINIC));
    expect(assessment.contact).toEqual(CONTACT);
    expect(assessment.profile).toEqual(CLINIC);
    expect(assessment.industry.label).toBe("Healthcare & wellness");
    expect(assessment.industry.injectedTopics.length).toBeGreaterThan(3);
    expect(assessment.generatedAt).toBe(AT);
  });

  it("produces a materially different plan for a different business", () => {
    const clinic = run(CLINIC, answerWorst(CLINIC));
    const restaurant = run(NEW_RESTAURANT, answerWorst(NEW_RESTAURANT));

    expect(clinic.industry.label).not.toBe(restaurant.industry.label);
    expect(clinic.scores.domains.map((d) => d.weight)).not.toEqual(
      restaurant.scores.domains.map((d) => d.weight)
    );

    const clinicServices = new Set(clinic.recommendations.map((r) => r.service.id));
    const restaurantServices = new Set(restaurant.recommendations.map((r) => r.service.id));
    const overlap = Array.from(clinicServices).filter((id) => restaurantServices.has(id));
    expect(overlap.length).toBeLessThan(clinicServices.size);
  });

  it("handles an assessment where everything was skipped", () => {
    const plan = planAssessment(CLINIC);
    const answers: AnswersMap = {};
    for (const item of plan.questions) answers[item.question.id] = { skipped: true };

    const assessment = run(CLINIC, answers);
    expect(assessment.scores.answered).toBe(0);
    expect(assessment.scores.skipped).toBe(plan.questions.length);
    expect(assessment.scores.overall).toBe(0);
    expect(assessment.scores.confidence.level).toBe("low");
    expect(assessment.recommendations).toEqual([]);
  });
});
