import type { Question } from "@/engine/types";

/**
 * Professional and service businesses: consultancies, legal, accounting,
 * trades, and anyone whose product is expertise delivered by people.
 */
export const SERVICE_QUESTIONS: Question[] = [
  {
    id: "ind-svc-capacity",
    title: "How do you decide whether you can take on new work?",
    category: "customerExperience",
    pool: "industry",
    industries: ["professional-services"],
    weight: 1.2,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-svc-capacity-feel",
        label: "It is a feeling",
        score: 20,
        recommendedServices: ["operations-sop", "executive-dashboard"],
        priority: "HIGH",
        insight:
          "Without a capacity model you either turn away revenue you could have taken, or take work you cannot deliver.",
      },
      {
        id: "ind-svc-capacity-calendar",
        label: "We look at the calendar",
        score: 50,
        recommendedServices: ["executive-dashboard"],
        priority: "MEDIUM",
        insight:
          "A calendar shows commitments, not capacity. The two diverge exactly when you are busiest.",
      },
      { id: "ind-svc-capacity-plan", label: "A resourcing plan we maintain", score: 85 },
      { id: "ind-svc-capacity-model", label: "A capacity model tied to the pipeline", score: 100 },
    ],
  },
  {
    id: "ind-svc-expertise-visible",
    title: "How would a stranger know you are good at what you do?",
    category: "brand",
    pool: "industry",
    industries: ["professional-services"],
    weight: 1.25,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-svc-expertise-none",
        label: "They would have to meet us",
        score: 20,
        recommendedServices: ["content-engine", "website-build"],
        priority: "HIGH",
        insight:
          "In a trust-led business, published expertise is what gets you into the room. Referrals alone cap growth.",
      },
      {
        id: "ind-svc-expertise-credentials",
        label: "Our qualifications are listed",
        score: 45,
        recommendedServices: ["content-engine"],
        priority: "MEDIUM",
        insight: "Credentials prove you are allowed to do it. Content proves you are the one to choose.",
      },
      { id: "ind-svc-expertise-content", label: "We publish articles or talks regularly", score: 85 },
      { id: "ind-svc-expertise-authority", label: "We are cited as a source in our field", score: 100 },
    ],
  },
  {
    id: "ind-svc-billing",
    title: "How does time get captured and billed?",
    category: "automation",
    pool: "industry",
    industries: ["professional-services"],
    weight: 1.15,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-svc-billing-memory",
        label: "Reconstructed at the end of the month",
        score: 20,
        recommendedServices: ["workflow-automation"],
        priority: "HIGH",
        insight: "Reconstructed time is always under-recorded. This is revenue you have already earned.",
      },
      {
        id: "ind-svc-billing-sheet",
        label: "Timesheets in a spreadsheet",
        score: 50,
        recommendedServices: ["workflow-automation"],
        priority: "MEDIUM",
        insight:
          "Spreadsheet timesheets are filled in late, and late entries are always under-recorded.",
      },
      { id: "ind-svc-billing-system", label: "A time system linked to invoicing", score: 85 },
      { id: "ind-svc-billing-auto", label: "Captured as work happens, invoiced automatically", score: 100 },
    ],
  },
  {
    id: "ind-svc-referral-dependency",
    title: "What share of new clients comes from referrals?",
    category: "marketing",
    pool: "industry",
    industries: ["professional-services"],
    weight: 1.2,
    difficulty: "basic",
    options: [
      {
        id: "ind-svc-referral-all",
        label: "Essentially all of them",
        score: 30,
        recommendedServices: ["demand-strategy", "content-engine"],
        priority: "HIGH",
        insight:
          "Referrals are excellent and uncontrollable. A second channel is what lets you choose to grow.",
      },
      {
        id: "ind-svc-referral-most",
        label: "Most of them",
        score: 50,
        recommendedServices: ["content-engine"],
        priority: "MEDIUM",
        insight:
          "Healthy, and still a concentration risk. One quiet quarter from your referrers is one quiet quarter for you.",
      },
      { id: "ind-svc-referral-half", label: "About half", score: 80 },
      { id: "ind-svc-referral-balanced", label: "A minority — other channels work too", score: 100 },
    ],
  },
  {
    id: "ind-svc-scoping",
    title: "How is a new engagement scoped and agreed?",
    category: "sales",
    pool: "industry",
    industries: ["professional-services"],
    weight: 1.15,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-svc-scoping-verbal",
        label: "A conversation and an emailed price",
        score: 25,
        recommendedServices: ["proposal-system"],
        priority: "HIGH",
        insight: "Undocumented scope becomes unpaid work, and later becomes a difficult conversation.",
      },
      {
        id: "ind-svc-scoping-quote",
        label: "A written quote",
        score: 55,
        recommendedServices: ["proposal-system"],
        priority: "MEDIUM",
        insight:
          "A price without deliverables and exclusions is an invitation to a scope conversation later.",
      },
      { id: "ind-svc-scoping-proposal", label: "A proposal with deliverables and exclusions", score: 85 },
      { id: "ind-svc-scoping-signed", label: "Templated proposal, e-signed, with change control", score: 100 },
    ],
  },
  {
    id: "ind-svc-knowledge",
    title: "If your most experienced person left, what would go with them?",
    category: "crm",
    pool: "industry",
    industries: ["professional-services"],
    weight: 1.2,
    difficulty: "advanced",
    options: [
      {
        id: "ind-svc-knowledge-everything",
        label: "Most of the know-how and the relationships",
        score: 10,
        recommendedServices: ["operations-sop", "crm-implementation"],
        priority: "HIGH",
        insight:
          "Key-person dependency is the risk that most reduces what a professional services business is worth.",
      },
      {
        id: "ind-svc-knowledge-some",
        label: "A significant amount",
        score: 40,
        recommendedServices: ["operations-sop"],
        priority: "HIGH",
        insight: "Enough to make an exit, a sale or a long absence genuinely disruptive.",
      },
      { id: "ind-svc-knowledge-documented", label: "Method is documented; relationships are shared", score: 85 },
      { id: "ind-svc-knowledge-institutional", label: "Very little — it is all institutional", score: 100 },
    ],
  },
];
