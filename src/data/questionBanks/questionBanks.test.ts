import { describe, expect, it } from "vitest";
import {
  ALL_DOMAIN_QUESTIONS,
  ALL_INDUSTRY_QUESTIONS,
  ALL_QUESTIONS_FLAT,
  DOMAIN_BANKS,
  INDUSTRY_BANKS,
  QUESTION_BANK_SIZE,
  getQuestion,
  industryQuestionsFor,
} from "@/data/questionBanks";
import { SERVICES, getService } from "@/data/services";
import { DOMAIN_IDS } from "@/engine/types";
import { INDUSTRIES } from "@/engine/businessProfile";
import { ALL_INDUSTRY_RULES } from "@/engine/industryRules";

/**
 * Bank integrity. The engine trusts this data completely — a dangling service
 * id or a duplicated question id would surface as a silently missing
 * recommendation rather than as an error, so it is checked here instead.
 */
/** Questions that compete for a quota slot; excludes nested follow-ups. */
const TOP_LEVEL = [...ALL_DOMAIN_QUESTIONS, ...ALL_INDUSTRY_QUESTIONS];

describe("question banks", () => {
  it("registers a bank for every domain topic", () => {
    expect(DOMAIN_BANKS.length).toBe(10);
    expect(ALL_DOMAIN_QUESTIONS.length).toBeGreaterThan(40);
  });

  it("offers enough questions to build a full assessment several times over", () => {
    expect(QUESTION_BANK_SIZE).toBeGreaterThan(80);
  });

  it("uses unique question ids across every bank, follow-ups included", () => {
    const ids = ALL_QUESTIONS_FLAT.map((question) => question.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
  });

  it("uses unique option ids across every question", () => {
    const ids = ALL_QUESTIONS_FLAT.flatMap((q) => q.options.map((option) => option.id));
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
  });

  it("gives every question a known domain, at least two options, and a weight", () => {
    for (const question of ALL_QUESTIONS_FLAT) {
      expect(DOMAIN_IDS, question.id).toContain(question.category);
      expect(question.options.length, question.id).toBeGreaterThanOrEqual(2);
      expect(question.weight, question.id).toBeGreaterThan(0);
      expect(question.title.length, question.id).toBeGreaterThan(10);
    }
  });

  it("keeps every option score inside the 0–100 scale", () => {
    for (const question of ALL_QUESTIONS_FLAT) {
      for (const option of question.options) {
        expect(option.score, `${question.id}/${option.id}`).toBeGreaterThanOrEqual(0);
        expect(option.score, `${question.id}/${option.id}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it("only references services that exist in the catalogue", () => {
    for (const question of ALL_QUESTIONS_FLAT) {
      for (const option of question.options) {
        for (const serviceId of option.recommendedServices ?? []) {
          expect(getService(serviceId), `${question.id}/${option.id}`).toBeDefined();
        }
      }
    }
  });

  it("pairs every triggering answer with a priority and an insight", () => {
    for (const question of ALL_QUESTIONS_FLAT) {
      for (const option of question.options) {
        if (!option.recommendedServices?.length) continue;
        expect(option.priority, `${question.id}/${option.id}`).toBeDefined();
        expect((option.insight ?? "").length, `${question.id}/${option.id}`).toBeGreaterThan(10);
      }
    }
  });

  it("only unlocks follow-ups that exist on the same question", () => {
    for (const question of ALL_QUESTIONS_FLAT) {
      for (const option of question.options) {
        for (const id of option.unlocks ?? []) {
          const followUp = question.followUpQuestions?.find((candidate) => candidate.id === id);
          expect(followUp, `${question.id} unlocks ${id}`).toBeDefined();
        }
      }
    }
  });

  it("never declares a follow-up that nothing can unlock", () => {
    for (const question of ALL_QUESTIONS_FLAT) {
      for (const followUp of question.followUpQuestions ?? []) {
        const reachable = question.options.some((option) =>
          (option.unlocks ?? []).includes(followUp.id)
        );
        expect(reachable, `${question.id} -> ${followUp.id}`).toBe(true);
      }
    }
  });

  // Follow-ups carry their parent's pool for bookkeeping but never compete in
  // a quota — they are reachable only through the answer that unlocks them —
  // so the pool tags are only required on selectable, top-level questions.
  it("tags every selectable industry question with the industries it belongs to", () => {
    for (const question of TOP_LEVEL) {
      if (question.pool !== "industry") continue;
      expect(question.industries?.length, question.id).toBeGreaterThan(0);
    }
  });

  it("tags every selectable goal question with the goals it serves", () => {
    for (const question of TOP_LEVEL) {
      if (question.pool !== "goal") continue;
      expect(question.goals?.length, question.id).toBeGreaterThan(0);
    }
  });

  it("supplies at least six questions for every industry, dedicated or fallback", () => {
    for (const industry of INDUSTRIES) {
      const questions = industryQuestionsFor(industry.id);
      expect(questions.length, industry.id).toBeGreaterThanOrEqual(6);
    }
  });

  it("registers a rule for every industry offered in the form", () => {
    const ruleIds = new Set(ALL_INDUSTRY_RULES.map((rule) => rule.id));
    for (const industry of INDUSTRIES) {
      expect(ruleIds, industry.id).toContain(industry.id);
    }
  });

  it("keeps dedicated industry banks scoped to their own industry", () => {
    for (const [industryId, questions] of Object.entries(INDUSTRY_BANKS)) {
      for (const question of questions ?? []) {
        expect(question.industries, question.id).toContain(industryId);
      }
    }
  });

  it("resolves a question by id", () => {
    expect(getQuestion("core-first-response")?.category).toBe("sales");
    expect(getQuestion("does-not-exist")).toBeUndefined();
  });
});

describe("service catalogue", () => {
  it("uses unique ids", () => {
    const ids = SERVICES.map((service) => service.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every service the commercial detail the proposal needs", () => {
    for (const service of SERVICES) {
      expect(service.deliverables.length, service.id).toBeGreaterThan(0);
      expect(service.benefits.length, service.id).toBeGreaterThan(0);
      expect(service.effortDays, service.id).toBeGreaterThan(0);
      expect(service.timeline.length, service.id).toBeGreaterThan(0);
      expect(service.costMax, service.id).toBeGreaterThanOrEqual(service.costMin);
      expect(service.roi.length, service.id).toBeGreaterThan(10);
      expect(DOMAIN_IDS, service.id).toContain(service.domain);
    }
  });

  it("only lets an industry rule prioritise services that exist", () => {
    for (const rule of ALL_INDUSTRY_RULES) {
      for (const serviceId of rule.priorityServices) {
        expect(getService(serviceId), `${rule.id}/${serviceId}`).toBeDefined();
      }
    }
  });

  it("gives every industry rule a narrative and injected topics", () => {
    for (const rule of ALL_INDUSTRY_RULES) {
      expect(rule.narrative.length, rule.id).toBeGreaterThan(40);
      expect(rule.injectedTopics.length, rule.id).toBeGreaterThanOrEqual(4);
    }
  });
});
