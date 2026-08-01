import { planAssessment } from "@/engine/questionEngine";
import type {
  AnswersMap,
  BusinessProfile,
  ContactDetails,
  Question,
} from "@/engine/types";

/**
 * Worked profiles used by the engine tests.
 *
 * Kept in `src` rather than beside a single test because several suites need
 * the same businesses, and because a divergence between them would make the
 * suites quietly incomparable.
 */

export const CONTACT: ContactDetails = {
  fullName: "Priya Sharma",
  email: "priya@example.in",
  phone: "+91 98765 43210",
  role: "Founder / Owner",
};

const BASE: BusinessProfile = {
  businessName: "Example Co",
  website: "example.in",
  industry: "professional-services",
  businessType: "b2b",
  businessAge: "3-5-years",
  teamSize: "11-50",
  annualRevenue: "1cr-5cr",
  primaryGoal: "more-leads",
  acquisitionChannels: ["google-search", "referrals"],
  priorities: ["more-leads", "seo", "crm"],
};

export function profile(overrides: Partial<BusinessProfile> = {}): BusinessProfile {
  return { ...BASE, ...overrides };
}

/** A healthcare clinic with a website — the canonical adaptive example. */
export const CLINIC = profile({
  businessName: "Northline Clinic",
  website: "northline.clinic",
  industry: "healthcare",
  businessType: "healthcare",
  businessAge: "5-10-years",
  teamSize: "2-10",
  annualRevenue: "25l-1cr",
  primaryGoal: "customer-retention",
  acquisitionChannels: ["google-business-profile", "referrals", "whatsapp"],
  priorities: ["customer-retention", "more-leads", "automation"],
});

/** A manufacturer with no website at all. */
export const MANUFACTURER_NO_SITE = profile({
  businessName: "Ironworks Ltd",
  website: "",
  industry: "manufacturing",
  businessType: "manufacturer",
  businessAge: "10-plus-years",
  teamSize: "51-200",
  annualRevenue: "5cr-25cr",
  primaryGoal: "more-leads",
  acquisitionChannels: ["referrals", "cold-calling"],
  priorities: ["more-leads", "better-website", "sales"],
});

/** A pre-revenue solo restaurant — tests affordability sequencing. */
export const NEW_RESTAURANT = profile({
  businessName: "Corner Table",
  website: "",
  industry: "restaurant",
  businessType: "restaurant",
  businessAge: "startup",
  teamSize: "solo",
  annualRevenue: "pre-revenue",
  primaryGoal: "more-leads",
  acquisitionChannels: ["walk-ins", "instagram"],
  priorities: ["more-leads", "social-media", "better-branding"],
});

/** Answers every planned question with the option at `index`, clamped. */
export function answerAll(
  target: BusinessProfile,
  index: number,
  answers: AnswersMap = {}
): AnswersMap {
  let result: AnswersMap = { ...answers };

  // Answering can unlock follow-ups, so re-plan until the flow stops growing.
  for (let pass = 0; pass < 6; pass += 1) {
    const plan = planAssessment(target, result);
    const before = Object.keys(result).length;

    for (const item of plan.questions) {
      if (result[item.question.id]) continue;
      const question: Question = item.question;
      const option = question.options[Math.min(index, question.options.length - 1)];
      result = { ...result, [question.id]: { optionId: option.id } };
    }

    if (Object.keys(result).length === before) break;
  }

  return result;
}

/** Answers with the worst option, i.e. the one that triggers the most work. */
export const answerWorst = (target: BusinessProfile) => answerAll(target, 0);

/**
 * Answers every question with its highest-scoring option.
 *
 * Note this is not the same as "recommends nothing": a few top answers still
 * trigger work by design — a business that would lose everything if its
 * website went down genuinely needs backup and uptime hardening.
 */
export function answerBest(target: BusinessProfile): AnswersMap {
  let result: AnswersMap = {};
  for (let pass = 0; pass < 6; pass += 1) {
    const plan = planAssessment(target, result);
    const before = Object.keys(result).length;
    for (const item of plan.questions) {
      if (result[item.question.id]) continue;
      const best = [...item.question.options].sort((a, b) => b.score - a.score)[0];
      result = { ...result, [item.question.id]: { optionId: best.id } };
    }
    if (Object.keys(result).length === before) break;
  }
  return result;
}
