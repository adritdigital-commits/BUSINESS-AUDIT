import { beforeEach, describe, expect, it } from "vitest";
import {
  collectRecommendations,
  computeScore,
  getPoints,
  indexQuestions,
  isVisible,
  type AnswersMap,
} from "@/lib/scoring";
import {
  makeCategory,
  makeOption,
  makeQuestion,
  makeRecommendingOption,
  makeScoredCategory,
  makeService,
  resetFactories,
} from "../../tests/factories";

beforeEach(resetFactories);

describe("getPoints", () => {
  it("returns null for an unanswered question", () => {
    const q = makeQuestion({ options: [makeOption({ points: 50 })] });
    expect(getPoints(q, undefined, q.options)).toBeNull();
  });

  it("returns the selected option's points for CHOICE", () => {
    const q = makeQuestion({ options: [makeOption({ points: 40 }), makeOption({ points: 90 })] });
    expect(getPoints(q, { optionId: q.options[1].id }, q.options)).toBe(90);
  });

  it("returns null when the selected option belongs to another question", () => {
    const q = makeQuestion({ options: [makeOption({ points: 40 })] });
    expect(getPoints(q, { optionId: "opt_from_elsewhere" }, q.options)).toBeNull();
  });

  it("averages the selected options for CHECKBOX", () => {
    const q = makeQuestion({
      type: "CHECKBOX",
      options: [makeOption({ points: 0 }), makeOption({ points: 50 }), makeOption({ points: 100 })],
    });
    const answer = { optionIds: [q.options[1].id, q.options[2].id] };
    expect(getPoints(q, answer, q.options)).toBe(75);
  });

  it("returns null for CHECKBOX with no selections", () => {
    const q = makeQuestion({ type: "CHECKBOX", options: [makeOption({ points: 50 })] });
    expect(getPoints(q, { optionIds: [] }, q.options)).toBeNull();
  });

  describe("SCALE normalization", () => {
    const scale = makeQuestion({ type: "SCALE", scaleMin: 1, scaleMax: 10, options: [] });

    it("maps the minimum to 0", () => {
      expect(getPoints(scale, { value: 1 }, [])).toBe(0);
    });

    it("maps the maximum to 100", () => {
      expect(getPoints(scale, { value: 10 }, [])).toBe(100);
    });

    it("maps the midpoint proportionally", () => {
      expect(getPoints(scale, { value: 5 }, [])).toBeCloseTo(44.44, 1);
    });

    it("clamps values outside the range", () => {
      expect(getPoints(scale, { value: 99 }, [])).toBe(100);
      expect(getPoints(scale, { value: -5 }, [])).toBe(0);
    });

    it("returns null for a non-numeric answer", () => {
      expect(getPoints(scale, { value: "eight" }, [])).toBeNull();
    });

    it("returns null when the range is degenerate", () => {
      const flat = makeQuestion({ type: "SCALE", scaleMin: 5, scaleMax: 5, options: [] });
      expect(getPoints(flat, { value: 5 }, [])).toBeNull();
    });
  });

  it("returns null for unscored free-text types", () => {
    const q = makeQuestion({ type: "TEXT", options: [] });
    expect(getPoints(q, { value: "anything" }, [])).toBeNull();
  });
});

