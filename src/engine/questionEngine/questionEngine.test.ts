import { describe, expect, it } from "vitest";
import { deriveSignals } from "@/engine/businessProfile";
import {
  CLINIC,
  MANUFACTURER_NO_SITE,
  NEW_RESTAURANT,
  answerWorst,
  profile,
} from "@/engine/fixtures";
import {
  MAX_BASE_QUESTIONS,
  POOL_QUOTAS,
  eligibleCandidates,
  evaluate,
  isEligible,
  planAssessment,
} from "@/engine/questionEngine";
import type { AnswersMap, Condition } from "@/engine/types";

const ids = (target: Parameters<typeof planAssessment>[0], answers: AnswersMap = {}) =>
  planAssessment(target, answers).questions.map((item) => item.question.id);

describe("condition evaluation", () => {
  const context = {
    profile: CLINIC,
    signals: deriveSignals(CLINIC),
    answers: {} as AnswersMap,
  };

  it("matches on industry, type, age, size and revenue", () => {
    expect(evaluate({ kind: "industry", in: ["healthcare"] }, context)).toBe(true);
    expect(evaluate({ kind: "industry", in: ["retail"] }, context)).toBe(false);
    expect(evaluate({ kind: "businessType", in: ["healthcare"] }, context)).toBe(true);
    expect(evaluate({ kind: "businessAge", in: ["5-10-years"] }, context)).toBe(true);
    expect(evaluate({ kind: "teamSize", in: ["2-10"] }, context)).toBe(true);
    expect(evaluate({ kind: "revenue", in: ["25l-1cr"] }, context)).toBe(true);
  });

  it("matches on stated priorities and acquisition channels", () => {
    expect(evaluate({ kind: "priority", anyOf: ["customer-retention"] }, context)).toBe(true);
    expect(evaluate({ kind: "priority", anyOf: ["reporting"] }, context)).toBe(false);
    expect(evaluate({ kind: "channel", anyOf: ["whatsapp"] }, context)).toBe(true);
    expect(evaluate({ kind: "channel", anyOf: ["linkedin"] }, context)).toBe(false);
  });

  it("matches on derived signals", () => {
    expect(evaluate({ kind: "signal", is: "hasWebsite", equals: true }, context)).toBe(true);
    expect(evaluate({ kind: "signal", is: "hasWebsite", equals: false }, context)).toBe(false);
    expect(evaluate({ kind: "signal", is: "isEstablished", equals: true }, context)).toBe(true);
  });

  it("matches on a previous answer", () => {
    const withAnswer = { ...context, answers: { "crm-in-use": { optionId: "crm-in-use-no" } } };
    const condition: Condition = {
      kind: "answered",
      questionId: "crm-in-use",
      optionIn: ["crm-in-use-no"],
    };
    expect(evaluate(condition, withAnswer)).toBe(true);
    expect(evaluate(condition, context)).toBe(false);
  });

  it("treats a skipped answer as unanswered", () => {
    const skipped = { ...context, answers: { "crm-in-use": { skipped: true } } };
    expect(
      evaluate({ kind: "answered", questionId: "crm-in-use", optionIn: ["crm-in-use-no"] }, skipped)
    ).toBe(false);
  });

  it("negates", () => {
    expect(
      evaluate({ kind: "not", condition: { kind: "industry", in: ["retail"] } }, context)
    ).toBe(true);
  });

  it("passes a question with no conditions", () => {
    expect(isEligible({ id: "x", triggerConditions: undefined } as never, context)).toBe(true);
  });
});

