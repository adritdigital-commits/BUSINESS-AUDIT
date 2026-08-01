import { describe, expect, it } from "vitest";
import { ORDERED_QUESTIONS, QUESTIONS } from "@/data/questionBank";
import { buildReport, maturityFor, riskFor } from "@/lib/audit/report";
import type { AnswersMap, BusinessDetails, ClientDetails } from "@/lib/audit/types";

const CLIENT: ClientDetails = {
  fullName: "Priya Sharma",
  email: "priya@northline.co.in",
  phone: "+91 98765 43210",
  role: "Founder / Owner",
};

const BUSINESS: BusinessDetails = {
  businessName: "Northline Interiors",
  website: "northline.co.in",
  industry: "Real estate & construction",
  teamSize: "11–50 people",
  annualRevenue: "₹1 – 5 crore",
  primaryGoal: "Generate more qualified leads",
};

/** Answers every question with its best or worst available answer. */
function uniformAnswers(kind: "best" | "worst"): AnswersMap {
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
  return answers;
}

const build = (answers: AnswersMap) =>
  buildReport({
    answers,
    client: CLIENT,
    business: BUSINESS,
    generatedAt: "2026-08-01T09:20:00.000Z",
  });

describe("maturityFor", () => {
  it("places each score on the five-stage ladder", () => {
    expect(maturityFor(0)).toMatchObject({ key: "nascent", step: 1 });
    expect(maturityFor(29.9)).toMatchObject({ key: "nascent" });
    expect(maturityFor(30)).toMatchObject({ key: "emerging", step: 2 });
    expect(maturityFor(50)).toMatchObject({ key: "established", step: 3 });
    expect(maturityFor(70)).toMatchObject({ key: "advanced", step: 4 });
    expect(maturityFor(85)).toMatchObject({ key: "leading", step: 5 });
    expect(maturityFor(100)).toMatchObject({ key: "leading" });
  });
});

describe("riskFor", () => {
  it("escalates on a low score", () => {
    expect(riskFor(20, 0).level).toBe("critical");
    expect(riskFor(50, 0).level).toBe("elevated");
    expect(riskFor(65, 0).level).toBe("moderate");
    expect(riskFor(90, 0).level).toBe("low");
  });

  it("escalates on volume of high-priority gaps even at a decent score", () => {
    expect(riskFor(90, 3).level).toBe("elevated");
    expect(riskFor(90, 6).level).toBe("critical");
  });

  it("always ships a label and a summary alongside the level", () => {
    for (const score of [10, 45, 60, 95]) {
      const risk = riskFor(score, 0);
      expect(risk.label.length).toBeGreaterThan(0);
      expect(risk.summary.length).toBeGreaterThan(0);
    }
  });
});

