import type { IndustryRule } from "@/engine/industryRules/types";

/**
 * The industry rule set.
 *
 * Each entry is self-contained data. To add a vertical: append a rule here,
 * add its question bank to `src/data/questionBanks/industry/`, and register
 * the bank in `src/data/questionBanks/index.ts`. Nothing else changes.
 */

export const HEALTHCARE_RULE: IndustryRule = {
  id: "healthcare",
  label: "Healthcare & wellness",
  domainEmphasis: {
    customerExperience: 1.35,
    crm: 1.25,
    seo: 1.2,
    automation: 1.15,
    website: 1.1,
    marketing: 0.9,
    brand: 0.85,
  },
  priorityServices: [
    "booking-system",
    "patient-recall",
    "review-engine",
    "local-seo",
    "practice-management",
    "compliance-review",
  ],
  injectedTopics: [
    "Online appointment booking",
    "Patient recall and follow-up",
    "Review generation and response",
    "Local search visibility",
    "Patient data handling",
  ],
  narrative:
    "Clinics grow on captured appointments and repeat visits, not on advertising. Booking friction and missed recalls cost more than any campaign returns.",
  defaultFirstMove: "immediate",
};

export const MANUFACTURING_RULE: IndustryRule = {
  id: "manufacturing",
  label: "Manufacturing",
  domainEmphasis: {
    sales: 1.35,
    website: 1.25,
    automation: 1.2,
    seo: 1.1,
    customerExperience: 1.05,
    brand: 0.8,
    marketing: 0.85,
  },
  priorityServices: [
    "product-catalogue",
    "rfq-automation",
    "dealer-portal",
    "inventory-integration",
    "seo-foundation",
    "crm-implementation",
  ],
  injectedTopics: [
    "Product catalogue and specifications",
    "RFQ intake and quotation speed",
    "Dealer and distributor enablement",
    "Stock and work-in-progress visibility",
    "Discovery beyond the home region",
  ],
  narrative:
    "Industrial buyers self-qualify from published specifications and award to whoever quotes credibly first. Catalogue depth and quotation speed decide the win rate.",
  defaultFirstMove: "30-days",
};

export const EDUCATION_RULE: IndustryRule = {
  id: "education",
  label: "Education & training",
  domainEmphasis: {
    marketing: 1.3,
    crm: 1.25,
    brand: 1.2,
    customerExperience: 1.15,
    website: 1.1,
    automation: 0.95,
  },
  priorityServices: [
    "lifecycle-messaging",
    "crm-implementation",
    "landing-pages",
    "content-engine",
    "review-engine",
    "retention-programme",
  ],
  injectedTopics: [
    "Enquiry-to-enrolment funnel",
    "Course information depth",
    "Published outcomes and proof",
    "Attendance and completion tracking",
    "Alumni and referral engine",
  ],
  narrative:
    "Enrolment decisions are made over weeks by people comparing outcomes. Nurture and published proof matter more than reach.",
  defaultFirstMove: "30-days",
};

export const RETAIL_RULE: IndustryRule = {
  id: "retail",
  label: "Retail & e-commerce",
  domainEmphasis: {
    website: 1.3,
    marketing: 1.25,
    customerExperience: 1.2,
    automation: 1.15,
    seo: 1.1,
    sales: 0.9,
  },
  priorityServices: [
    "ecommerce-build",
    "product-catalogue",
    "lifecycle-messaging",
    "retention-programme",
    "inventory-integration",
    "local-seo",
  ],
  injectedTopics: [
    "Owned versus marketplace channel",
    "Product content quality",
    "Basket and browse recovery",
    "Stock accuracy across channels",
    "Repeat purchase rate",
  ],
  narrative:
    "Retail margin is made on the second purchase. Owning the channel and the customer list is what turns a transaction into a relationship.",
  defaultFirstMove: "immediate",
};

export const CONSTRUCTION_RULE: IndustryRule = {
  id: "construction",
  label: "Construction & infrastructure",
  domainEmphasis: {
    sales: 1.35,
    brand: 1.2,
    seo: 1.15,
    customerExperience: 1.15,
    website: 1.1,
    marketing: 0.9,
  },
  priorityServices: [
    "proposal-system",
    "website-build",
    "local-seo",
    "client-portal",
    "crm-implementation",
    "operations-sop",
  ],
  injectedTopics: [
    "Completed-project portfolio",
    "Estimate turnaround",
    "Tender and bid tracking",
    "Client progress visibility",
    "Certification and compliance records",
  ],
  narrative:
    "Contracts are won on demonstrable past work and on estimating faster than the competition. Both are process problems, not marketing ones.",
  defaultFirstMove: "30-days",
};

export const RESTAURANT_RULE: IndustryRule = {
  id: "restaurant",
  label: "Restaurant & hospitality",
  domainEmphasis: {
    seo: 1.35,
    customerExperience: 1.3,
    website: 1.15,
    marketing: 1.15,
    automation: 1.05,
    sales: 0.8,
    crm: 0.9,
  },
  priorityServices: [
    "review-engine",
    "local-seo",
    "booking-system",
    "direct-ordering",
    "menu-management",
    "retention-programme",
  ],
  injectedTopics: [
    "Table reservation capture",
    "Direct versus aggregator ordering",
    "Review rating management",
    "Menu accuracy online",
    "Regulars and quiet-night demand",
  ],
  narrative:
    "Covers follow the rating and the map pack. Half a star and a working reservation flow move revenue more than any campaign.",
  defaultFirstMove: "immediate",
};