describe("isVisible", () => {
  it("shows a question with no condition", () => {
    const q = makeQuestion();
    expect(isVisible(q, {}, indexQuestions([]))).toBe(true);
  });

  it("hides a conditional question until its gate is answered", () => {
    const gate = makeQuestion({ options: [makeOption({ label: "Yes" })] });
    const dependent = makeQuestion({
      showIfJson: { questionId: gate.id, equals: gate.options[0].id },
    });
    const idx = indexQuestions([makeCategory({ questions: [gate, dependent] })]);
    expect(isVisible(dependent, {}, idx)).toBe(false);
  });

  it("honours an `equals` rule", () => {
    const gate = makeQuestion({ options: [makeOption({ label: "Yes" }), makeOption({ label: "No" })] });
    const dependent = makeQuestion({
      showIfJson: { questionId: gate.id, equals: gate.options[0].id },
    });
    const idx = indexQuestions([makeCategory({ questions: [gate, dependent] })]);

    expect(isVisible(dependent, { [gate.id]: { optionId: gate.options[0].id } }, idx)).toBe(true);
    expect(isVisible(dependent, { [gate.id]: { optionId: gate.options[1].id } }, idx)).toBe(false);
  });

  it("honours an `in` rule — the shape the seed uses for gating", () => {
    const gate = makeQuestion({
      options: [makeOption({ label: "None" }), makeOption({ label: "Basic" }), makeOption({ label: "Full" })],
    });
    const allowed = [gate.options[1].id, gate.options[2].id];
    const dependent = makeQuestion({ showIfJson: { questionId: gate.id, in: allowed } });
    const idx = indexQuestions([makeCategory({ questions: [gate, dependent] })]);

    expect(isVisible(dependent, { [gate.id]: { optionId: gate.options[0].id } }, idx)).toBe(false);
    expect(isVisible(dependent, { [gate.id]: { optionId: gate.options[1].id } }, idx)).toBe(true);
  });

  it("honours numeric threshold rules against a SCALE gate", () => {
    const gate = makeQuestion({ type: "SCALE", scaleMin: 1, scaleMax: 10, options: [] });
    const dependent = makeQuestion({ showIfJson: { questionId: gate.id, lt: 50 } });
    const idx = indexQuestions([makeCategory({ questions: [gate, dependent] })]);

    expect(isVisible(dependent, { [gate.id]: { value: 2 } }, idx)).toBe(true); // ~11
    expect(isVisible(dependent, { [gate.id]: { value: 9 } }, idx)).toBe(false); // ~89
  });
});

describe("computeScore", () => {
  it("returns a zero overall and no categories when nothing is answered", () => {
    const result = computeScore([makeScoredCategory([0, 100])], {});
    expect(result.overall).toBe(0);
    expect(result.categoryScores).toHaveLength(0);
  });

  it("averages points within a category", () => {
    const q1 = makeQuestion({ options: [makeOption({ points: 40 })] });
    const q2 = makeQuestion({ options: [makeOption({ points: 100 })] });
    const cat = makeCategory({ questions: [q1, q2] });
    const answers: AnswersMap = {
      [q1.id]: { optionId: q1.options[0].id },
      [q2.id]: { optionId: q2.options[0].id },
    };

    expect(computeScore([cat], answers).categoryScores[0].score).toBe(70);
  });

  it("weights categories against each other", () => {
    const low = makeScoredCategory([0], { weight: 1, name: "Low" });
    const high = makeScoredCategory([100], { weight: 3, name: "High" });
    const answers: AnswersMap = {
      [low.questions[0].id]: { optionId: low.questions[0].options[0].id },
      [high.questions[0].id]: { optionId: high.questions[0].options[0].id },
    };

    // (0*1 + 100*3) / 4 = 75
    expect(computeScore([low, high], answers).overall).toBe(75);
  });

  it("excludes answers to questions hidden by conditional logic", () => {
    const gate = makeQuestion({ options: [makeOption({ label: "No", points: 0 })] });
    const hidden = makeQuestion({
      showIfJson: { questionId: gate.id, in: ["some-other-option"] },
      options: [makeOption({ label: "Great", points: 100 })],
    });
    const cat = makeCategory({ questions: [gate, hidden] });
    const answers: AnswersMap = {
      [gate.id]: { optionId: gate.options[0].id },
      [hidden.id]: { optionId: hidden.options[0].id },
    };

    // The hidden 100 must not drag the average up.
    expect(computeScore([cat], answers).categoryScores[0].score).toBe(0);
  });

  it("ignores inactive categories and questions", () => {
    const activeQ = makeQuestion({ options: [makeOption({ points: 100 })] });
    const inactiveQ = makeQuestion({ isActive: false, options: [makeOption({ points: 0 })] });
    const cat = makeCategory({ questions: [activeQ, inactiveQ] });
    const inactiveCat = makeScoredCategory([0], { isActive: false });

    const answers: AnswersMap = {
      [activeQ.id]: { optionId: activeQ.options[0].id },
      [inactiveQ.id]: { optionId: inactiveQ.options[0].id },
      [inactiveCat.questions[0].id]: { optionId: inactiveCat.questions[0].options[0].id },
    };

    const result = computeScore([cat, inactiveCat], answers);
    expect(result.categoryScores).toHaveLength(1);
    expect(result.categoryScores[0].score).toBe(100);
  });

  it("omits categories where nothing scoreable was answered", () => {
    const answered = makeScoredCategory([100], { name: "Answered" });
    const untouched = makeScoredCategory([50], { name: "Untouched" });
    const answers: AnswersMap = {
      [answered.questions[0].id]: { optionId: answered.questions[0].options[0].id },
    };

    const result = computeScore([answered, untouched], answers);
    expect(result.categoryScores.map((c) => c.name)).toEqual(["Answered"]);
  });
});

