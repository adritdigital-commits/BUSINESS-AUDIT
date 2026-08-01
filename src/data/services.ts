import type { Service } from "@/lib/audit/types";

/**
 * The service catalogue the audit recommends from. Every engagement carries
 * its own commercial detail — effort, timeline, investment band, benefits —
 * so the proposal is assembled from the catalogue rather than re-stating
 * numbers at each answer that triggers it.
 *
 * Investment bands are indicative Indian-market ranges in rupees.
 */
export const SERVICES: Service[] = [
  // ---------------------------------------------------------------- website
  {
    id: "website-build",
    name: "Conversion-First Website Build",
    summary:
      "A fast, modern marketing site designed around one job: turning visitors into enquiries.",
    category: "website",
    deliverables: [
      "Information architecture and wireframes",
      "Responsive design system and page templates",
      "Copywriting for up to 8 core pages",
      "Build, QA and launch on managed hosting",
    ],
    benefits: [
      "A credible digital front door that stands up to buyer scrutiny",
      "Enquiry capture on every page instead of a single contact form",
      "A base you can add campaigns and landing pages to without a rebuild",
    ],
    effortDays: 28,
    timeline: "5–7 weeks",
    costMin: 120000,
    costMax: 350000,
  },
  {
    id: "website-revamp",
    name: "Website Experience Revamp",
    summary:
      "Restructure and rewrite an existing site so it earns trust and routes visitors to action.",
    category: "website",
    deliverables: [
      "Heuristic and analytics-led UX teardown",
      "Restructured navigation and page hierarchy",
      "Redesigned key templates: home, service, contact",
      "Conversion path and call-to-action rework",
    ],
    benefits: [
      "Higher enquiry rate from traffic you already pay for",
      "Clearer buyer journey with fewer dead ends",
      "A site that reflects what the business is worth today",
    ],
    effortDays: 16,
    timeline: "3–4 weeks",
    costMin: 70000,
    costMax: 180000,
  },
  {
    id: "web-performance",
    name: "Performance & Mobile Optimisation",
    summary:
      "Get Core Web Vitals into the green and make the mobile experience the primary one.",
    category: "website",
    deliverables: [
      "Core Web Vitals audit across key templates",
      "Image, font and script delivery optimisation",
      "Mobile layout and tap-target corrections",
      "Before/after performance report",
    ],
    benefits: [
      "Fewer visitors lost on the first three seconds",
      "A ranking signal fixed rather than fought",
      "Ad spend that converts instead of bouncing",
    ],
    effortDays: 8,
    timeline: "2 weeks",
    costMin: 35000,
    costMax: 90000,
  },
  {
    id: "web-security",
    name: "Security, Backup & Uptime Hardening",
    summary:
      "SSL, automated backups, monitoring and a tested restore path, so an outage is an incident and not a crisis.",
    category: "website",
    deliverables: [
      "SSL and security-header configuration",
      "Automated off-site backups with a tested restore",
      "Uptime and certificate-expiry monitoring with alerts",
      "Access and dependency review",
    ],
    benefits: [
      "Recovery measured in minutes rather than weeks",
      "No silent certificate expiry taking the site offline",
      "Fewer trust warnings in front of buyers",
    ],
    effortDays: 5,
    timeline: "1 week",
    costMin: 25000,
    costMax: 60000,
  },

  // ------------------------------------------------------------------ brand
  {
    id: "brand-identity",
    name: "Brand Identity System",
    summary:
      "A complete visual identity — logo, palette, type and application — built to be used, not admired.",
    category: "brand",
    deliverables: [
      "Logo suite with responsive variants",
      "Colour, typography and imagery direction",
      "Core collateral: deck, letterhead, social kit",
      "Asset library handed over in working formats",
    ],
    benefits: [
      "Instant recognisability across every touchpoint",
      "Pricing power that comes from looking established",
      "Design decisions that stop being argued from scratch",
    ],
    effortDays: 20,
    timeline: "4–5 weeks",
    costMin: 90000,
    costMax: 250000,
  },
  {
    id: "brand-guidelines",
    name: "Brand Guidelines & Asset System",
    summary:
      "Codify how the brand is used so every person and vendor produces consistent work.",
    category: "brand",
    deliverables: [
      "Written brand guidelines document",
      "Templates for deck, proposal and social formats",
      "Do/don't usage examples",
      "Shared asset library with naming conventions",
    ],
    benefits: [
      "Consistency without a designer reviewing every file",
      "Faster turnaround for sales and marketing collateral",
      "A brand that compounds instead of drifting",
    ],
    effortDays: 8,
    timeline: "2 weeks",
    costMin: 40000,
    costMax: 95000,
  },
  {
    id: "brand-positioning",
    name: "Positioning & Messaging Workshop",
    summary:
      "Decide who you are for, what you claim, and the exact words everyone uses to say it.",
    category: "brand",
    deliverables: [
      "Competitive and category positioning map",
      "Ideal customer profile and buying triggers",
      "Messaging hierarchy: promise, proof, objection handling",
      "Website and sales copy blocks derived from it",
    ],
    benefits: [
      "Shorter sales cycles because the pitch lands earlier",
      "Marketing and sales finally telling the same story",
      "A defensible reason to be chosen over a cheaper option",
    ],
    effortDays: 10,
    timeline: "2–3 weeks",
    costMin: 60000,
    costMax: 140000,
  },

  // -------------------------------------------------------------------- seo
  {
    id: "seo-foundation",
    name: "Technical SEO Foundation",
    summary:
      "Fix the crawl, index and structure problems that cap everything you publish afterwards.",
    category: "seo",
    deliverables: [
      "Full technical crawl and issue register",
      "Indexation, redirect and canonical fixes",
      "Schema markup for the business and its services",
      "Search Console setup and baseline report",
    ],
    benefits: [
      "Pages that actually appear for the terms they target",
      "Content investment that compounds instead of leaking",
      "A measurable organic baseline to grow from",
    ],
    effortDays: 10,
    timeline: "2–3 weeks",
    costMin: 45000,
    costMax: 120000,
  },
  {
    id: "seo-local",
    name: "Local SEO & Google Business Activation",
    summary:
      "Own the map pack and local intent searches where buying decisions are made fastest.",
    category: "seo",
    deliverables: [
      "Google Business Profile build-out and optimisation",
      "Citation and directory consistency pass",
      "Location and service landing pages",
      "Review generation workflow",
    ],
    benefits: [
      "Enquiries from people already ready to buy nearby",
      "Visibility in the results that convert best",
      "Reviews that arrive by process rather than by luck",
    ],
    effortDays: 8,
    timeline: "2 weeks",
    costMin: 30000,
    costMax: 80000,
  },
  {
    id: "seo-content",
    name: "SEO Content Engine",
    summary:
      "A keyword-mapped content plan plus the production system to keep it running.",
    category: "seo",
    deliverables: [
      "Keyword and intent research mapped to the funnel",
      "12-month content calendar",
      "Briefs, production workflow and editorial standards",
      "First quarter of published pieces",
    ],
    benefits: [
      "Traffic that keeps arriving after the spend stops",
      "Authority in the terms your buyers actually search",
      "A content pipeline that does not depend on inspiration",
    ],
    effortDays: 22,
    timeline: "Ongoing, 90-day launch",
    costMin: 80000,
    costMax: 220000,
  },

  // -------------------------------------------------------------- marketing
  {
    id: "marketing-strategy",
    name: "Demand Generation Strategy",
    summary:
      "One written plan covering channels, budget, offers and the numbers each is accountable for.",
    category: "marketing",
    deliverables: [
      "Channel mix and budget allocation model",
      "Offer and campaign architecture",
      "Target cost-per-lead and cost-per-acquisition",
      "90-day execution calendar",
    ],
    benefits: [
      "Spend directed by a plan rather than by whoever calls",
      "Clear accountability per channel",
      "Fewer campaigns abandoned halfway",
    ],
    effortDays: 12,
    timeline: "3 weeks",
    costMin: 55000,
    costMax: 150000,
  },
  {
    id: "marketing-landing",
    name: "Lead Magnet & Landing Page System",
    summary:
      "Campaign landing pages and an offer worth an email address, wired to your CRM.",
    category: "marketing",
    deliverables: [
      "Lead magnet concept, copy and design",
      "Reusable landing page template set",
      "Form, thank-you and nurture handoff",
      "A/B test plan for headline and offer",
    ],
    benefits: [
      "Traffic converted into contactable leads",
      "Campaigns launchable in days, not weeks",
      "A measurable conversion rate to improve against",
    ],
    effortDays: 10,
    timeline: "2–3 weeks",
    costMin: 45000,
    costMax: 110000,
  },
  {
    id: "marketing-email",
    name: "Email & WhatsApp Lifecycle Programme",
    summary:
      "Automated sequences that keep every lead warm from first touch to signed contract.",
    category: "marketing",
    deliverables: [
      "Lifecycle map: welcome, nurture, re-engagement, win-back",
      "Sequence copy and design templates",
      "Platform setup with WhatsApp and email channels",
      "Deliverability and consent configuration",
    ],
    benefits: [
      "Revenue from leads you have already paid to acquire",
      "Follow-up that never depends on someone remembering",
      "A list that becomes an asset instead of a spreadsheet",
    ],
    effortDays: 12,
    timeline: "3 weeks",
    costMin: 50000,
    costMax: 130000,
  },
  {
    id: "marketing-social",
    name: "Organic Social & Content Repurposing",
    summary:
      "A repeatable publishing rhythm that turns one piece of thinking into a month of presence.",
    category: "marketing",
    deliverables: [
      "Channel strategy and posting cadence",
      "Content pillars and format templates",
      "Repurposing workflow from long-form to short-form",
      "First 60 days of scheduled content",
    ],
    benefits: [
      "Presence that builds familiarity before the first call",
      "Sales collateral generated as a by-product",
      "Consistency without a full-time content hire",
    ],
    effortDays: 9,
    timeline: "2–3 weeks",
    costMin: 35000,
    costMax: 95000,
  },

  // ------------------------------------------------------------------ sales
  {
    id: "sales-crm",
    name: "CRM Implementation & Migration",
    summary:
      "One system of record for every lead, with stages, owners and next actions that are enforced.",
    category: "sales",
    deliverables: [
      "CRM selection and pipeline design",
      "Data migration and de-duplication",
      "Lead routing, task and reminder automation",
      "Team onboarding and adoption plan",
    ],
    benefits: [
      "No enquiry lost between inbox, phone and memory",
      "Forecasting based on data rather than optimism",
      "A manager view of the pipeline without asking for it",
    ],
    effortDays: 14,
    timeline: "3–4 weeks",
    costMin: 60000,
    costMax: 160000,
  },
  {
    id: "sales-playbook",
    name: "Sales Playbook & SOP Design",
    summary:
      "Document the process your best closer runs, so everyone else can run it too.",
    category: "sales",
    deliverables: [
      "Stage-by-stage sales process definition",
      "Discovery, demo and objection-handling scripts",
      "Follow-up cadence and SLA rules",
      "Onboarding pack for new sales hires",
    ],
    benefits: [
      "Performance that does not live in one person's head",
      "New hires productive in weeks instead of quarters",
      "A conversion rate you can diagnose and improve",
    ],
    effortDays: 10,
    timeline: "2–3 weeks",
    costMin: 45000,
    costMax: 120000,
  },
  {
    id: "sales-proposal",
    name: "Proposal & Quotation System",
    summary:
      "Templated, branded proposals that go out same-day and track when they are opened.",
    category: "sales",
    deliverables: [
      "Proposal template set by service line",
      "Pricing and scoping calculator",
      "E-signature and acceptance workflow",
      "Open and acceptance tracking",
    ],
    benefits: [
      "Quotes out while the buyer is still interested",
      "Consistent pricing and margin discipline",
      "Visibility into which deals have gone cold",
    ],
    effortDays: 7,
    timeline: "2 weeks",
    costMin: 30000,
    costMax: 85000,
  },

  // ------------------------------------------------------------- automation
  {
    id: "automation-workflow",
    name: "Workflow Automation Build",
    summary:
      "Remove the copy-paste work between the tools your team already uses.",
    category: "automation",
    deliverables: [
      "Process mapping and automation opportunity register",
      "Integration build across your core tools",
      "Error handling, logging and alerting",
      "Runbook and handover training",
    ],
    benefits: [
      "Hours per week returned to billable work",
      "Fewer errors from manual re-entry",
      "Capacity to grow without proportional headcount",
    ],
    effortDays: 14,
    timeline: "3–4 weeks",
    costMin: 60000,
    costMax: 170000,
  },
  {
    id: "automation-ai",
    name: "AI Assistant & Enablement Roadmap",
    summary:
      "Identify where AI genuinely pays back, then build the two or three that do.",
    category: "automation",
    deliverables: [
      "Use-case assessment scored by value and effort",
      "Two production AI workflows built and deployed",
      "Prompt, guardrail and review standards",
      "Team enablement session",
    ],
    benefits: [
      "Faster response and drafting cycles across the team",
      "AI adopted deliberately rather than shadow-adopted",
      "A defensible cost advantage over slower competitors",
    ],
    effortDays: 15,
    timeline: "4 weeks",
    costMin: 75000,
    costMax: 200000,
  },
  {
    id: "automation-support",
    name: "Customer Support Automation",
    summary:
      "Deflect the repetitive questions and route the rest to the right person automatically.",
    category: "automation",
    deliverables: [
      "Ticket taxonomy and routing rules",
      "Knowledge base and canned response library",
      "Chat and WhatsApp deflection flows",
      "SLA and escalation configuration",
    ],
    benefits: [
      "Faster first response without adding staff",
      "Support load that stops scaling with revenue",
      "Consistent answers regardless of who replies",
    ],
    effortDays: 10,
    timeline: "2–3 weeks",
    costMin: 40000,
    costMax: 110000,
  },

  // ------------------------------------------------------------- operations
  {
    id: "ops-analytics",
    name: "Analytics & Conversion Tracking",
    summary:
      "Measurement you can trust, from first ad impression to signed revenue.",
    category: "operations",
    deliverables: [
      "Measurement plan and event taxonomy",
      "Analytics, tag manager and conversion setup",
      "Channel attribution configuration",
      "Data quality validation and QA",
    ],
    benefits: [
      "Budget decisions grounded in real attribution",
      "Underperforming channels caught in weeks, not quarters",
      "A shared definition of what a lead is",
    ],
    effortDays: 9,
    timeline: "2 weeks",
    costMin: 40000,
    costMax: 100000,
  },
  {
    id: "ops-dashboard",
    name: "Executive Dashboard & Reporting",
    summary:
      "One live view of the numbers that decide the quarter, refreshed without anyone building a deck.",
    category: "operations",
    deliverables: [
      "KPI definition workshop",
      "Automated data pipeline from your source systems",
      "Executive and channel dashboards",
      "Weekly reporting cadence and alerting",
    ],
    benefits: [
      "Decisions made on current numbers, not last month's",
      "Reporting time returned to the team",
      "Early warning when a metric turns",
    ],
    effortDays: 11,
    timeline: "3 weeks",
    costMin: 50000,
    costMax: 130000,
  },
  {
    id: "ops-sop",
    name: "Operations SOP & Delivery System",
    summary:
      "Write down how the work gets done, so quality survives growth and staff turnover.",
    category: "operations",
    deliverables: [
      "Core process documentation and ownership map",
      "Delivery checklists and quality gates",
      "Capacity and resourcing model",
      "Internal training and rollout plan",
    ],
    benefits: [
      "Delivery quality that does not depend on who is on the job",
      "Onboarding that takes days instead of months",
      "A business that could be handed over or sold",
    ],
    effortDays: 12,
    timeline: "3 weeks",
    costMin: 45000,
    costMax: 125000,
  },
];

const SERVICES_BY_ID = new Map(SERVICES.map((service) => [service.id, service]));

export function getService(id: string): Service | undefined {
  return SERVICES_BY_ID.get(id);
}