describe("planAssessment", () => {
  it("never exceeds the base ceiling", () => {
    for (const target of [CLINIC, MANUFACTURER_NO_SITE, NEW_RESTAURANT]) {
      const plan = planAssessment(target);
      expect(plan.baseCount, target.businessName).toBeLessThanOrEqual(MAX_BASE_QUESTIONS);
      expect(plan.baseCount, target.businessName).toBeGreaterThan(20);
    }
  });

  it("respects the documented quota split", () => {
    expect(POOL_QUOTAS).toEqual({ core: 10, industry: 10, goal: 10, size: 5 });
    expect(
      POOL_QUOTAS.core + POOL_QUOTAS.industry + POOL_QUOTAS.goal + POOL_QUOTAS.size
    ).toBe(MAX_BASE_QUESTIONS);
  });

  it("never repeats a question", () => {
    const list = ids(CLINIC);
    expect(new Set(list).size).toBe(list.length);
  });

  it("is deterministic for the same inputs", () => {
    expect(ids(CLINIC)).toEqual(ids(CLINIC));
  });

  it("asks different businesses materially different questions", () => {
    const clinic = new Set(ids(CLINIC));
    const manufacturer = new Set(ids(MANUFACTURER_NO_SITE));
    const shared = Array.from(clinic).filter((id) => manufacturer.has(id));

    expect(clinic.size).toBeGreaterThan(0);
    // Some overlap is expected — the core questions apply to everyone — but
    // the majority of each set should be specific to that business.
    expect(shared.length).toBeLessThan(clinic.size * 0.7);
  });

  it("screens every domain it has something eligible to ask about", () => {
    // Relevance ranking on its own will spend all 35 slots on the loudest six
    // domains and leave the report with empty axes. Breadth first, depth after.
    for (const target of [CLINIC, MANUFACTURER_NO_SITE, NEW_RESTAURANT]) {
      const context = {
        profile: target,
        signals: deriveSignals(target),
        answers: {} as AnswersMap,
      };
      const available = new Set(
        Object.values(eligibleCandidates(context))
          .flat()
          .map((question) => question.category)
      );
      const asked = new Set(
        planAssessment(target).questions.map((item) => item.question.category)
      );

      for (const domain of Array.from(available)) {
        expect(asked, `${target.businessName} / ${domain}`).toContain(domain);
      }
    }
  });

  it("leaves a domain unscored only when nothing about it applies", () => {
    // The no-website business is the case that matters: analytics questions
    // that assume a site are gated out, and we do not invent a score for them.
    const context = {
      profile: MANUFACTURER_NO_SITE,
      signals: deriveSignals(MANUFACTURER_NO_SITE),
      answers: {} as AnswersMap,
    };
    const eligible = Object.values(eligibleCandidates(context)).flat();
    expect(eligible.some((question) => question.id === "ana-web-tracking")).toBe(false);
    expect(ids(MANUFACTURER_NO_SITE)).not.toContain("ana-web-tracking");
  });

  it("injects the industry's own questions", () => {
    expect(ids(CLINIC).some((id) => id.startsWith("ind-health-"))).toBe(true);
    expect(ids(MANUFACTURER_NO_SITE).some((id) => id.startsWith("ind-mfg-"))).toBe(true);
    expect(ids(NEW_RESTAURANT).some((id) => id.startsWith("ind-rest-"))).toBe(true);
  });

  it("never asks one industry's questions of another", () => {
    expect(ids(CLINIC).some((id) => id.startsWith("ind-mfg-"))).toBe(false);
    expect(ids(NEW_RESTAURANT).some((id) => id.startsWith("ind-health-"))).toBe(false);
  });

  it("skips website-dependent questions when there is no website", () => {
    const list = ids(MANUFACTURER_NO_SITE);

    // Nothing that assumes pages exist.
    expect(list).not.toContain("web-dependency");
    expect(list).not.toContain("web-mobile");
    expect(list).not.toContain("web-publish-speed");
    expect(list).not.toContain("seo-visibility");
    expect(list).not.toContain("seo-content");
    expect(list).not.toContain("ana-web-tracking");

    // And asks how customers reach them instead.
    expect(list).toContain("web-absent-contact");
    expect(list).toContain("web-absent-why");
  });

  it("asks the website questions when a website exists", () => {
    const list = ids(CLINIC);
    expect(list).toContain("web-dependency");
    expect(list).not.toContain("web-absent-contact");
  });

  it("still asks about Google Business Profile and reviews without a website", () => {
    const list = ids(MANUFACTURER_NO_SITE);
    expect(list).toContain("seo-gbp");
  });

  it("selects goal questions that serve a stated priority", () => {
    const retention = planAssessment(
      profile({ priorities: ["customer-retention", "crm", "automation"], primaryGoal: "customer-retention" })
    );
    const seo = planAssessment(
      profile({ priorities: ["seo", "google-ranking", "more-leads"], primaryGoal: "seo" })
    );

    const retentionGoals = retention.questions
      .filter((item) => item.question.pool === "goal")
      .flatMap((item) => item.question.goals ?? []);
    const seoGoals = seo.questions
      .filter((item) => item.question.pool === "goal")
      .flatMap((item) => item.question.goals ?? []);

    expect(retentionGoals).toContain("customer-retention");
    expect(seoGoals).toContain("seo");
  });

  it("groups the flow into domain sections", () => {
    const plan = planAssessment(CLINIC);
    expect(plan.sections.length).toBeGreaterThan(3);

    // Once a section is left it is not returned to.
    const order = plan.questions.map((item) => item.sectionName);
    const firstIndex = new Map<string, number>();
    order.forEach((name, index) => {
      if (!firstIndex.has(name)) firstIndex.set(name, index);
    });
    for (const [name, start] of Array.from(firstIndex)) {
      const last = order.lastIndexOf(name);
      const slice = order.slice(start, last + 1);
      expect(slice.every((entry) => entry === name), name).toBe(true);
    }
  });

  it("explains why an adaptive question is being asked", () => {
    const plan = planAssessment(CLINIC);
    const industryItem = plan.questions.find((item) => item.question.pool === "industry");
    expect(industryItem?.reason).toBeTruthy();
  });

  it("carries the industry's injected topics and narrative", () => {
    const plan = planAssessment(CLINIC);
    expect(plan.injectedTopics.join(" ")).toContain("appointment");
    expect(plan.industryNarrative.length).toBeGreaterThan(40);
  });
});

