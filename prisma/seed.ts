import { PrismaClient, type Priority, type QuestionType } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Ports the 8 fully-worked categories from the prototype (src/components/
 * AuditApp.tsx) into the production question bank, in the shape described
 * by architecture doc §6. The remaining ~37 categories from the brief are
 * intentionally left as content-entry work for the admin panel.
 *
 * One deliberate simplification vs. the prototype: SCALE questions
 * (web_speed, brand_positioning) had an ad-hoc `lowRec` field that
 * triggered a recommendation below a threshold. The production schema's
 * only recommendation-trigger point is Option.recommendedService (doc §3,
 * §5) — there's no equivalent hook for a raw 1–10 scale answer — so those
 * two recommendations aren't reproduced here. The services they would
 * have pointed to are still seeded into the library below so staff can
 * wire them up manually (e.g. by converting the question to CHOICE, or
 * once a scale-triggered mechanism is added).
 */

interface ServiceSeed {
  name: string;
  description?: string;
  category?: string;
}

interface OptionSeed {
  label: string;
  points: number;
  order: number;
  recommendedService?: string;
  priority?: Priority;
  businessImpact?: string;
  timeToFix?: string;
  costRangeMin?: number;
  costRangeMax?: number;
}

interface QuestionSeed {
  text: string;
  purpose?: string;
  type: QuestionType;
  order: number;
  scaleMin?: number;
  scaleMax?: number;
  options?: OptionSeed[];
  /** Only used for web_speed/web_security, which gate on web_exists. */
  showIf?: { questionText: string; notLabel: string };
}

interface CategorySeed {
  name: string;
  slug: string;
  weight: number;
  order: number;
  questions: QuestionSeed[];
}

const SERVICES: ServiceSeed[] = [
  { name: "Professional Website Development", category: "Website" },
  { name: "Website Strategy & Build Acceleration", category: "Website" },
  { name: "Performance & Mobile Optimization", category: "Website" },
  { name: "Website Security & Backup Setup", category: "Website" },
  { name: "Security Audit", category: "Website" },
  { name: "Brand Identity Package", category: "Brand" },
  { name: "Brand Guideline & Asset System", category: "Brand" },
  { name: "Positioning & Messaging Workshop", category: "Brand" },
  { name: "Google Business Profile Setup", category: "SEO" },
  { name: "Local SEO Activation", category: "SEO" },
  { name: "SEO Content Strategy", category: "SEO" },
  { name: "Content Calendar & SEO Optimization", category: "SEO" },
  { name: "CRM Setup & Migration", category: "Lead Generation & CRM" },
  { name: "CRM Optimization & Automation", category: "Lead Generation & CRM" },
  { name: "Lead Magnet & Landing Page Design", category: "Lead Generation & CRM" },
  { name: "Landing Page Optimization", category: "Lead Generation & CRM" },
  { name: "Email + WhatsApp Marketing Setup", category: "Marketing Automation" },
  { name: "Marketing Automation Workflows", category: "Marketing Automation" },
  { name: "Sales SOP & Playbook Design", category: "Sales" },
  { name: "Sales Process Optimization", category: "Sales" },
  { name: "Analytics & Conversion Tracking Setup", category: "Analytics" },
  { name: "Analytics Dashboard & Reporting", category: "Analytics" },
  { name: "AI Automation Roadmap", category: "AI Automation" },
  { name: "AI Workflow Implementation", category: "AI Automation" },
];