describe("buildReport", () => {
  it("produces a perfect report with no remediation for the best answers", () => {
    const report = build(uniformAnswers("best"));

    expect(report.overall).toBe(100);
    expect(report.maturity.key).toBe("leading");
    expect(report.risk.level).toBe("low");
    expect(report.recommendations).toEqual([]);
    expect(report.quickWins).toEqual([]);
    expect(report.longTermMoves).toEqual([]);
    expect(report.weaknesses).toEqual([]);
    expect(report.strengths).toHaveLength(7);
    expect(report.investment).toEqual({ min: 0, max: 0 });
    expect(report.effortDays).toBe(0);
    expect(report.completeness).toBe(100);
  });

  it("produces a critical report with recommendations for the worst answers", () => {
    const report = build(uniformAnswers("worst"));

    expect(report.overall).toBeLessThan(20);
    expect(report.maturity.key).toBe("nascent");
    expect(report.risk.level).toBe("critical");
    expect(report.recommendations.length).toBeGreaterThan(5);
    expect(report.strengths).toEqual([]);
    expect(report.weaknesses).toHaveLength(7);
    expect(report.investment.max).toBeGreaterThan(report.investment.min);
    expect(report.effortDays).toBeGreaterThan(0);
  });

  it("orders recommendations by priority", () => {
    const report = build(uniformAnswers("worst"));
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
    const ranks = report.recommendations.map((r) => order[r.priority]);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  });

  it("collapses repeated triggers of one service into a single recommendation", () => {
    const report = build(uniformAnswers("worst"));
    const ids = report.recommendations.map((r) => r.service.id);
    expect(new Set(ids).size).toBe(ids.length);

    // At least one engagement should be evidenced by more than one answer.
    expect(report.recommendations.some((r) => r.findings.length > 1)).toBe(true);
  });

  it("keeps the highest priority when a service is triggered at two priorities", () => {
    // ops-analytics is triggered HIGH by ops-analytics-none and MEDIUM by
    // sales-conversion-guess.
    const report = build({
      "sales-conversion": { optionId: "sales-conversion-guess" },
      "ops-analytics": { optionId: "ops-analytics-none" },
    });

    const analytics = report.recommendations.find((r) => r.service.id === "ops-analytics")!;
    expect(analytics.priority).toBe("HIGH");
    expect(analytics.findings).toHaveLength(2);
    expect(analytics.categoryNames.length).toBe(2);
  });

  it("splits quick wins from long-term moves by effort, not priority", () => {
    const report = build(uniformAnswers("worst"));

    expect(report.quickWins.every((r) => r.service.effortDays <= 10)).toBe(true);
    expect(report.longTermMoves.every((r) => r.service.effortDays > 10)).toBe(true);
    expect(report.quickWins.length + report.longTermMoves.length).toBe(
      report.recommendations.length
    );
    // A fast critical fix belongs in quick wins.
    expect(report.quickWins.some((r) => r.priority === "HIGH")).toBe(true);
  });

  it("builds three roadmap phases whose totals match their contents", () => {
    const report = build(uniformAnswers("worst"));
    expect(report.roadmap).toHaveLength(3);

    for (const phase of report.roadmap) {
      const effort = phase.recommendations.reduce((sum, r) => sum + r.service.effortDays, 0);
      const min = phase.recommendations.reduce((sum, r) => sum + r.service.costMin, 0);
      const max = phase.recommendations.reduce((sum, r) => sum + r.service.costMax, 0);
      expect(phase.effortDays).toBe(effort);
      expect(phase.investmentMin).toBe(min);
      expect(phase.investmentMax).toBe(max);
    }

    const scheduled = report.roadmap.flatMap((p) => p.recommendations.map((r) => r.service.id));
    expect(new Set(scheduled).size).toBe(report.recommendations.length);
  });

  it("defers work into a later phase rather than leaving it empty", () => {
    // Answers that trigger only HIGH-priority work would otherwise leave
    // phases two and three empty.
    const answers: AnswersMap = {
      "web-presence": { optionId: "web-presence-none" },
      "web-conversion": { optionId: "web-conversion-none" },
      "web-security": { optionId: "web-security-none" },
      "seo-visibility": { optionId: "seo-visibility-none" },
      "sales-crm": { optionId: "sales-crm-none" },
    };

    const report = build(answers);
    expect(report.recommendations.every((r) => r.priority === "HIGH")).toBe(true);
    expect(report.roadmap[1].recommendations.length).toBeGreaterThan(0);
    expect(report.roadmap[2].recommendations.length).toBeGreaterThan(0);
  });

  it("reports completeness from answered questions only", () => {
    const answers: AnswersMap = {};
    for (const question of QUESTIONS.slice(0, 7)) {
      answers[question.id] =
        question.type === "SCALE" ? { value: 5 } : { optionId: question.options[0].id };
    }
    answers[QUESTIONS[10].id] = { skipped: true };

    const report = build(answers);
    expect(report.scores.answered).toBe(7);
    expect(report.scores.skipped).toBe(1);
    expect(report.completeness).toBe(20);
  });

  it("carries the client and business details through unchanged", () => {
    const report = build(uniformAnswers("best"));
    expect(report.client).toEqual(CLIENT);
    expect(report.business).toEqual(BUSINESS);
    expect(report.generatedAt).toBe("2026-08-01T09:20:00.000Z");
  });

  it("is deterministic for the same inputs", () => {
    const answers = uniformAnswers("worst");
    expect(JSON.stringify(build(answers))).toBe(JSON.stringify(build(answers)));
  });
});
