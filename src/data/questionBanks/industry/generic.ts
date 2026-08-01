import type { Question } from "@/engine/types";

/**
 * Fallback industry bank.
 *
 * Covers technology, logistics, non-profit and "other" — sectors without a
 * dedicated bank yet. The questions are still sector-shaped rather than
 * generic filler: they probe the operating model, not the marketing.
 *
 * Adding a dedicated bank later is a two-line change in `index.ts`; nothing
 * else needs to know.
 */
export const GENERIC_INDUSTRY_QUESTIONS: Question[] = [
  {
    id: "ind-gen-buying-cycle",
    title: "How long does it take a typical customer to decide?",
    category: "sales",
    pool: "industry",
    industries: ["technology", "logistics", "nonprofit", "other"],
    weight: 1.15,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-gen-buying-unknown",
        label: "We have never measured it",
        score: 20,
        recommendedServices: ["crm-implementation", "analytics-tracking"],
        priority: "HIGH",
        insight:
          "Cycle length determines how much pipeline you need. Without it, hiring and spending are guesses.",
      },
      {
        id: "ind-gen-buying-long",
        label: "Months, and we mostly wait",
        score: 40,
        recommendedServices: ["lifecycle-messaging"],
        priority: "HIGH",
        insight: "Long cycles are won by whoever stays useful during the wait.",
      },
      { id: "ind-gen-buying-known", label: "We know roughly, and plan around it", score: 80 },
      { id: "ind-gen-buying-measured", label: "Measured by segment, and used in forecasting", score: 100 },
    ],
  },
  {
    id: "ind-gen-stakeholders",
    title: "How many people have to agree before you get a yes?",
    category: "sales",
    pool: "industry",
    industries: ["technology", "logistics", "nonprofit", "other"],
    weight: 1.1,
    difficulty: "advanced",
    options: [
      {
        id: "ind-gen-stakeholders-unknown",
        label: "We usually only speak to one person",
        score: 25,
        recommendedServices: ["sales-playbook"],
        priority: "HIGH",
        insight:
          "Deals stall when the person you convinced has to convince someone you never met. Give them the material to do it.",
      },
      {
        id: "ind-gen-stakeholders-several",
        label: "Several, and it is hard to reach them",
        score: 50,
        recommendedServices: ["sales-playbook", "content-engine"],
        priority: "MEDIUM",
        insight:
          "Reaching them is the job. Material they can forward internally is what does it when you cannot.",
      },
      { id: "ind-gen-stakeholders-mapped", label: "We map the decision group", score: 85 },
      { id: "ind-gen-stakeholders-multithreaded", label: "We engage each of them directly", score: 100 },
    ],
  },
  {
    id: "ind-gen-service-levels",
    title: "Do customers know what to expect from you, in writing?",
    category: "customerExperience",
    pool: "industry",
    industries: ["technology", "logistics", "nonprofit", "other"],
    weight: 1.1,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-gen-service-none",
        label: "No — expectations are set verbally",
        score: 25,
        recommendedServices: ["operations-sop"],
        priority: "MEDIUM",
        insight: "Unwritten expectations are met inconsistently and disputed later.",
      },
      { id: "ind-gen-service-informal", label: "Broadly, in the contract", score: 55 },
      { id: "ind-gen-service-sla", label: "Written service levels", score: 85 },
      { id: "ind-gen-service-measured", label: "Written, measured and reported against", score: 100 },
    ],
  },
  {
    id: "ind-gen-partners",
    title: "How much of your volume comes through partners or intermediaries?",
    category: "marketing",
    pool: "industry",
    industries: ["technology", "logistics", "nonprofit", "other"],
    weight: 1.05,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-gen-partners-none",
        label: "None — we sell direct only",
        score: 60,
      },
      {
        id: "ind-gen-partners-most",
        label: "Most of it, and we depend on them",
        score: 35,
        recommendedServices: ["dealer-portal", "demand-strategy"],
        priority: "HIGH",
        insight: "Partner dependence means someone else owns your customer relationship and your margin.",
      },
      {
        id: "ind-gen-partners-some",
        label: "Some, managed informally",
        score: 55,
        recommendedServices: ["dealer-portal"],
        priority: "MEDIUM",
        insight:
          "Informally managed partners sell when it suits them, which is rarely when you need it.",
      },
      { id: "ind-gen-partners-managed", label: "A managed partner channel with enablement", score: 100 },
    ],
  },
  {
    id: "ind-gen-scalability",
    title: "What would it take to serve twice as many customers?",
    category: "automation",
    pool: "industry",
    industries: ["technology", "logistics", "nonprofit", "other"],
    weight: 1.15,
    difficulty: "advanced",
    options: [
      {
        id: "ind-gen-scalability-people",
        label: "Twice as many people",
        score: 25,
        recommendedServices: ["workflow-automation", "operations-sop"],
        priority: "HIGH",
        insight: "Cost scaling linearly with revenue means growth never improves margin.",
      },
      {
        id: "ind-gen-scalability-some",
        label: "More people, but not proportionally",
        score: 60,
        recommendedServices: ["workflow-automation"],
        priority: "MEDIUM",
        insight:
          "Better than linear, and still a ceiling. The remaining manual steps set where it sits.",
      },
      { id: "ind-gen-scalability-systems", label: "Mostly systems, some people", score: 85 },
      { id: "ind-gen-scalability-none", label: "Very little — it scales", score: 100 },
    ],
  },
  {
    id: "ind-gen-differentiator",
    title: "Why do customers choose you over the obvious alternative?",
    category: "brand",
    pool: "industry",
    industries: ["technology", "logistics", "nonprofit", "other"],
    weight: 1.1,
    difficulty: "advanced",
    options: [
      {
        id: "ind-gen-differentiator-price",
        label: "Price",
        score: 25,
        recommendedServices: ["brand-positioning"],
        priority: "HIGH",
        insight: "Price leadership is only defensible if you are also the lowest-cost operator.",
      },
      {
        id: "ind-gen-differentiator-relationship",
        label: "Relationship and history",
        score: 55,
        recommendedServices: ["brand-positioning", "retention-programme"],
        priority: "MEDIUM",
        insight: "Strong with existing customers, invisible to new ones.",
      },
      { id: "ind-gen-differentiator-capability", label: "A capability few others have", score: 90 },
      { id: "ind-gen-differentiator-position", label: "A position in the market we are known for", score: 100 },
    ],
  },
];