const CATEGORIES: CategorySeed[] = [
  {
    name: "Website & Digital Presence",
    slug: "website-digital-presence",
    weight: 1,
    order: 0,
    questions: [
      {
        text: "Does your business currently have a website?",
        purpose: "Establishes baseline digital presence — the single strongest predictor of whether a lead can even evaluate the business online.",
        type: "CHOICE",
        order: 0,
        options: [
          { label: "No website", points: 0, order: 0, recommendedService: "Professional Website Development", priority: "HIGH", businessImpact: "High — no digital front door", timeToFix: "3–5 weeks", costRangeMin: 40000, costRangeMax: 150000 },
          { label: "In planning / building", points: 15, order: 1, recommendedService: "Website Strategy & Build Acceleration", priority: "HIGH", timeToFix: "2–4 weeks", costRangeMin: 25000, costRangeMax: 80000 },
          { label: "Yes, basic site", points: 40, order: 2 },
          { label: "Yes, optimized & modern", points: 70, order: 3 },
          { label: "Yes, SEO + lead-gen optimized", points: 100, order: 4 },
        ],
      },
      {
        text: "How would you rate your site's speed & mobile experience?",
        type: "SCALE",
        order: 1,
        scaleMin: 1,
        scaleMax: 10,
        showIf: { questionText: "Does your business currently have a website?", notLabel: "No website" },
      },
      {
        text: "Do you have SSL, regular backups, and uptime monitoring in place?",
        type: "CHOICE",
        order: 2,
        showIf: { questionText: "Does your business currently have a website?", notLabel: "No website" },
        options: [
          { label: "No", points: 10, order: 0, recommendedService: "Website Security & Backup Setup", priority: "HIGH", timeToFix: "3–5 days", costRangeMin: 8000, costRangeMax: 20000 },
          { label: "Not sure", points: 30, order: 1, recommendedService: "Security Audit", priority: "MEDIUM", timeToFix: "1 week", costRangeMin: 8000, costRangeMax: 15000 },
          { label: "Yes", points: 100, order: 2 },
        ],
      },
    ],
  },
  {
    name: "Brand Identity",
    slug: "brand-identity",
    weight: 1,
    order: 1,
    questions: [
      {
        text: "Do you have a consistent brand identity (logo, colors, fonts) across channels?",
        type: "CHOICE",
        order: 0,
        options: [
          { label: "No formal brand identity", points: 0, order: 0, recommendedService: "Brand Identity Package", priority: "HIGH", timeToFix: "2–3 weeks", costRangeMin: 20000, costRangeMax: 60000 },
          { label: "Basic logo only", points: 35, order: 1, recommendedService: "Brand Guideline & Asset System", priority: "MEDIUM", timeToFix: "1–2 weeks", costRangeMin: 15000, costRangeMax: 30000 },
          { label: "Full brand kit, used consistently", points: 100, order: 2 },
        ],
      },
      {
        text: "How clearly can you state what makes you different from competitors?",
        type: "SCALE",
        order: 1,
        scaleMin: 1,
        scaleMax: 10,
      },
    ],
  },
  {
    name: "SEO & Local SEO",
    slug: "seo-local-seo",
    weight: 1,
    order: 2,
    questions: [
      {
        text: "Is your Google Business Profile claimed, verified, and actively updated?",
        type: "CHOICE",
        order: 0,
        options: [
          { label: "Don't have one", points: 0, order: 0, recommendedService: "Google Business Profile Setup", priority: "HIGH", timeToFix: "3–5 days", costRangeMin: 5000, costRangeMax: 12000 },
          { label: "Claimed but inactive", points: 30, order: 1, recommendedService: "Local SEO Activation", priority: "HIGH", timeToFix: "1–2 weeks", costRangeMin: 10000, costRangeMax: 25000 },
          { label: "Active & optimized", points: 100, order: 2 },
        ],
      },
      {
        text: "Do you publish content targeting keywords your customers search for?",
        type: "CHOICE",
        order: 1,
        options: [
          { label: "Never", points: 0, order: 0, recommendedService: "SEO Content Strategy", priority: "MEDIUM", timeToFix: "Ongoing (monthly)", costRangeMin: 15000, costRangeMax: 40000 },
          { label: "Occasionally", points: 45, order: 1, recommendedService: "Content Calendar & SEO Optimization", priority: "MEDIUM", timeToFix: "Ongoing", costRangeMin: 15000, costRangeMax: 30000 },
          { label: "Consistently, with keyword strategy", points: 100, order: 2 },
        ],
      },
    ],
  },
  {
    name: "Lead Generation & CRM",
    slug: "lead-generation-crm",
    weight: 1.2,
    order: 3,
    questions: [
      {
        text: "Do you use a CRM to track leads and follow-ups?",
        type: "CHOICE",
        order: 0,
        options: [
          { label: "No system — spreadsheets or memory", points: 0, order: 0, recommendedService: "CRM Setup & Migration", priority: "HIGH", timeToFix: "1–2 weeks", costRangeMin: 20000, costRangeMax: 50000 },
          { label: "Basic tool, underused", points: 35, order: 1, recommendedService: "CRM Optimization & Automation", priority: "HIGH", timeToFix: "1–2 weeks", costRangeMin: 15000, costRangeMax: 35000 },
          { label: "Yes, fully utilized", points: 100, order: 2 },
        ],
      },
      {
        text: "Do you have lead magnets or landing pages designed to capture leads?",
        type: "CHOICE",
        order: 1,
        options: [
          { label: "None", points: 0, order: 0, recommendedService: "Lead Magnet & Landing Page Design", priority: "HIGH", timeToFix: "2–3 weeks", costRangeMin: 20000, costRangeMax: 50000 },
          { label: "One or two, rarely updated", points: 40, order: 1, recommendedService: "Landing Page Optimization", priority: "MEDIUM", timeToFix: "1–2 weeks", costRangeMin: 10000, costRangeMax: 25000 },
          { label: "Several, actively tested", points: 100, order: 2 },
        ],
      },
    ],
  },
  {
    name: "Marketing Automation & Email",
    slug: "marketing-automation-email",
    weight: 1,
    order: 4,
    questions: [
      {
        text: "Do you run email or WhatsApp marketing campaigns?",
        type: "CHOICE",
        order: 0,
        options: [
          { label: "No", points: 0, order: 0, recommendedService: "Email + WhatsApp Marketing Setup", priority: "MEDIUM", timeToFix: "1–2 weeks", costRangeMin: 12000, costRangeMax: 30000 },
          { label: "Occasionally, manually", points: 40, order: 1, recommendedService: "Marketing Automation Workflows", priority: "MEDIUM", timeToFix: "2 weeks", costRangeMin: 15000, costRangeMax: 35000 },
          { label: "Automated, segmented campaigns", points: 100, order: 2 },
        ],
      },
    ],
  },
  {
    name: "Sales Process",
    slug: "sales-process",
    weight: 1,
    order: 5,
    questions: [
      {
        text: "Do you have a documented sales process / SOP for converting leads?",
        type: "CHOICE",
        order: 0,
        options: [
          { label: "No, it's improvised", points: 0, order: 0, recommendedService: "Sales SOP & Playbook Design", priority: "HIGH", timeToFix: "2 weeks", costRangeMin: 15000, costRangeMax: 35000 },
          { label: "Loosely defined", points: 45, order: 1, recommendedService: "Sales Process Optimization", priority: "MEDIUM", timeToFix: "1–2 weeks", costRangeMin: 10000, costRangeMax: 25000 },
          { label: "Documented & consistently followed", points: 100, order: 2 },
        ],
      },
    ],
  },
  {
    name: "Analytics & Tracking",
    slug: "analytics-tracking",
    weight: 0.9,
    order: 6,
    questions: [
      {
        text: "Do you track website & ad performance with analytics tools (GA4, Meta Pixel, etc.)?",
        type: "CHOICE",
        order: 0,
        options: [
          { label: "No tracking at all", points: 0, order: 0, recommendedService: "Analytics & Conversion Tracking Setup", priority: "HIGH", timeToFix: "3–5 days", costRangeMin: 10000, costRangeMax: 20000 },
          { label: "Basic tracking, rarely reviewed", points: 40, order: 1, recommendedService: "Analytics Dashboard & Reporting", priority: "MEDIUM", timeToFix: "1 week", costRangeMin: 10000, costRangeMax: 20000 },
          { label: "Full tracking, reviewed regularly", points: 100, order: 2 },
        ],
      },
    ],
  },
  {
    name: "AI Readiness & Automation",
    slug: "ai-readiness-automation",
    weight: 1,
    order: 7,
    questions: [
      {
        text: "Are you using AI or automation for customer support, content, or operations?",
        type: "CHOICE",
        order: 0,
        options: [
          { label: "Not at all", points: 0, order: 0, recommendedService: "AI Automation Roadmap", priority: "MEDIUM", timeToFix: "2–4 weeks", costRangeMin: 20000, costRangeMax: 60000 },
          { label: "Experimenting a little", points: 40, order: 1, recommendedService: "AI Workflow Implementation", priority: "MEDIUM", timeToFix: "2–3 weeks", costRangeMin: 20000, costRangeMax: 50000 },
          { label: "Actively using AI across operations", points: 100, order: 2 },
        ],
      },
    ],
  },
];

