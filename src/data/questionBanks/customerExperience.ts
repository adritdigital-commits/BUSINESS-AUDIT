import type { Question } from "@/engine/types";

/** What happens after the sale — the part that decides whether growth compounds. */
export const CUSTOMER_EXPERIENCE_QUESTIONS: Question[] = [
  {
    id: "cx-onboarding",
    title: "What does a new customer's first week look like?",
    category: "customerExperience",
    pool: "goal",
    goals: ["customer-retention", "team-productivity"],
    weight: 1.1,
    difficulty: "intermediate",
    options: [
      {
        id: "cx-onboarding-none",
        label: "Whatever the person handling it decides",
        score: 20,
        recommendedServices: ["operations-sop"],
        priority: "HIGH",
        insight: "First impressions after the sale set the tone for renewal and referral.",
      },
      {
        id: "cx-onboarding-informal",
        label: "A welcome call or email",
        score: 50,
        recommendedServices: ["lifecycle-messaging"],
        priority: "MEDIUM",
        insight:
          "A good start, delivered inconsistently. Sequencing it is what makes the impression repeatable.",
      },
      { id: "cx-onboarding-checklist", label: "A defined onboarding sequence", score: 80 },
      { id: "cx-onboarding-automated", label: "Automated, measured and improved", score: 100 },
    ],
  },
  {
    id: "cx-feedback",
    title: "How do you find out when a customer is unhappy?",
    category: "customerExperience",
    pool: "core",
    weight: 1.1,
    difficulty: "basic",
    options: [
      {
        id: "cx-feedback-leave",
        label: "They stop buying, and we work it out later",
        score: 10,
        recommendedServices: ["retention-programme", "review-engine"],
        priority: "HIGH",
        insight: "Silent churn is the most expensive kind — you lose the revenue and the reason.",
      },
      {
        id: "cx-feedback-complaint",
        label: "They complain, if they are the type to",
        score: 40,
        recommendedServices: ["review-engine"],
        priority: "MEDIUM",
        insight: "Most unhappy customers never complain. They just do not come back.",
      },
      { id: "cx-feedback-ask", label: "We ask after each job", score: 80 },
      { id: "cx-feedback-measured", label: "We measure satisfaction and act on the trend", score: 100 },
    ],
  },
  {
    id: "cx-repeat-rate",
    title: "What share of revenue comes from existing customers?",
    category: "customerExperience",
    pool: "goal",
    goals: ["customer-retention", "analytics", "sales"],
    weight: 1.05,
    difficulty: "advanced",
    options: [
      {
        id: "cx-repeat-unknown",
        label: "We do not measure it",
        score: 20,
        recommendedServices: ["executive-dashboard", "retention-programme"],
        priority: "HIGH",
        insight: "Repeat revenue is the cheapest growth available and the least often tracked.",
      },
      {
        id: "cx-repeat-low",
        label: "Very little — nearly everything is new business",
        score: 35,
        recommendedServices: ["retention-programme"],
        priority: "HIGH",
        insight:
          "A leaking bucket. Every point of retention gained is worth several points of new acquisition.",
      },
      { id: "cx-repeat-some", label: "A meaningful share", score: 75 },
      { id: "cx-repeat-most", label: "Most of it, and it is growing", score: 100 },
    ],
  },
  {
    id: "cx-response-channel",
    title: "How do existing customers reach you when they need something?",
    category: "customerExperience",
    pool: "core",
    weight: 1,
    difficulty: "basic",
    options: [
      {
        id: "cx-response-personal",
        label: "They message whoever they know personally",
        score: 30,
        recommendedServices: ["support-automation"],
        priority: "MEDIUM",
        insight:
          "Service quality depends on one person's availability, and nothing is visible to anyone else.",
      },
      {
        id: "cx-response-shared",
        label: "A shared inbox or phone line",
        score: 60,
        recommendedServices: ["support-automation"],
        priority: "LOW",
        insight:
          "Visible to the team, but with no owner or deadline attached to any single request.",
      },
      { id: "cx-response-tracked", label: "A ticketing system with owners", score: 85 },
      { id: "cx-response-sla", label: "Ticketing with SLAs and escalation", score: 100 },
    ],
  },
  {
    id: "cx-referral",
    title: "Do happy customers get asked to refer?",
    category: "customerExperience",
    pool: "goal",
    goals: ["customer-retention", "more-leads", "sales"],
    weight: 1,
    difficulty: "basic",
    options: [
      {
        id: "cx-referral-never",
        label: "Never — it feels awkward",
        score: 25,
        recommendedServices: ["retention-programme"],
        priority: "MEDIUM",
        insight: "Referrals are your best-converting channel and the one you invest least in.",
      },
      {
        id: "cx-referral-sometimes",
        label: "Sometimes, informally",
        score: 55,
        recommendedServices: ["retention-programme"],
        priority: "LOW",
        insight:
          "Referrals asked for by habit arrive at a fraction of the rate they do when the ask is built into the process.",
      },
      { id: "cx-referral-process", label: "There is a moment in the process where we ask", score: 85 },
      { id: "cx-referral-programme", label: "A referral programme with tracking", score: 100 },
    ],
  },
];
