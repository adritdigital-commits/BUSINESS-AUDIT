import { beforeEach, describe, expect, it } from "vitest";
import { generateReport } from "@/lib/report";
import type { AnswersMap } from "@/lib/scoring";
import {
  makeCategory,
  makeOption,
  makeQuestion,
  makeRecommendingOption,
  makeScoredCategory,
  resetFactories,
} from "../../tests/factories";

beforeEach(resetFactories);

describe("generateReport", () => {
  it("handles an empty assessment without dividing by zero", () => {
    const report = generateReport([makeScoredCategory([0, 100])], {});

    expect(report.overall).toBe(0);
    expect(report.categoryScores).toHaveLength(0);
    expect(report.strengths).toHaveLength(0);
    expect(report.weaknesses).toHaveLength(0);
    expect(report.recommendations).toHaveLength(0);
    expect(report.budget).toEqual({ min: 0, max: 0 });
  });

  it("classifies categories at or above 70 as strengths", () => {
    const strong = makeScoredCategory([70], { name: "Strong" });
    const answers: AnswersMap = {
      [strong.questions[0].id]: { optionId: strong.questions[0].options[0].id },
    };

    const report = generateReport([strong], answers);
    expect(report.strengths.map((s) => s.name)).toEqual(["Strong"]);
    expect(report.weaknesses).toHaveLength(0);
  });

  it("classifies categories below 50 as weaknesses", () => {
    const weak = makeScoredCategory([49], { name: "Weak" });
    const answers: AnswersMap = {
      [weak.questions[0].id]: { optionId: weak.questions[0].options[0].id },
    };

    const report = generateReport([weak], answers);
    expect(report.weaknesses.map((w) => w.name)).toEqual(["Weak"]);
    expect(report.strengths).toHaveLength(0);
  });

  it("leaves the 50-69 band as neither strength nor weakness", () => {
    const middling = makeScoredCategory([60], { name: "Middling" });
    const answers: AnswersMap = {
      [middling.questions[0].id]: { optionId: middling.questions[0].options[0].id },
    };

    const report = generateReport([middling], answers);
    expect(report.strengths).toHaveLength(0);
    expect(report.weaknesses).toHaveLength(0);
    expect(report.categoryScores).toHaveLength(1);
  });

  it("sorts strengths descending and weaknesses ascending", () => {
    const a = makeScoredCategory([100], { name: "Best" });
    const b = makeScoredCategory([80], { name: "Good" });
    const c = makeScoredCategory([10], { name: "Worst" });
    const d = makeScoredCategory([40], { name: "Bad" });

    const answers: AnswersMap = Object.fromEntries(
      [a, b, c, d].map((cat) => [cat.questions[0].id, { optionId: cat.questions[0].options[0].id }])
    );

    const report = generateReport([a, b, c, d], answers);
    expect(report.strengths.map((s) => s.name)).toEqual(["Best", "Good"]);
    expect(report.weaknesses.map((w) => w.name)).toEqual(["Worst", "Bad"]);
  });

  it("buckets the roadmap by priority", () => {
    const high = makeRecommendingOption("High Svc", "HIGH");
    const med = makeRecommendingOption("Med Svc", "MEDIUM");
    const low = makeRecommendingOption("Low Svc", "LOW");
    const qs = [high, med, low].map((o) => makeQuestion({ options: [o] }));
    const cat = makeCategory({ questions: qs });
    const answers: AnswersMap = Object.fromEntries(
      qs.map((q) => [q.id, { optionId: q.options[0].id }])
    );

    const { roadmap } = generateReport([cat], answers);
    expect(roadmap.days1to30.map((r) => r.service)).toEqual(["High Svc"]);
    expect(roadmap.days31to60.map((r) => r.service)).toEqual(["Med Svc"]);
    expect(roadmap.days61to90.map((r) => r.service)).toEqual(["Low Svc"]);
  });

  it("sums the budget band across triggered recommendations", () => {
    const a = makeRecommendingOption("A", "HIGH", { costRangeMin: 10000, costRangeMax: 25000 });
    const b = makeRecommendingOption("B", "MEDIUM", { costRangeMin: 5000, costRangeMax: 15000 });
    const qs = [a, b].map((o) => makeQuestion({ options: [o] }));
    const cat = makeCategory({ questions: qs });
    const answers: AnswersMap = Object.fromEntries(
      qs.map((q) => [q.id, { optionId: q.options[0].id }])
    );

    expect(generateReport([cat], answers).budget).toEqual({ min: 15000, max: 40000 });
  });

  it("treats missing cost ranges as zero rather than NaN", () => {
    const noCost = makeRecommendingOption("No Cost", "HIGH", {
      costRangeMin: null,
      costRangeMax: null,
    });
    const q = makeQuestion({ options: [noCost] });
    const cat = makeCategory({ questions: [q] });

    const { budget } = generateReport([cat], { [q.id]: { optionId: noCost.id } });
    expect(budget.min).toBe(0);
    expect(budget.max).toBe(0);
    expect(Number.isNaN(budget.max)).toBe(false);
  });

  it("produces no recommendations for a perfect score", () => {
    const perfect = makeCategory({
      questions: [makeQuestion({ options: [makeOption({ points: 100 })] })],
    });
    const answers: AnswersMap = {
      [perfect.questions[0].id]: { optionId: perfect.questions[0].options[0].id },
    };

    const report = generateReport([perfect], answers);
    expect(report.overall).toBe(100);
    expect(report.recommendations).toHaveLength(0);
    expect(report.roadmap.days1to30).toHaveLength(0);
  });

  it("stamps an ISO generatedAt timestamp", () => {
    const report = generateReport([], {});
    expect(() => new Date(report.generatedAt).toISOString()).not.toThrow();
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
