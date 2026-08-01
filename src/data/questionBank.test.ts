import { describe, expect, it } from "vitest";
import { CATEGORIES, ORDERED_QUESTIONS, QUESTIONS, TOTAL_QUESTIONS } from "@/data/questionBank";
import { SERVICES, getService } from "@/data/services";

/**
 * The question bank is content, but the product's contract depends on its
 * shape: "35 questions" is on the landing page, in the flow stepper and in
 * the progress counter, and every triggered service must exist.
 */
describe("question bank", () => {
  it("has exactly 35 questions across 7 categories", () => {
    expect(TOTAL_QUESTIONS).toBe(35);
    expect(QUESTIONS).toHaveLength(35);
    expect(CATEGORIES).toHaveLength(7);
  });

  it("gives every category exactly five questions", () => {
    for (const category of CATEGORIES) {
      const questions = QUESTIONS.filter((q) => q.categoryId === category.id);
      expect(questions, category.id).toHaveLength(5);
    }
  });

  it("orders questions by category, with none dropped", () => {
    expect(ORDERED_QUESTIONS).toHaveLength(TOTAL_QUESTIONS);
    const categoryOrder = ORDERED_QUESTIONS.map((q) => q.categoryId);
    const expected = CATEGORIES.flatMap((c) => Array(5).fill(c.id));
    expect(categoryOrder).toEqual(expected);
  });

  it("uses unique question and option ids", () => {
    const questionIds = QUESTIONS.map((q) => q.id);
    expect(new Set(questionIds).size).toBe(questionIds.length);

    const optionIds = QUESTIONS.flatMap((q) => q.options.map((o) => o.id));
    expect(new Set(optionIds).size).toBe(optionIds.length);
  });

  it("keeps every option's points inside the 0–100 scale", () => {
    for (const question of QUESTIONS) {
      for (const option of question.options) {
        expect(option.points, `${question.id}/${option.id}`).toBeGreaterThanOrEqual(0);
        expect(option.points, `${question.id}/${option.id}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("gives every CHOICE question at least two options and every SCALE question none", () => {
    for (const question of QUESTIONS) {
      if (question.type === "CHOICE") {
        expect(question.options.length, question.id).toBeGreaterThanOrEqual(2);
      } else {
        expect(question.options, question.id).toHaveLength(0);
        expect(question.scaleMin, question.id).toBeTypeOf("number");
        expect(question.scaleMax, question.id).toBeTypeOf("number");
      }
    }
  });

  it("only references services that exist in the catalogue", () => {
    for (const question of QUESTIONS) {
      if (question.scaleService) {
        expect(getService(question.scaleService), question.id).toBeDefined();
      }
      for (const option of question.options) {
        if (option.service) {
          expect(getService(option.service), `${question.id}/${option.id}`).toBeDefined();
        }
      }
    }
  });

  it("pairs every triggering answer with a priority and an impact statement", () => {
    for (const question of QUESTIONS) {
      for (const option of question.options) {
        if (!option.service) continue;
        expect(option.priority, `${question.id}/${option.id}`).toBeDefined();
        expect(option.impact?.length ?? 0, `${question.id}/${option.id}`).toBeGreaterThan(0);
      }
      if (question.scaleService) {
        expect(question.scaleThreshold, question.id).toBeTypeOf("number");
        expect(question.scalePriority, question.id).toBeDefined();
      }
    }
  });

  it("gives every service the commercial detail the proposal needs", () => {
    for (const service of SERVICES) {
      expect(service.deliverables.length, service.id).toBeGreaterThan(0);
      expect(service.benefits.length, service.id).toBeGreaterThan(0);
      expect(service.effortDays, service.id).toBeGreaterThan(0);
      expect(service.timeline.length, service.id).toBeGreaterThan(0);
      expect(service.costMax, service.id).toBeGreaterThanOrEqual(service.costMin);
    }
    expect(new Set(SERVICES.map((s) => s.id)).size).toBe(SERVICES.length);
  });
});
