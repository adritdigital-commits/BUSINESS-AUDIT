import type { Condition, Question } from "@/engine/types";

const HAS_WEBSITE: Condition = { kind: "signal", is: "hasWebsite", equals: true };

/**
 * Measurement and reporting.
 *
 * Web analytics questions are gated on a website existing; the questions about
 * knowing your numbers are not, because a business with no site still has
 * revenue, cost and channel data it either uses or does not.
 */
export const ANALYTICS_QUESTIONS: Question[] = [
  {
    id: "ana-web-tracking",
    title: "Is website analytics installed, and do you trust what it says?",
    category: "analytics",
    pool: "goal",
    goals: ["analytics", "reporting", "seo"],
    weight: 1.15,
    difficulty: "intermediate",
    triggerConditions: [HAS_WEBSITE],
    options: [
      {
        id: "ana-web-none",
        label: "Not installed",
        score: 0,
        recommendedServices: ["analytics-tracking"],
        priority: "HIGH",
        insight: "You are flying blind on every decision that involves spend.",
      },
      {
        id: "ana-web-ignored",
        label: "Installed, but nobody looks at it",
        score: 25,
        recommendedServices: ["analytics-tracking"],
        priority: "HIGH",
        insight: "Data nobody reads is the same as no data, at the same cost.",
      },
      {
        id: "ana-web-doubt",
        label: "Looked at occasionally, with doubts about the numbers",
        score: 55,
        recommendedServices: ["analytics-tracking"],
        priority: "MEDIUM",
        insight: "Numbers people distrust get overruled by opinion in every meeting.",
      },
      { id: "ana-web-trusted", label: "Trusted, and reviewed weekly", score: 100 },
    ],
  },
  {
    id: "ana-attribution",
    title: "Can you trace revenue back to the channel that produced it?",
    category: "analytics",
    pool: "goal",
    goals: ["analytics", "reporting", "more-leads", "marketing"],
    weight: 1.15,
    difficulty: "advanced",
    options: [
      {
        id: "ana-attribution-none",
        label: "No",
        score: 0,
        recommendedServices: ["analytics-tracking"],
        priority: "HIGH",
        insight: "Budget gets cut from what works and added to what is merely visible.",
      },
      {
        id: "ana-attribution-partial",
        label: "Partially, for some channels",
        score: 40,
        recommendedServices: ["executive-dashboard"],
        priority: "MEDIUM",
        insight: "Partial attribution systematically over-credits the last click.",
      },
      { id: "ana-attribution-most", label: "For most channels", score: 75 },
      { id: "ana-attribution-full", label: "End to end, from first touch to invoice", score: 100 },
    ],
  },
  {
    id: "ana-reporting-cadence",
    title: "How does performance get reported?",
    category: "analytics",
    pool: "goal",
    goals: ["reporting", "analytics", "team-productivity"],
    weight: 1.1,
    difficulty: "basic",
    options: [
      {
        id: "ana-reporting-none",
        label: "It does not",
        score: 0,
        recommendedServices: ["executive-dashboard"],
        priority: "HIGH",
        insight: "Problems surface as revenue misses rather than as early warnings.",
      },
      {
        id: "ana-reporting-adhoc",
        label: "Manually, when someone asks",
        score: 25,
        recommendedServices: ["executive-dashboard"],
        priority: "MEDIUM",
        insight: "Reporting on demand means the answer is always weeks out of date.",
      },
      {
        id: "ana-reporting-deck",
        label: "A monthly deck someone builds by hand",
        score: 55,
        recommendedServices: ["executive-dashboard"],
        priority: "MEDIUM",
        insight: "Days a month spent assembling numbers instead of acting on them.",
      },
      { id: "ana-reporting-live", label: "Live dashboards, reviewed on a fixed cadence", score: 100 },
    ],
  },
  {
    id: "ana-kpis",
    title: "Could everyone on the team name the three numbers that matter most?",
    category: "analytics",
    pool: "size",
    weight: 0.95,
    difficulty: "advanced",
    options: [
      {
        id: "ana-kpis-none",
        label: "No — including, if we are honest, us",
        score: 15,
        recommendedServices: ["executive-dashboard"],
        priority: "HIGH",
        insight: "Without shared numbers, every team optimises for something different.",
      },
      { id: "ana-kpis-leaders", label: "Leadership could, the team could not", score: 45 },
      { id: "ana-kpis-most", label: "Most of the team could", score: 80 },
      { id: "ana-kpis-all", label: "Yes, and they are visible to everyone", score: 100 },
    ],
  },
  {
    id: "ana-cost-per-customer",
    title: "Do you know what it costs to win one customer?",
    category: "analytics",
    pool: "goal",
    goals: ["analytics", "reporting", "more-leads", "sales"],
    weight: 1.05,
    difficulty: "advanced",
    options: [
      {
        id: "ana-cost-none",
        label: "No",
        score: 10,
        recommendedServices: ["analytics-tracking"],
        priority: "HIGH",
        insight:
          "Without acquisition cost you cannot tell profitable growth from expensive growth until it is too late.",
      },
      {
        id: "ana-cost-rough",
        label: "A rough sense of it",
        score: 45,
        recommendedServices: ["executive-dashboard"],
        priority: "MEDIUM",
        insight:
          "A rough figure cannot be compared between channels, which is the whole point of tracking it.",
      },
      { id: "ana-cost-channel", label: "Yes, overall", score: 75 },
      { id: "ana-cost-full", label: "Yes, by channel, against lifetime value", score: 100 },
    ],
  },
];
