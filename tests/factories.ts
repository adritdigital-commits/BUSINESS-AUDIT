import type { Priority, QuestionType } from "@prisma/client";
import type {
  CategoryWithQuestions,
  OptionWithService,
  QuestionWithOptions,
} from "@/lib/scoring";

const NOW = new Date("2026-01-01T00:00:00.000Z");

let counter = 0;
const nextId = (prefix: string) => `${prefix}_${++counter}`;

/** Reset ids between tests so failures report stable names. */
export function resetFactories() {
  counter = 0;
}

export function makeService(overrides: Partial<OptionWithService["recommendedService"]> = {}) {
  return {
    id: nextId("svc"),
    name: "Test Service",
    description: null,
    category: null,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function makeOption(overrides: Partial<OptionWithService> = {}): OptionWithService {
  const id = overrides.id ?? nextId("opt");
  return {
    id,
    questionId: overrides.questionId ?? "q_unset",
    label: "Option",
    points: 0,
    order: 0,
    recommendedServiceId: null,
    recommendedService: null,
    priority: null,
    businessImpact: null,
    revenueImpact: null,
    timeToFix: null,
    costRangeMin: null,
    costRangeMax: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** An option that triggers a recommendation, with a service attached. */
export function makeRecommendingOption(
  serviceName: string,
  priority: Priority,
  overrides: Partial<OptionWithService> = {}
): OptionWithService {
  const service = makeService({ name: serviceName });
  return makeOption({
    label: serviceName + " trigger",
    points: 0,
    recommendedServiceId: service.id,
    recommendedService: service,
    priority,
    costRangeMin: 10000,
    costRangeMax: 20000,
    timeToFix: "1 week",
    ...overrides,
  });
}

export function makeQuestion(
  overrides: Partial<QuestionWithOptions> & { type?: QuestionType } = {}
): QuestionWithOptions {
  const id = overrides.id ?? nextId("q");
  const options = (overrides.options ?? []).map((o) => ({ ...o, questionId: id }));
  return {
    id,
    categoryId: overrides.categoryId ?? "cat_unset",
    text: "Question?",
    purpose: null,
    type: "CHOICE",
    order: 0,
    isActive: true,
    showIfJson: null,
    scaleMin: 1,
    scaleMax: 10,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
    options,
  };
}

export function makeCategory(
  overrides: Partial<CategoryWithQuestions> = {}
): CategoryWithQuestions {
  const id = overrides.id ?? nextId("cat");
  const questions = (overrides.questions ?? []).map((q) => ({ ...q, categoryId: id }));
  return {
    id,
    name: "Category",
    slug: "category",
    description: null,
    weight: 1,
    order: 0,
    icon: null,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
    questions,
  };
}

/**
 * A category with one CHOICE question whose options are worth the given
 * point values — the common shape for scoring tests.
 */
export function makeScoredCategory(points: number[], categoryOverrides: Partial<CategoryWithQuestions> = {}) {
  const options = points.map((p, i) => makeOption({ label: `Opt ${p}`, points: p, order: i }));
  const question = makeQuestion({ options });
  return makeCategory({ questions: [question], ...categoryOverrides });
}
