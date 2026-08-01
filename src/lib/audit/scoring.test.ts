import { describe, expect, it } from "vitest";
import { CATEGORIES, ORDERED_QUESTIONS, QUESTIONS } from "@/data/questionBank";
import {
  bandFor,
  collectFindings,
  computeScores,
  getPoints,
  isAnswered,
} from "@/lib/audit/scoring";
import type { AnswersMap } from "@/lib/audit/types";

const question = (id: string) => QUESTIONS.find((q) => q.id === id)!;

/** Answers every question in a category with the option at `optionIndex`. */
function answerCategory(categoryId: string, optionIndex: number): AnswersMap {
  const answers: AnswersMap = {};
  for (const q of QUESTIONS.filter((candidate) => candidate.categoryId === categoryId)) {
    if (q.type === "SCALE") {
      answers[q.id] = { value: q.scaleMin ?? 1 };
    } else {
      const option = q.options[Math.min(optionIndex, q.options.length - 1)];
      answers[q.id] = { optionId: option.id };
    }
  }
  return answers;
}

describe("isAnswered", () => {
  it("distinguishes answered, skipped and absent", () => {
    expect(isAnswered(undefined)).toBe(false);
    expect(isAnswered({})).toBe(false);
    expect(isAnswered({ skipped: true })).toBe(false);
    expect(isAnswered({ optionId: "x" })).toBe(true);
    expect(isAnswered({ value: 4 })).toBe(true);
  });

  it("treats a skip as unanswered even when an old option is still attached", () => {
    expect(isAnswered({ optionId: "x", skipped: true })).toBe(false);
  });
});

describe("getPoints", () => {
  it("returns the selected option's points", () => {
    const q = question("web-presence");
    expect(getPoints(q, { optionId: "web-presence-none" })).toBe(0);
    expect(getPoints(q, { optionId: "web-presence-optimised" })).toBe(100);
  });

  it("returns null for an unknown option", () => {
    expect(getPoints(question("web-presence"), { optionId: "nope" })).toBeNull();
  });

  it("normalises a SCALE answer onto 0–100", () => {
    const q = question("web-speed");
    expect(getPoints(q, { value: 1 })).toBe(0);
    expect(getPoints(q, { value: 10 })).toBe(100);
    expect(getPoints(q, { value: 5 })).toBeCloseTo(44.44, 1);
  });

  it("clamps a SCALE answer outside its range", () => {
    const q = question("web-speed");
    expect(getPoints(q, { value: -5 })).toBe(0);
    expect(getPoints(q, { value: 99 })).toBe(100);
  });

  it("returns null for skipped and unanswered questions", () => {
    const q = question("web-presence");
    expect(getPoints(q, { skipped: true })).toBeNull();
    expect(getPoints(q, undefined)).toBeNull();
  });
});

describe("bandFor", () => {
  it("labels each band and never relies on colour alone", () => {
    expect(bandFor(85)).toMatchObject({ band: "strong", label: "Strong" });
    expect(bandFor(70)).toMatchObject({ band: "strong" });
    expect(bandFor(69.9)).toMatchObject({ band: "developing", label: "Developing" });
    expect(bandFor(40)).toMatchObject({ band: "developing" });
    expect(bandFor(39.9)).toMatchObject({ band: "at-risk", label: "At risk" });
    expect(bandFor(0)).toMatchObject({ band: "at-risk" });
  });
});