describe("collectRecommendations", () => {
  it("returns nothing when no triggering option is selected", () => {
    const cat = makeScoredCategory([100]);
    const answers: AnswersMap = {
      [cat.questions[0].id]: { optionId: cat.questions[0].options[0].id },
    };
    expect(collectRecommendations([cat], answers)).toHaveLength(0);
  });

  it("collects the recommendation attached to the selected option", () => {
    const opt = makeRecommendingOption("CRM Setup", "HIGH");
    const q = makeQuestion({ options: [opt] });
    const cat = makeCategory({ questions: [q] });

    const recs = collectRecommendations([cat], { [q.id]: { optionId: opt.id } });
    expect(recs).toHaveLength(1);
    expect(recs[0]).toMatchObject({ service: "CRM Setup", priority: "HIGH" });
  });

  it("sorts HIGH before MEDIUM before LOW", () => {
    const lowOpt = makeRecommendingOption("Low Svc", "LOW");
    const highOpt = makeRecommendingOption("High Svc", "HIGH");
    const medOpt = makeRecommendingOption("Med Svc", "MEDIUM");
    const qs = [lowOpt, highOpt, medOpt].map((o) => makeQuestion({ options: [o] }));
    const cat = makeCategory({ questions: qs });

    const answers: AnswersMap = Object.fromEntries(
      qs.map((q) => [q.id, { optionId: q.options[0].id }])
    );

    expect(collectRecommendations([cat], answers).map((r) => r.priority)).toEqual([
      "HIGH",
      "MEDIUM",
      "LOW",
    ]);
  });

  it("de-duplicates by service, keeping the highest priority instance", () => {
    const service = makeService({ name: "Shared Service" });
    const lowOpt = makeOption({ recommendedServiceId: service.id, recommendedService: service, priority: "LOW" });
    const highOpt = makeOption({ recommendedServiceId: service.id, recommendedService: service, priority: "HIGH" });
    const q1 = makeQuestion({ options: [lowOpt] });
    const q2 = makeQuestion({ options: [highOpt] });
    const cat = makeCategory({ questions: [q1, q2] });

    const recs = collectRecommendations([cat], {
      [q1.id]: { optionId: lowOpt.id },
      [q2.id]: { optionId: highOpt.id },
    });

    expect(recs).toHaveLength(1);
    expect(recs[0].priority).toBe("HIGH");
  });

  it("does not collect recommendations from questions hidden by conditional logic", () => {
    const gate = makeQuestion({ options: [makeOption({ label: "No" })] });
    const trigger = makeRecommendingOption("Should Not Appear", "HIGH");
    const hidden = makeQuestion({
      showIfJson: { questionId: gate.id, in: ["another-option"] },
      options: [trigger],
    });
    const cat = makeCategory({ questions: [gate, hidden] });

    const recs = collectRecommendations([cat], {
      [gate.id]: { optionId: gate.options[0].id },
      [hidden.id]: { optionId: trigger.id },
    });

    expect(recs).toHaveLength(0);
  });

  it("ignores options that have a service but no priority", () => {
    const service = makeService();
    const opt = makeOption({ recommendedServiceId: service.id, recommendedService: service, priority: null });
    const q = makeQuestion({ options: [opt] });
    const cat = makeCategory({ questions: [q] });

    expect(collectRecommendations([cat], { [q.id]: { optionId: opt.id } })).toHaveLength(0);
  });
});
