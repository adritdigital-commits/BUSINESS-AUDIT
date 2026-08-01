import type { Question } from "@/engine/types";

/** Real estate and property: listings, site visits, long cycles, portals. */
export const REAL_ESTATE_QUESTIONS: Question[] = [
  {
    id: "ind-re-listings",
    title: "Where do your properties get listed?",
    category: "website",
    pool: "industry",
    industries: ["realestate"],
    weight: 1.25,
    difficulty: "basic",
    options: [
      {
        id: "ind-re-listings-portals",
        label: "Portals only",
        score: 35,
        recommendedServices: ["website-build", "product-catalogue"],
        priority: "HIGH",
        insight:
          "Portals sell your listing to the buyer and your buyer to your competitor. You need a channel you own.",
      },
      {
        id: "ind-re-listings-social",
        label: "Portals and social media",
        score: 50,
        recommendedServices: ["website-build"],
        priority: "MEDIUM",
        insight:
          "Both channels are rented. Neither leaves you with the enquiry if the platform changes its terms.",
      },
      { id: "ind-re-listings-site", label: "Portals plus our own searchable site", score: 85 },
      { id: "ind-re-listings-full", label: "Our own site as the primary channel, syndicated out", score: 100 },
    ],
  },
  {
    id: "ind-re-enquiry-speed",
    title: "How quickly is a property enquiry answered?",
    category: "sales",
    pool: "industry",
    industries: ["realestate"],
    weight: 1.3,
    difficulty: "basic",
    options: [
      {
        id: "ind-re-enquiry-slow",
        label: "Within a day or two",
        score: 20,
        recommendedServices: ["crm-implementation", "whatsapp-automation"],
        priority: "HIGH",
        insight:
          "Property buyers enquire on several listings at once. The first agent to respond usually gets the viewing.",
      },
      {
        id: "ind-re-enquiry-hours",
        label: "Within a few hours",
        score: 55,
        recommendedServices: ["crm-optimisation"],
        priority: "MEDIUM",
        insight:
          "Good, and still behind the agent who replied in ten minutes to the same buyer.",
      },
      { id: "ind-re-enquiry-fast", label: "Within the hour, most of the time", score: 85 },
      { id: "ind-re-enquiry-instant", label: "Instantly acknowledged, then called", score: 100 },
    ],
  },
  {
    id: "ind-re-long-cycle",
    title: "What happens to a buyer who is not ready for six months?",
    category: "crm",
    pool: "industry",
    industries: ["realestate"],
    weight: 1.25,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-re-long-cycle-none",
        label: "We lose track of them",
        score: 10,
        recommendedServices: ["crm-implementation", "lifecycle-messaging"],
        priority: "HIGH",
        insight:
          "Most property decisions are made months after the first enquiry. Losing that list is losing the market.",
      },
      {
        id: "ind-re-long-cycle-manual",
        label: "Someone calls them occasionally",
        score: 45,
        recommendedServices: ["lifecycle-messaging"],
        priority: "MEDIUM",
        insight:
          "Occasional calls reach whoever is remembered, not whoever is closest to deciding.",
      },
      { id: "ind-re-long-cycle-nurture", label: "They receive new listings that match", score: 85 },
      { id: "ind-re-long-cycle-scored", label: "Nurtured, scored, and surfaced when they re-engage", score: 100 },
    ],
  },
  {
    id: "ind-re-viewings",
    title: "How are site visits booked and followed up?",
    category: "automation",
    pool: "industry",
    industries: ["realestate"],
    weight: 1.15,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-re-viewings-calls",
        label: "Phone calls, both ways",
        score: 25,
        recommendedServices: ["booking-system"],
        priority: "HIGH",
        insight: "Coordination by phone is where viewings quietly fail to happen.",
      },
      {
        id: "ind-re-viewings-manual",
        label: "Messages and a shared calendar",
        score: 55,
        recommendedServices: ["booking-system", "whatsapp-automation"],
        priority: "MEDIUM",
        insight:
          "Workable at low volume; the coordination overhead grows faster than the listings do.",
      },
      { id: "ind-re-viewings-booking", label: "Online booking with reminders", score: 85 },
      { id: "ind-re-viewings-full", label: "Booking, reminders and automatic post-visit follow-up", score: 100 },
    ],
  },
  {
    id: "ind-re-trust",
    title: "How does a buyer verify you are credible before handing over money?",
    category: "brand",
    pool: "industry",
    industries: ["realestate"],
    weight: 1.15,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-re-trust-none",
        label: "They have to take our word for it",
        score: 15,
        recommendedServices: ["review-engine", "website-build"],
        priority: "HIGH",
        insight:
          "Property is the largest transaction most people make. Trust signals are not decoration, they are the sale.",
      },
      {
        id: "ind-re-trust-registration",
        label: "Our registration details are on the site",
        score: 50,
        recommendedServices: ["review-engine"],
        priority: "MEDIUM",
        insight:
          "Registration proves you exist. Reviews and completed deals prove you deliver.",
      },
      { id: "ind-re-trust-reviews", label: "Reviews and completed transactions are published", score: 85 },
      { id: "ind-re-trust-full", label: "Reviews, credentials, past deals and named references", score: 100 },
    ],
  },
  {
    id: "ind-re-source-tracking",
    title: "Do you know which listing portal or campaign produced each closed deal?",
    category: "analytics",
    pool: "industry",
    industries: ["realestate"],
    weight: 1.1,
    difficulty: "advanced",
    options: [
      {
        id: "ind-re-source-none",
        label: "No",
        score: 15,
        recommendedServices: ["analytics-tracking"],
        priority: "HIGH",
        insight: "Portal subscriptions are a large fixed cost renewed without evidence.",
      },
      { id: "ind-re-source-rough", label: "Roughly, from memory", score: 45 },
      { id: "ind-re-source-tracked", label: "Recorded on each deal", score: 85 },
      { id: "ind-re-source-roi", label: "Tracked to cost per closed deal by source", score: 100 },
    ],
  },
];
