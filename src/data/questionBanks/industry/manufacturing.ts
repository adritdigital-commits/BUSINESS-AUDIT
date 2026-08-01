import type { Question } from "@/engine/types";

/**
 * Manufacturing and industrial supply.
 *
 * Buying is technical, slow and multi-party. The distinguishing problems are
 * product discoverability, quotation turnaround, dealer enablement and the
 * gap between the shop floor and the sales desk.
 */
export const MANUFACTURING_QUESTIONS: Question[] = [
  {
    id: "ind-mfg-catalogue",
    title: "How does a buyer find out exactly what you make?",
    category: "website",
    pool: "industry",
    industries: ["manufacturing"],
    weight: 1.3,
    difficulty: "basic",
    rationale: "Technical buyers self-qualify before they ever contact you.",
    options: [
      {
        id: "ind-mfg-catalogue-none",
        label: "They have to ask us",
        score: 10,
        recommendedServices: ["product-catalogue"],
        priority: "HIGH",
        insight:
          "Buyers shortlist before they enquire. If the specification is not published, you are not on the list.",
      },
      {
        id: "ind-mfg-catalogue-pdf",
        label: "We email a PDF catalogue",
        score: 40,
        recommendedServices: ["product-catalogue"],
        priority: "HIGH",
        insight: "A PDF cannot be searched, filtered or found by a search engine.",
      },
      {
        id: "ind-mfg-catalogue-listing",
        label: "A product list on the website",
        score: 65,
        recommendedServices: ["product-catalogue"],
        priority: "MEDIUM",
        insight: "A list without specifications and filters still leaves the buyer to call and ask.",
      },
      {
        id: "ind-mfg-catalogue-full",
        label: "A searchable catalogue with specifications and datasheets",
        score: 100,
      },
    ],
  },
  {
    id: "ind-mfg-rfq",
    title: "How does a request for quotation reach you and get answered?",
    category: "sales",
    pool: "industry",
    industries: ["manufacturing"],
    weight: 1.3,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-mfg-rfq-adhoc",
        label: "By phone or email, handled ad hoc",
        score: 20,
        recommendedServices: ["rfq-automation"],
        priority: "HIGH",
        insight:
          "In industrial buying the first credible quote usually wins. Ad hoc handling loses on speed alone.",
        unlocks: ["ind-mfg-rfq-time"],
      },
      {
        id: "ind-mfg-rfq-form",
        label: "A form, then a manual quote",
        score: 50,
        recommendedServices: ["rfq-automation"],
        priority: "MEDIUM",
        insight: "The form is the easy half. The quote build is where the days go.",
        unlocks: ["ind-mfg-rfq-time"],
      },
      { id: "ind-mfg-rfq-tracked", label: "A tracked RFQ queue with owners", score: 80 },
      { id: "ind-mfg-rfq-auto", label: "Structured RFQ intake with automated quote build", score: 100 },
    ],
    followUpQuestions: [
      {
        id: "ind-mfg-rfq-time",
        title: "How long does a typical quote take to go out?",
        category: "sales",
        pool: "industry",
        weight: 1,
        difficulty: "basic",
        options: [
          {
            id: "ind-mfg-rfq-time-week",
            label: "A week or more",
            score: 15,
            recommendedServices: ["rfq-automation", "proposal-system"],
            priority: "HIGH",
            insight: "By the time it lands the buyer has usually already shortlisted.",
          },
          {
            id: "ind-mfg-rfq-time-days",
            label: "Two to three days",
            score: 45,
            recommendedServices: ["rfq-automation"],
            priority: "MEDIUM",
            insight:
              "Two days is often enough for a competitor to have quoted and followed up.",
          },
          { id: "ind-mfg-rfq-time-day", label: "Within a day", score: 80 },
          { id: "ind-mfg-rfq-time-hours", label: "Within hours", score: 100 },
        ],
      },
    ],
  },
  {
    id: "ind-mfg-dealers",
    title: "How do dealers and distributors get what they need from you?",
    category: "customerExperience",
    pool: "industry",
    industries: ["manufacturing"],
    weight: 1.2,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-mfg-dealers-none",
        label: "We do not sell through dealers",
        score: 60,
      },
      {
        id: "ind-mfg-dealers-manual",
        label: "They phone or email us for everything",
        score: 25,
        recommendedServices: ["dealer-portal"],
        priority: "HIGH",
        insight:
          "Your team is the bottleneck on your own channel. A portal turns that cost into self-service.",
      },
      {
        id: "ind-mfg-dealers-email",
        label: "We send price lists and stock updates by email",
        score: 50,
        recommendedServices: ["dealer-portal"],
        priority: "MEDIUM",
        insight: "Emailed price lists go stale immediately and cause disputes.",
      },
      { id: "ind-mfg-dealers-portal", label: "A dealer portal with pricing, stock and ordering", score: 100 },
    ],
  },
  {
    id: "ind-mfg-inventory",
    title: "How accurate is your view of stock and work in progress?",
    category: "automation",
    pool: "industry",
    industries: ["manufacturing"],
    weight: 1.15,
    difficulty: "advanced",
    options: [
      {
        id: "ind-mfg-inventory-manual",
        label: "Registers and spreadsheets, reconciled periodically",
        score: 20,
        recommendedServices: ["inventory-integration"],
        priority: "HIGH",
        insight:
          "Sales commits to dates the floor cannot meet, because the two are looking at different numbers.",
      },
      {
        id: "ind-mfg-inventory-partial",
        label: "A system, but it drifts from reality",
        score: 45,
        recommendedServices: ["inventory-integration"],
        priority: "MEDIUM",
        insight: "A system nobody trusts gets shadow-tracked in spreadsheets, doubling the work.",
      },
      { id: "ind-mfg-inventory-good", label: "Accurate, updated daily", score: 80 },
      { id: "ind-mfg-inventory-live", label: "Live, and visible to sales", score: 100 },
    ],
  },
  {
    id: "ind-mfg-export",
    title: "Are you set up to be found by buyers outside your region?",
    category: "seo",
    pool: "industry",
    industries: ["manufacturing"],
    weight: 1.05,
    difficulty: "advanced",
    options: [
      {
        id: "ind-mfg-export-none",
        label: "No — all our business is local",
        score: 30,
        recommendedServices: ["seo-foundation", "product-catalogue"],
        priority: "MEDIUM",
        insight:
          "Published specifications are how distant buyers discover a manufacturer they have never heard of.",
      },
      {
        id: "ind-mfg-export-listed",
        label: "We are on a marketplace or two",
        score: 55,
        recommendedServices: ["seo-foundation"],
        priority: "MEDIUM",
        insight: "Marketplaces own the customer relationship. Direct discovery is worth more per enquiry.",
      },
      { id: "ind-mfg-export-site", label: "Our site targets buyers in other regions", score: 85 },
      { id: "ind-mfg-export-full", label: "Localised content and export enquiries handled properly", score: 100 },
    ],
  },
  {
    id: "ind-mfg-aftersales",
    title: "What happens after delivery?",
    description: "Spares, servicing, warranty, repeat orders.",
    category: "customerExperience",
    pool: "industry",
    industries: ["manufacturing"],
    weight: 1.1,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-mfg-aftersales-reactive",
        label: "We respond when they contact us",
        score: 30,
        recommendedServices: ["retention-programme"],
        priority: "MEDIUM",
        insight: "Spares and servicing are usually the highest-margin line, and they are being left passive.",
      },
      {
        id: "ind-mfg-aftersales-records",
        label: "We keep records and follow up sometimes",
        score: 60,
        recommendedServices: ["lifecycle-messaging"],
        priority: "MEDIUM",
        insight: "The records exist; nothing is prompting anyone to act on them.",
      },
      { id: "ind-mfg-aftersales-scheduled", label: "Scheduled service reminders go out", score: 85 },
      { id: "ind-mfg-aftersales-programme", label: "A managed aftermarket programme", score: 100 },
    ],
  },
];
