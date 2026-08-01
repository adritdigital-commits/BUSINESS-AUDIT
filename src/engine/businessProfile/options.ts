import type {
  AcquisitionChannel,
  BusinessAge,
  BusinessType,
  IndustryId,
  PriorityGoal,
  RevenueBand,
  TeamSize,
} from "@/engine/types";

/**
 * Every selectable profile value, with a stable id and a human label.
 *
 * Ids are what the rule engine matches on; labels are what the user reads.
 * Keeping them separate means copy can be reworded without silently breaking
 * an industry rule.
 */

export interface Choice<T extends string> {
  id: T;
  label: string;
  /** Optional clarifier shown under the label. */
  hint?: string;
}

export const BUSINESS_AGES: ReadonlyArray<Choice<BusinessAge>> = [
  { id: "startup", label: "Startup (under 1 year)" },
  { id: "1-3-years", label: "1–3 years" },
  { id: "3-5-years", label: "3–5 years" },
  { id: "5-10-years", label: "5–10 years" },
  { id: "10-plus-years", label: "10+ years" },
];

export const BUSINESS_TYPES: ReadonlyArray<Choice<BusinessType>> = [
  { id: "b2b", label: "B2B" },
  { id: "b2c", label: "B2C" },
  { id: "b2b-b2c", label: "B2B + B2C" },
  { id: "local", label: "Local business" },
  { id: "service", label: "Service business" },
  { id: "manufacturer", label: "Manufacturer" },
  { id: "distributor", label: "Distributor" },
  { id: "agency", label: "Agency" },
  { id: "education", label: "Educational" },
  { id: "healthcare", label: "Healthcare" },
  { id: "restaurant", label: "Restaurant" },
  { id: "retail", label: "Retail" },
  { id: "construction", label: "Construction" },
  { id: "other", label: "Other" },
];

export const INDUSTRIES: ReadonlyArray<Choice<IndustryId>> = [
  { id: "healthcare", label: "Healthcare & wellness" },
  { id: "manufacturing", label: "Manufacturing" },
  { id: "education", label: "Education & training" },
  { id: "retail", label: "Retail & e-commerce" },
  { id: "construction", label: "Construction & infrastructure" },
  { id: "restaurant", label: "Restaurant & hospitality" },
  { id: "realestate", label: "Real estate & property" },
  { id: "agency", label: "Agency & creative services" },
  { id: "professional-services", label: "Professional services" },
  { id: "technology", label: "Technology & SaaS" },
  { id: "logistics", label: "Logistics & transport" },
  { id: "nonprofit", label: "Non-profit" },
  { id: "other", label: "Other" },
];

export const TEAM_SIZES: ReadonlyArray<Choice<TeamSize>> = [
  { id: "solo", label: "Just me" },
  { id: "2-10", label: "2–10 people" },
  { id: "11-50", label: "11–50 people" },
  { id: "51-200", label: "51–200 people" },
  { id: "200-plus", label: "200+ people" },
];

export const REVENUE_BANDS: ReadonlyArray<Choice<RevenueBand>> = [
  { id: "pre-revenue", label: "Pre-revenue" },
  { id: "under-25l", label: "Under ₹25 lakh" },
  { id: "25l-1cr", label: "₹25 lakh – ₹1 crore" },
  { id: "1cr-5cr", label: "₹1 – 5 crore" },
  { id: "5cr-25cr", label: "₹5 – 25 crore" },
  { id: "25cr-plus", label: "₹25 crore+" },
  { id: "undisclosed", label: "Prefer not to say" },
];

export const ACQUISITION_CHANNELS: ReadonlyArray<Choice<AcquisitionChannel>> = [
  { id: "google-search", label: "Google Search" },
  { id: "google-business-profile", label: "Google Business Profile" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
  { id: "referrals", label: "Referrals" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "cold-calling", label: "Cold calling" },
  { id: "email-marketing", label: "Email marketing" },
  { id: "walk-ins", label: "Offline walk-ins" },
  { id: "marketplace", label: "Marketplace" },
  { id: "other", label: "Other" },
];

export const PRIORITY_GOALS: ReadonlyArray<Choice<PriorityGoal>> = [
  { id: "more-leads", label: "More leads" },
  { id: "better-website", label: "Better website" },
  { id: "better-branding", label: "Better branding" },
  { id: "seo", label: "SEO" },
  { id: "google-ranking", label: "Google ranking" },
  { id: "marketing", label: "Marketing" },
  { id: "social-media", label: "Social media" },
  { id: "automation", label: "Automation" },
  { id: "crm", label: "CRM" },
  { id: "ai", label: "AI" },
  { id: "sales", label: "Sales" },
  { id: "customer-retention", label: "Customer retention" },
  { id: "team-productivity", label: "Team productivity" },
  { id: "reporting", label: "Reporting" },
  { id: "analytics", label: "Analytics" },
];

/** How many priorities the profile step requires. */
export const PRIORITY_PICK_COUNT = 3;

/** Digital channels — used to tell an online business from a walk-in one. */
export const DIGITAL_CHANNELS: ReadonlyArray<AcquisitionChannel> = [
  "google-search",
  "google-business-profile",
  "instagram",
  "facebook",
  "linkedin",
  "youtube",
  "email-marketing",
  "marketplace",
];

function labelLookup<T extends string>(choices: ReadonlyArray<Choice<T>>) {
  const map = new Map(choices.map((choice) => [choice.id, choice.label]));
  return (id: T | "" | undefined): string => (id ? (map.get(id) ?? id) : "");
}

export const industryLabel = labelLookup(INDUSTRIES);
export const businessTypeLabel = labelLookup(BUSINESS_TYPES);
export const businessAgeLabel = labelLookup(BUSINESS_AGES);
export const teamSizeLabel = labelLookup(TEAM_SIZES);
export const revenueLabel = labelLookup(REVENUE_BANDS);
export const channelLabel = labelLookup(ACQUISITION_CHANNELS);
export const goalLabel = labelLookup(PRIORITY_GOALS);