describe("computeScores", () => {
  it("scores an empty audit at zero without dividing by zero", () => {
    const result = computeScores({});
    expect(result.overall).toBe(0);
    expect(result.answered).toBe(0);
    expect(result.total).toBe(35);
    expect(result.categoryScores).toHaveLength(7);
    expect(result.categoryScores.every((c) => c.score === 0)).toBe(true);
  });

  it("scores a perfect audit at 100", () => {
    const answers: AnswersMap = {};
    for (const q of ORDERED_QUESTIONS) {
      if (q.type === "SCALE") answers[q.id] = { value: q.scaleMax ?? 10 };
      else answers[q.id] = { optionId: q.options[q.options.length - 1].id };
    }

    const result = computeScores(answers);
    expect(result.overall).toBe(100);
    expect(result.answered).toBe(35);
    expect(result.skipped).toBe(0);
    expect(result.categoryScores.every((c) => c.score === 100)).toBe(true);
  });

  it("counts skips separately and excludes them from the score", () => {
    const answers: AnswersMap = {
      ...answerCategory("website", 0),
      "brand-identity": { skipped: true },
    };
    // The website category was answered with its worst options.
    const result = computeScores(answers);
    expect(result.skipped).toBe(1);
    expect(result.answered).toBe(5);

    const brand = result.categoryScores.find((c) => c.categoryId === "brand")!;
    expect(brand.answered).toBe(0);
    expect(brand.score).toBe(0);
  });

  it("excludes wholly unanswered categories from the weighted overall", () => {
    // Only the website category is answered, all at maximum.
    const answers: AnswersMap = {};
    for (const q of QUESTIONS.filter((candidate) => candidate.categoryId === "website")) {
      if (q.type === "SCALE") answers[q.id] = { value: q.scaleMax ?? 10 };
      else answers[q.id] = { optionId: q.options[q.options.length - 1].id };
    }

    const result = computeScores(answers);
    // Six unanswered categories must not drag the overall towards zero.
    expect(result.overall).toBe(100);
  });

  it("weights categories by their configured weight", () => {
    const answers: AnswersMap = {};
    for (const q of ORDERED_QUESTIONS) {
      const perfect = q.categoryId === "sales"; // weight 1.2
      const zero = q.categoryId === "automation"; // weight 0.9
      if (!perfect && !zero) continue;
      if (q.type === "SCALE") answers[q.id] = { value: perfect ? (q.scaleMax ?? 10) : (q.scaleMin ?? 1) };
      else answers[q.id] = { optionId: perfect ? q.options[q.options.length - 1].id : q.options[0].id };
    }

    const result = computeScores(answers);
    const sales = result.categoryScores.find((c) => c.categoryId === "sales")!;
    const automation = result.categoryScores.find((c) => c.categoryId === "automation")!;
    expect(sales.score).toBe(100);
    // Automation's worst options are not all worth zero, so assert against the
    // category's own computed score rather than a hard-coded floor.
    expect(automation.score).toBeLessThan(20);

    const expected =
      (sales.score * sales.weight + automation.score * automation.weight) /
      (sales.weight + automation.weight);
    expect(result.overall).toBeCloseTo(expected, 1);

    // Weighted towards sales, so above the unweighted mean of the two.
    expect(result.overall).toBeGreaterThan((sales.score + automation.score) / 2);
  });

  it("reports each category's answered count against its total", () => {
    const result = computeScores(answerCategory("seo", 0));
    const seo = result.categoryScores.find((c) => c.categoryId === "seo")!;
    expect(seo.answered).toBe(5);
    expect(seo.total).toBe(5);
    expect(seo.weight).toBe(CATEGORIES.find((c) => c.id === "seo")!.weight);
  });
});

describe("collectFindings", () => {
  it("returns nothing for an empty audit", () => {
    expect(collectFindings({})).toEqual([]);
  });

  it("captures the triggering answer, priority and impact", () => {
    const findings = collectFindings({ "web-presence": { optionId: "web-presence-none" } });
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      questionId: "web-presence",
      serviceId: "website-build",
      priority: "HIGH",
      answerLabel: "No website at all",
      categoryId: "website",
    });
    expect(findings[0].impact.length).toBeGreaterThan(0);
  });

  it("ignores answers that trigger nothing", () => {
    expect(collectFindings({ "web-presence": { optionId: "web-presence-optimised" } })).toEqual([]);
  });

  it("triggers a SCALE finding only at or below its threshold", () => {
    // web-speed has threshold 6.
    expect(collectFindings({ "web-speed": { value: 7 } })).toEqual([]);

    const atThreshold = collectFindings({ "web-speed": { value: 6 } });
    expect(atThreshold).toHaveLength(1);
    expect(atThreshold[0]).toMatchObject({
      serviceId: "web-performance",
      priority: "HIGH",
      answerLabel: "6 out of 10",
    });
  });

  it("ignores skipped questions entirely", () => {
    expect(collectFindings({ "web-presence": { optionId: "web-presence-none", skipped: true } }))
      .toEqual([]);
  });
});