describe("adaptive follow-ups", () => {
  it("adds no follow-ups before anything is answered", () => {
    expect(planAssessment(CLINIC).followUpCount).toBe(0);
  });

  it("unlocks a follow-up only for the answer that declares it", () => {
    const target = profile({ priorities: ["crm", "sales", "automation"], primaryGoal: "crm" });

    const withNoCrm = planAssessment(target, { "crm-in-use": { optionId: "crm-in-use-no" } });
    const withFullCrm = planAssessment(target, { "crm-in-use": { optionId: "crm-in-use-full" } });

    expect(withNoCrm.questions.map((i) => i.question.id)).toContain("crm-in-use-instead");
    expect(withFullCrm.questions.map((i) => i.question.id)).not.toContain("crm-in-use-instead");
  });

  it("places a follow-up directly after its parent", () => {
    const target = profile({ priorities: ["crm", "sales", "automation"], primaryGoal: "crm" });
    const list = ids(target, { "crm-in-use": { optionId: "crm-in-use-no" } });
    expect(list.indexOf("crm-in-use-instead")).toBe(list.indexOf("crm-in-use") + 1);
  });

  it("marks a follow-up as such, with its own reason", () => {
    const target = profile({ priorities: ["crm", "sales", "automation"], primaryGoal: "crm" });
    const plan = planAssessment(target, { "crm-in-use": { optionId: "crm-in-use-no" } });
    const followUp = plan.questions.find((item) => item.question.id === "crm-in-use-instead");
    expect(followUp?.isFollowUp).toBe(true);
    expect(followUp?.parentId).toBe("crm-in-use");
    expect(followUp?.reason).toMatch(/previous answer/i);
  });

  it("removes the follow-up again if the parent answer changes", () => {
    const target = profile({ priorities: ["crm", "sales", "automation"], primaryGoal: "crm" });
    const unlocked = ids(target, { "crm-in-use": { optionId: "crm-in-use-no" } });
    const relocked = ids(target, { "crm-in-use": { optionId: "crm-in-use-full" } });
    expect(unlocked).toContain("crm-in-use-instead");
    expect(relocked).not.toContain("crm-in-use-instead");
  });

  it("counts unlocked follow-ups separately from the base set", () => {
    const answers = answerWorst(CLINIC);
    const plan = planAssessment(CLINIC, answers);
    expect(plan.followUpCount).toBeGreaterThan(0);
    expect(plan.questions.length).toBe(plan.baseCount + plan.followUpCount);
  });

  it("never drops a question that has already been answered", () => {
    // Answer the whole flow, then confirm every answered id survives replanning.
    const answers = answerWorst(CLINIC);
    const plan = planAssessment(CLINIC, answers);
    const planned = new Set(plan.questions.map((item) => item.question.id));
    for (const questionId of Object.keys(answers)) {
      expect(planned, questionId).toContain(questionId);
    }
  });
});