export const REAL_ESTATE_RULE: IndustryRule = {
  id: "realestate",
  label: "Real estate & property",
  domainEmphasis: {
    crm: 1.35,
    sales: 1.3,
    website: 1.2,
    brand: 1.15,
    analytics: 1.1,
    automation: 1.05,
  },
  priorityServices: [
    "crm-implementation",
    "lifecycle-messaging",
    "website-build",
    "booking-system",
    "review-engine",
    "analytics-tracking",
  ],
  injectedTopics: [
    "Owned listing channel",
    "Enquiry response speed",
    "Long-cycle buyer nurture",
    "Site-visit booking and follow-up",
    "Credibility and verification signals",
  ],
  narrative:
    "Buyers enquire on several listings at once and decide months later. Whoever answers first and stays present wins the transaction.",
  defaultFirstMove: "immediate",
};

export const AGENCY_RULE: IndustryRule = {
  id: "agency",
  label: "Agency & creative services",
  domainEmphasis: {
    sales: 1.3,
    analytics: 1.25,
    customerExperience: 1.2,
    marketing: 1.15,
    brand: 1.1,
    automation: 1.05,
  },
  priorityServices: [
    "crm-implementation",
    "proposal-system",
    "executive-dashboard",
    "content-engine",
    "retention-programme",
    "operations-sop",
  ],
  injectedTopics: [
    "Forward pipeline visibility",
    "Own-brand marketing consistency",
    "Scope and change control",
    "Client-level profitability",
    "Recurring revenue mix",
  ],
  narrative:
    "Agencies fail in the gaps between projects and on absorbed scope. Forward pipeline and per-client margin are the two numbers that decide survival.",
  defaultFirstMove: "immediate",
};

export const PROFESSIONAL_SERVICES_RULE: IndustryRule = {
  id: "professional-services",
  label: "Professional services",
  domainEmphasis: {
    brand: 1.3,
    sales: 1.2,
    crm: 1.2,
    marketing: 1.15,
    customerExperience: 1.1,
    automation: 1.05,
  },
  priorityServices: [
    "content-engine",
    "proposal-system",
    "crm-implementation",
    "brand-positioning",
    "operations-sop",
    "executive-dashboard",
  ],
  injectedTopics: [
    "Capacity and resourcing model",
    "Published expertise",
    "Time capture and billing",
    "Referral dependency",
    "Key-person concentration",
  ],
  narrative:
    "Expertise businesses are bought on demonstrated authority and sold by a handful of people. Publishing and documenting are what make growth transferable.",
  defaultFirstMove: "30-days",
};

export const TECHNOLOGY_RULE: IndustryRule = {
  id: "technology",
  label: "Technology & SaaS",
  domainEmphasis: {
    analytics: 1.3,
    marketing: 1.25,
    customerExperience: 1.25,
    sales: 1.15,
    automation: 1.1,
  },
  priorityServices: [
    "analytics-tracking",
    "lifecycle-messaging",
    "content-engine",
    "crm-implementation",
    "retention-programme",
    "ai-enablement",
  ],
  injectedTopics: [
    "Buying cycle length",
    "Multi-stakeholder decisions",
    "Service-level commitments",
    "Partner channel mix",
    "Cost of serving the next customer",
  ],
  narrative:
    "Technology businesses live on retention and on unit economics. Measurement precedes every other investment.",
  defaultFirstMove: "immediate",
};

export const LOGISTICS_RULE: IndustryRule = {
  id: "logistics",
  label: "Logistics & transport",
  domainEmphasis: {
    automation: 1.3,
    customerExperience: 1.25,
    sales: 1.15,
    analytics: 1.15,
    crm: 1.1,
    brand: 0.85,
  },
  priorityServices: [
    "workflow-automation",
    "client-portal",
    "crm-implementation",
    "executive-dashboard",
    "operations-sop",
    "support-automation",
  ],
  injectedTopics: [
    "Buying cycle and tendering",
    "Decision-group complexity",
    "Service-level commitments",
    "Partner and subcontractor mix",
    "Cost to serve at scale",
  ],
  narrative:
    "Margin is thin and won on operational efficiency. Automation and visibility beat brand investment at almost every stage.",
  defaultFirstMove: "30-days",
};

export const NONPROFIT_RULE: IndustryRule = {
  id: "nonprofit",
  label: "Non-profit",
  domainEmphasis: {
    brand: 1.3,
    marketing: 1.25,
    customerExperience: 1.2,
    crm: 1.15,
    analytics: 1.1,
    sales: 0.8,
  },
  priorityServices: [
    "content-engine",
    "lifecycle-messaging",
    "crm-implementation",
    "website-build",
    "executive-dashboard",
    "retention-programme",
  ],
  injectedTopics: [
    "Supporter decision journey",
    "Multi-stakeholder approval",
    "Commitments to beneficiaries",
    "Partner and grant channels",
    "Cost to reach the next supporter",
  ],
  narrative:
    "Non-profits compete for attention and trust rather than price. Storytelling and supporter retention drive everything else.",
  defaultFirstMove: "30-days",
};

export const OTHER_RULE: IndustryRule = {
  id: "other",
  label: "Your sector",
  domainEmphasis: {},
  priorityServices: [
    "demand-strategy",
    "crm-implementation",
    "website-build",
    "analytics-tracking",
  ],
  injectedTopics: [
    "Buying cycle length",
    "Decision-group complexity",
    "Service-level commitments",
    "Partner channel mix",
    "Cost to serve at scale",
  ],
  narrative:
    "Without a sector-specific playbook we assess the fundamentals: how demand is created, how it converts, and what it costs to serve.",
  defaultFirstMove: "30-days",
};
