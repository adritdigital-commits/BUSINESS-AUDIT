import type { Condition, Question } from "@/engine/types";

/** Every question in this file assumes a live website exists. */
const HAS_WEBSITE: Condition = { kind: "signal", is: "hasWebsite", equals: true };
const NO_WEBSITE: Condition = { kind: "signal", is: "hasWebsite", equals: false };

/**
 * Website questions.
 *
 * The bank is split by the single fact that changes everything: whether a
 * website exists. Asking a business without one to rate its page speed wastes
 * a question and damages the credibility of the whole assessment — so the
 * no-website branch asks about the channels they actually use instead.
 */
export const WEBSITE_QUESTIONS: Question[] = [
  // ------------------------------------------------------- has a website
  {
    id: "web-dependency",
    title: "If your website disappeared today, how much business would you lose?",
    description: "The honest answer tells us what the site is really worth to you.",
    category: "website",
    pool: "core",
    weight: 1.3,
    difficulty: "basic",
    triggerConditions: [HAS_WEBSITE],
    options: [
      {
        id: "web-dependency-none",
        label: "None — it is a brochure nobody uses",
        score: 15,
        recommendedServices: ["website-revamp"],
        priority: "HIGH",
        insight:
          "You are paying to maintain an asset that produces nothing. Either make it work or stop funding it.",
        unlocks: ["web-dependency-why"],
      },
      {
        id: "web-dependency-quarter",
        label: "Less than 25%",
        score: 40,
        recommendedServices: ["website-revamp"],
        priority: "MEDIUM",
        insight: "The site supports the sale but does not create it. That is a large untapped channel.",
      },
      { id: "web-dependency-half", label: "25–50%", score: 65 },
      { id: "web-dependency-most", label: "50–75%", score: 85 },
      {
        id: "web-dependency-all",
        label: "Almost everything",
        score: 100,
        recommendedServices: ["web-security"],
        priority: "MEDIUM",
        insight:
          "The site is the business. That makes uptime, backups and performance a commercial risk, not an IT one.",
      },
    ],
    followUpQuestions: [
      {
        id: "web-dependency-why",
        title: "Why do you think the site produces so little?",
        category: "website",
        pool: "core",
        weight: 0.8,
        difficulty: "basic",
        options: [
          {
            id: "web-dependency-why-traffic",
            label: "Nobody visits it",
            score: 25,
            recommendedServices: ["seo-foundation", "local-seo"],
            priority: "HIGH",
            insight: "A discoverability problem, not a design one. Redesigning it would change nothing.",
          },
          {
            id: "web-dependency-why-convert",
            label: "People visit but never get in touch",
            score: 30,
            recommendedServices: ["website-revamp", "landing-pages"],
            priority: "HIGH",
            insight: "You are already paying for the traffic. The conversion path is where the money is.",
          },
          {
            id: "web-dependency-why-outdated",
            label: "It is out of date and we are embarrassed by it",
            score: 20,
            recommendedServices: ["website-revamp", "brand-identity"],
            priority: "HIGH",
            insight: "A dated site actively lowers the price you can charge.",
          },
          {
            id: "web-dependency-why-wrong",
            label: "It does not describe what we actually do now",
            score: 30,
            recommendedServices: ["brand-positioning", "website-revamp"],
            priority: "HIGH",
            insight: "A positioning problem showing up as a website problem.",
          },
        ],
      },
    ],
  },
  {
    id: "web-conversion-path",
    title: "What can a visitor do the moment they decide they want to talk to you?",
    category: "website",
    pool: "core",
    weight: 1.2,
    difficulty: "basic",
    triggerConditions: [HAS_WEBSITE],
    options: [
      {
        id: "web-conversion-none",
        label: "Nothing obvious — there is no clear contact route",
        score: 0,
        recommendedServices: ["website-revamp"],
        priority: "HIGH",
        insight: "Intent that arrives ready to buy leaves without a way to say so.",
      },
      {
        id: "web-conversion-contact",
        label: "A generic contact page",
        score: 35,
        recommendedServices: ["landing-pages"],
        priority: "MEDIUM",
        insight: "A single buried form converts a fraction of the intent on the page.",
      },
      { id: "web-conversion-multi", label: "A form plus phone or WhatsApp", score: 65 },
      { id: "web-conversion-cta", label: "Contextual calls to action on every key page", score: 85 },
      {
        id: "web-conversion-booking",
        label: "Booking and qualification, routed straight to sales",
        score: 100,
      },
    ],
  },
  {
    id: "web-mobile",
    title: "How does the site behave on a phone, on mobile data?",
    description: "Not on office wifi — most of your visitors are not on office wifi.",
    category: "website",
    pool: "goal",
    goals: ["better-website", "more-leads", "seo", "google-ranking"],
    weight: 1.1,
    difficulty: "basic",
    triggerConditions: [HAS_WEBSITE],
    options: [
      {
        id: "web-mobile-bad",
        label: "Slow, and awkward to use",
        score: 10,
        recommendedServices: ["web-performance"],
        priority: "HIGH",
        insight: "Most visitors leave before the first line of copy renders. This is pure waste.",
      },
      {
        id: "web-mobile-ok",
        label: "It works, but it is not fast",
        score: 45,
        recommendedServices: ["web-performance"],
        priority: "MEDIUM",
        insight: "Speed is a ranking signal as well as a conversion one — you are losing on both.",
      },
      { id: "web-mobile-good", label: "Fast and comfortable", score: 80 },
      { id: "web-mobile-excellent", label: "Designed mobile-first, and measured", score: 100 },
    ],
  },
  {
    id: "web-publish-speed",
    title: "How quickly can you publish a new page?",
    category: "website",
    pool: "size",
    weight: 0.9,
    difficulty: "basic",
    triggerConditions: [HAS_WEBSITE],
    options: [
      {
        id: "web-publish-locked",
        label: "We cannot change anything ourselves",
        score: 15,
        recommendedServices: ["website-revamp"],
        priority: "MEDIUM",
        insight: "Marketing moves at the speed of whoever owns the code.",
      },
      {
        id: "web-publish-vendor",
        label: "We raise a request and wait weeks",
        score: 35,
        recommendedServices: ["website-revamp"],
        priority: "MEDIUM",
        insight: "Campaigns miss their window waiting on a page that never ships.",
      },
      { id: "web-publish-content", label: "We can edit content but not build pages", score: 70 },
      { id: "web-publish-fast", label: "We can publish a new page the same day", score: 100 },
    ],
  },
  {
    id: "web-resilience",
    title: "Do you have SSL, automated backups and uptime monitoring?",
    description: "A restore you have actually tested counts. One you have not does not.",
    category: "website",
    pool: "core",
    weight: 1,
    difficulty: "intermediate",
    triggerConditions: [HAS_WEBSITE],
    options: [
      {
        id: "web-resilience-none",
        label: "None of these",
        score: 0,
        recommendedServices: ["web-security"],
        priority: "HIGH",
        insight: "One incident could take the site off the internet permanently.",
      },
      {
        id: "web-resilience-ssl",
        label: "SSL only",
        score: 35,
        recommendedServices: ["web-security"],
        priority: "HIGH",
        insight: "Without backups, recovering from a compromise means rebuilding from scratch.",
      },
      {
        id: "web-resilience-backups",
        label: "SSL and backups, no monitoring",
        score: 65,
        recommendedServices: ["web-security"],
        priority: "MEDIUM",
        insight: "Outages get discovered by customers rather than by alerts.",
      },
      { id: "web-resilience-all", label: "All three, with a tested restore", score: 100 },
    ],
  },

  // ------------------------------------------------------- no website yet
  {
    id: "web-absent-contact",
    title: "Without a website, how do customers reach you today?",
    description: "This decides what we build first — and it may not be a website.",
    category: "website",
    pool: "core",
    weight: 1.3,
    difficulty: "basic",
    triggerConditions: [NO_WEBSITE],
    rationale: "Asked instead of the website questions, because you told us you do not have one.",
    options: [
      {
        id: "web-absent-contact-whatsapp",
        label: "WhatsApp",
        score: 45,
        recommendedServices: ["whatsapp-automation", "website-build"],
        priority: "HIGH",
        insight:
          "WhatsApp already works for you. Structuring it will pay back faster than a website will.",
      },
      {
        id: "web-absent-contact-gbp",
        label: "Google Business Profile",
        score: 50,
        recommendedServices: ["local-seo", "website-build"],
        priority: "HIGH",
        insight:
          "Your profile is doing a website's job. Strengthening it is the cheapest visibility you can buy.",
      },
      {
        id: "web-absent-contact-social",
        label: "Social media messages",
        score: 40,
        recommendedServices: ["organic-social", "website-build"],
        priority: "HIGH",
        insight: "You are renting the audience. A site is the version you own.",
      },
      {
        id: "web-absent-contact-phone",
        label: "Phone calls and referrals",
        score: 30,
        recommendedServices: ["website-build", "local-seo"],
        priority: "HIGH",
        insight: "Nothing here can be scaled deliberately. Every new customer costs the same effort.",
      },
      {
        id: "web-absent-contact-walkin",
        label: "They walk in",
        score: 35,
        recommendedServices: ["local-seo", "website-build"],
        priority: "HIGH",
        insight:
          "Footfall is capped by geography. Local search is how you extend the catchment without moving.",
      },
    ],
  },
  {
    id: "web-absent-why",
    title: "What has stopped you building a website?",
    category: "website",
    pool: "core",
    weight: 1,
    difficulty: "basic",
    triggerConditions: [NO_WEBSITE],
    options: [
      {
        id: "web-absent-why-budget",
        label: "Budget",
        score: 40,
        recommendedServices: ["website-build"],
        priority: "HIGH",
        insight:
          "A focused three-page site that captures enquiries costs a fraction of a full build and can be extended later.",
      },
      {
        id: "web-absent-why-need",
        label: "We have not needed one",
        score: 45,
        recommendedServices: ["local-seo"],
        priority: "MEDIUM",
        insight:
          "That holds while referrals hold. The site is insurance against the quarter they do not.",
      },
      {
        id: "web-absent-why-planning",
        label: "It is planned, not started",
        score: 55,
        recommendedServices: ["website-build"],
        priority: "HIGH",
        insight: "Every week of delay is demand handed to a competitor who is already findable.",
      },
      {
        id: "web-absent-why-developer",
        label: "A developer let us down",
        score: 35,
        recommendedServices: ["website-build"],
        priority: "HIGH",
        insight:
          "The usual cause is an open-ended scope. A fixed, staged scope removes the failure mode.",
      },
      { id: "web-absent-why-other", label: "Something else", score: 45 },
    ],
  },
  {
    id: "web-absent-credibility",
    title: "How often do prospects ask for a website before they will commit?",
    category: "brand",
    pool: "core",
    weight: 1.1,
    difficulty: "basic",
    triggerConditions: [NO_WEBSITE],
    options: [
      {
        id: "web-absent-credibility-often",
        label: "Often — it costs us deals",
        score: 10,
        recommendedServices: ["website-build", "brand-identity"],
        priority: "HIGH",
        insight: "This is measurable lost revenue, not a vanity concern.",
      },
      {
        id: "web-absent-credibility-sometimes",
        label: "Sometimes",
        score: 40,
        recommendedServices: ["website-build"],
        priority: "HIGH",
        insight: "Each occurrence is a deal that needed no discount, only credibility.",
      },
      {
        id: "web-absent-credibility-rarely",
        label: "Rarely — our market does not expect one",
        score: 65,
        recommendedServices: ["local-seo"],
        priority: "MEDIUM",
        insight: "Then visibility, not credibility, is the first thing to buy.",
      },
      { id: "web-absent-credibility-never", label: "Never", score: 75 },
    ],
  },
];
