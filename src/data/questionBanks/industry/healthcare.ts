import type { Question } from "@/engine/types";

/**
 * Healthcare and wellness: clinics, practices, diagnostics, dental, allied.
 *
 * The distinguishing problems are appointment capture, follow-up adherence,
 * reputation, and the fact that patient data carries obligations that ordinary
 * customer data does not.
 */
export const HEALTHCARE_QUESTIONS: Question[] = [
  {
    id: "ind-health-booking",
    title: "How does a patient book an appointment?",
    category: "website",
    pool: "industry",
    industries: ["healthcare"],
    weight: 1.3,
    difficulty: "basic",
    rationale: "Booking friction is the largest single source of lost appointments in healthcare.",
    options: [
      {
        id: "ind-health-booking-phone",
        label: "They call, during working hours only",
        score: 20,
        recommendedServices: ["booking-system"],
        priority: "HIGH",
        insight:
          "Most people search for a clinic outside working hours. A phone-only practice loses those enquiries entirely.",
        unlocks: ["ind-health-booking-missed"],
      },
      {
        id: "ind-health-booking-whatsapp",
        label: "WhatsApp or messages, answered manually",
        score: 45,
        recommendedServices: ["booking-system", "whatsapp-automation"],
        priority: "HIGH",
        insight: "Works, but consumes staff time and leaves no record of who was never answered.",
      },
      {
        id: "ind-health-booking-form",
        label: "A form on the website we respond to",
        score: 60,
        recommendedServices: ["booking-system"],
        priority: "MEDIUM",
        insight: "A form is a request. A calendar is a booking — the difference is a large drop-off.",
      },
      { id: "ind-health-booking-online", label: "Real-time online booking against the calendar", score: 100 },
    ],
    followUpQuestions: [
      {
        id: "ind-health-booking-missed",
        title: "Roughly how many calls go unanswered in a week?",
        category: "customerExperience",
        pool: "industry",
        weight: 0.9,
        difficulty: "basic",
        options: [
          {
            id: "ind-health-booking-missed-many",
            label: "More than we would like to admit",
            score: 15,
            recommendedServices: ["booking-system", "support-automation"],
            priority: "HIGH",
            insight: "Each missed call is a patient who calls the next clinic on the list.",
          },
          {
            id: "ind-health-booking-missed-some",
            label: "A handful",
            score: 45,
            recommendedServices: ["booking-system"],
            priority: "MEDIUM",
            insight: "A handful a week is a meaningful share of a month's new patients.",
          },
          { id: "ind-health-booking-missed-few", label: "Almost none", score: 80 },
          { id: "ind-health-booking-missed-unknown", label: "We have no way of knowing", score: 25,
            recommendedServices: ["analytics-tracking"], priority: "HIGH",
            insight: "Unanswered calls are invisible revenue loss. Call tracking makes them countable." },
        ],
      },
    ],
  },
  {
    id: "ind-health-recall",
    title: "How are follow-ups and recalls handled?",
    description: "Review appointments, repeat prescriptions, annual check-ups.",
    category: "automation",
    pool: "industry",
    industries: ["healthcare"],
    weight: 1.25,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-health-recall-none",
        label: "We rely on the patient to come back",
        score: 10,
        recommendedServices: ["patient-recall", "lifecycle-messaging"],
        priority: "HIGH",
        insight:
          "Recall is the highest-margin revenue in a practice — the patient is already acquired and already trusts you.",
      },
      {
        id: "ind-health-recall-manual",
        label: "Someone works through a list and calls",
        score: 45,
        recommendedServices: ["patient-recall"],
        priority: "HIGH",
        insight: "It works until the list gets long, then it quietly stops happening.",
      },
      { id: "ind-health-recall-reminders", label: "Automated reminders before due dates", score: 80 },
      { id: "ind-health-recall-full", label: "Automated recall with escalation and rebooking", score: 100 },
    ],
  },
  {
    id: "ind-health-noshow",
    title: "What is done about no-shows?",
    category: "customerExperience",
    pool: "industry",
    industries: ["healthcare"],
    weight: 1.15,
    difficulty: "intermediate",
    options: [
      {
        id: "ind-health-noshow-nothing",
        label: "Nothing — the slot is simply lost",
        score: 15,
        recommendedServices: ["booking-system", "whatsapp-automation"],
        priority: "HIGH",
        insight:
          "A no-show is a fixed cost with no revenue. Reminders typically reduce them by a third or more.",
      },
      {
        id: "ind-health-noshow-call",
        label: "We call to remind when we have time",
        score: 45,
        recommendedServices: ["whatsapp-automation"],
        priority: "MEDIUM",
        insight:
          "Manual reminders stop happening on the days the clinic is busiest — which is when they matter most.",
      },
      { id: "ind-health-noshow-reminder", label: "Automated reminders go out", score: 80 },
      { id: "ind-health-noshow-waitlist", label: "Reminders plus a waitlist that fills the gap", score: 100 },
    ],
  },
  {
    id: "ind-health-reputation",
    title: "How do patient reviews get collected?",
    category: "seo",
    pool: "industry",
    industries: ["healthcare"],
    weight: 1.2,
    difficulty: "basic",
    options: [
      {
        id: "ind-health-reputation-none",
        label: "They do not — we have very few",
        score: 10,
        recommendedServices: ["review-engine", "local-seo"],
        priority: "HIGH",
        insight:
          "Patients choose clinics on reviews more than on any other signal. Few reviews reads as an unproven practice.",
      },
      {
        id: "ind-health-reputation-passive",
        label: "Whoever chooses to leave one",
        score: 35,
        recommendedServices: ["review-engine"],
        priority: "HIGH",
        insight: "Unprompted reviews skew towards the dissatisfied.",
      },
      { id: "ind-health-reputation-ask", label: "We ask patients after their visit", score: 75 },
      { id: "ind-health-reputation-system", label: "Automated requests, with responses managed", score: 100 },
    ],
  },
  {
    id: "ind-health-records",
    title: "Where do patient records and contact details live?",
    category: "crm",
    pool: "industry",
    industries: ["healthcare"],
    weight: 1.2,
    difficulty: "advanced",
    options: [
      {
        id: "ind-health-records-paper",
        label: "Paper files",
        score: 15,
        recommendedServices: ["practice-management"],
        priority: "HIGH",
        insight:
          "Nothing can be recalled, segmented or reminded. It also carries the highest loss and privacy risk.",
      },
      {
        id: "ind-health-records-excel",
        label: "Spreadsheets",
        score: 35,
        recommendedServices: ["practice-management"],
        priority: "HIGH",
        insight: "Searchable, but with no access control and no audit trail over sensitive data.",
      },
      {
        id: "ind-health-records-basic",
        label: "A practice management system, used partially",
        score: 65,
        recommendedServices: ["practice-management"],
        priority: "MEDIUM",
        insight:
          "Partial use means recall and reminders run on incomplete data, so they quietly under-perform.",
      },
      { id: "ind-health-records-full", label: "A practice system that is the single source of truth", score: 100 },
    ],
  },
  {
    id: "ind-health-compliance",
    title: "How confident are you in how patient data is stored and shared?",
    category: "customerExperience",
    pool: "industry",
    industries: ["healthcare"],
    weight: 1.1,
    difficulty: "advanced",
    options: [
      {
        id: "ind-health-compliance-low",
        label: "Not confident — we have never reviewed it",
        score: 15,
        recommendedServices: ["compliance-review"],
        priority: "HIGH",
        insight:
          "Patient data carries obligations ordinary customer data does not. This is a risk question before it is an IT one.",
      },
      {
        id: "ind-health-compliance-informal",
        label: "We are careful, but nothing is documented",
        score: 45,
        recommendedServices: ["compliance-review"],
        priority: "MEDIUM",
        insight: "Care that is not documented cannot be demonstrated if it is ever questioned.",
      },
      { id: "ind-health-compliance-policy", label: "There is a written policy staff follow", score: 80 },
      { id: "ind-health-compliance-audited", label: "Documented, access-controlled and reviewed", score: 100 },
    ],
  },
];