async function main() {
  console.log("Seeding services...");
  const serviceIdByName = new Map<string, string>();
  for (const svc of SERVICES) {
    const row = await prisma.service.upsert({
      where: { name: svc.name },
      update: { description: svc.description, category: svc.category },
      create: svc,
    });
    serviceIdByName.set(svc.name, row.id);
  }

  console.log("Seeding categories & question bank...");
  for (const cat of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, weight: cat.weight, order: cat.order },
      create: { name: cat.name, slug: cat.slug, weight: cat.weight, order: cat.order },
    });

    // Delete and recreate this category's questions so re-running the
    // seed is idempotent (safe for local/dev; never run against a DB with
    // real completed assessments, since those hold a frozen reportJson
    // snapshot and don't depend on live question rows anyway).
    await prisma.question.deleteMany({ where: { categoryId: category.id } });

    const createdQuestionIdByText = new Map<string, string>();
    const createdOptionIdByLabel = new Map<string, Map<string, string>>();

    for (const q of cat.questions) {
      const showIfJson = q.showIf
        ? (() => {
            const gateQuestionId = createdQuestionIdByText.get(q.showIf!.questionText);
            const gateOptions = createdOptionIdByLabel.get(q.showIf!.questionText);
            if (!gateQuestionId || !gateOptions) return undefined;
            const otherOptionIds = Array.from(gateOptions.entries())
              .filter(([label]) => label !== q.showIf!.notLabel)
              .map(([, id]) => id);
            return { questionId: gateQuestionId, in: otherOptionIds };
          })()
        : undefined;

      const question = await prisma.question.create({
        data: {
          categoryId: category.id,
          text: q.text,
          purpose: q.purpose,
          type: q.type,
          order: q.order,
          scaleMin: q.scaleMin,
          scaleMax: q.scaleMax,
          showIfJson,
        },
      });
      createdQuestionIdByText.set(q.text, question.id);

      if (q.options?.length) {
        const optionIds = new Map<string, string>();
        for (const opt of q.options) {
          const created = await prisma.option.create({
            data: {
              questionId: question.id,
              label: opt.label,
              points: opt.points,
              order: opt.order,
              recommendedServiceId: opt.recommendedService
                ? serviceIdByName.get(opt.recommendedService)
                : undefined,
              priority: opt.priority,
              businessImpact: opt.businessImpact,
              timeToFix: opt.timeToFix,
              costRangeMin: opt.costRangeMin,
              costRangeMax: opt.costRangeMax,
            },
          });
          optionIds.set(opt.label, created.id);
        }
        createdOptionIdByLabel.set(q.text, optionIds);
      }
    }
  }

  console.log("Seeding a sample client + completed assessment + proposal...");
  const client = await prisma.client.upsert({
    where: { id: "seed-demo-client" },
    update: {},
    create: {
      id: "seed-demo-client",
      businessName: "Demo Business Pvt Ltd",
      contactName: "Jane Founder",
      email: "jane@demobusiness.example",
      phone: "+91 90000 00000",
      website: "https://demobusiness.example",
      industry: "Retail",
    },
  });

  const websiteQuestion = await prisma.question.findFirstOrThrow({
    where: { text: "Does your business currently have a website?" },
  });
  const basicSiteOption = await prisma.option.findFirstOrThrow({
    where: { questionId: websiteQuestion.id, label: "Yes, basic site" },
  });
  const crmQuestion = await prisma.question.findFirstOrThrow({
    where: { text: "Do you use a CRM to track leads and follow-ups?" },
  });
  const noCrmOption = await prisma.option.findFirstOrThrow({
    where: { questionId: crmQuestion.id, label: "No system — spreadsheets or memory" },
  });

  const assessment = await prisma.assessment.upsert({
    where: { id: "seed-demo-assessment" },
    update: {},
    create: {
      id: "seed-demo-assessment",
      clientId: client.id,
      status: "COMPLETED",
      completedAt: new Date(),
      answersJson: {
        [websiteQuestion.id]: { optionId: basicSiteOption.id },
        [crmQuestion.id]: { optionId: noCrmOption.id },
      },
      overallScore: 20,
      categoryScoresJson: [],
      reportJson: { note: "Placeholder snapshot — recompute via POST /api/assessments/:id/complete for a real report." },
    },
  });

  await prisma.proposal.upsert({
    where: { id: "seed-demo-proposal" },
    update: {},
    create: {
      id: "seed-demo-proposal",
      clientId: client.id,
      assessmentId: assessment.id,
      itemsJson: [
        { service: "CRM Setup & Migration", priority: "HIGH", timeToFix: "1–2 weeks", costRangeMin: 20000, costRangeMax: 50000 },
      ],
      totalMin: 20000,
      totalMax: 50000,
      status: "DRAFT",
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
