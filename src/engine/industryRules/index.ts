import { DOMAINS } from "@/engine/domains";
import type { IndustryRule } from "@/engine/industryRules/types";
import {
  AGENCY_RULE,
  CONSTRUCTION_RULE,
  EDUCATION_RULE,
  HEALTHCARE_RULE,
  LOGISTICS_RULE,
  MANUFACTURING_RULE,
  NONPROFIT_RULE,
  OTHER_RULE,
  PROFESSIONAL_SERVICES_RULE,
  REAL_ESTATE_RULE,
  RESTAURANT_RULE,
  RETAIL_RULE,
  TECHNOLOGY_RULE,
} from "@/engine/industryRules/verticals";
import type { BusinessProfile, DomainId, IndustryId, PriorityGoal } from "@/engine/types";

export type { IndustryRule } from "@/engine/industryRules/types";

const RULES: Record<IndustryId, IndustryRule> = {
  healthcare: HEALTHCARE_RULE,
  manufacturing: MANUFACTURING_RULE,
  education: EDUCATION_RULE,
  retail: RETAIL_RULE,
  construction: CONSTRUCTION_RULE,
  restaurant: RESTAURANT_RULE,
  realestate: REAL_ESTATE_RULE,
  agency: AGENCY_RULE,
  "professional-services": PROFESSIONAL_SERVICES_RULE,
  technology: TECHNOLOGY_RULE,
  logistics: LOGISTICS_RULE,
  nonprofit: NONPROFIT_RULE,
  other: OTHER_RULE,
};

export function industryRuleFor(industry: IndustryId | ""): IndustryRule {
  if (!industry) return OTHER_RULE;
  return RULES[industry] ?? OTHER_RULE;
}

export const ALL_INDUSTRY_RULES: readonly IndustryRule[] = Object.values(RULES);

/**
 * Which domains a stated priority pushes on.
 *
 * This is the "IF goal = more leads THEN increase weight for SEO, website,
 * landing pages" rule from the brief, expressed once as data. Every engine
 * reads the same table, so the questionnaire, the score and the roadmap all
 * lean in the same direction.
 */
const GOAL_EMPHASIS: Record<PriorityGoal, Partial<Record<DomainId, number>>> = {
  "more-leads": { marketing: 1.35, seo: 1.3, website: 1.25, sales: 1.1 },
  "better-website": { website: 1.45, brand: 1.15, seo: 1.1 },
  "better-branding": { brand: 1.45, website: 1.15, marketing: 1.1 },
  seo: { seo: 1.5, website: 1.15, analytics: 1.1 },
  "google-ranking": { seo: 1.5, website: 1.2, analytics: 1.05 },
  marketing: { marketing: 1.4, analytics: 1.15, brand: 1.1 },
  "social-media": { marketing: 1.3, brand: 1.25 },
  automation: { automation: 1.5, crm: 1.2, analytics: 1.1 },
  crm: { crm: 1.5, sales: 1.2, automation: 1.15 },
  ai: { automation: 1.45, analytics: 1.15, customerExperience: 1.1 },
  sales: { sales: 1.45, crm: 1.25, marketing: 1.1 },
  "customer-retention": { customerExperience: 1.5, crm: 1.2, automation: 1.1 },
  "team-productivity": { automation: 1.4, analytics: 1.15, customerExperience: 1.1 },
  reporting: { analytics: 1.5, crm: 1.15 },
  analytics: { analytics: 1.5, marketing: 1.15 },
};

export function goalEmphasisFor(goal: PriorityGoal): Partial<Record<DomainId, number>> {
  return GOAL_EMPHASIS[goal] ?? {};
}

/**
 * The final weight of each domain for one business: base weight, adjusted by
 * the industry, then by every priority the client selected. The primary goal
 * counts double, because it is the one thing they said matters most.
 *
 * Multipliers compound but are clamped, so a business selecting three
 * overlapping goals cannot drive one domain to dominate the whole score.
 */
export function resolveDomainWeights(profile: BusinessProfile): Record<DomainId, number> {
  const rule = industryRuleFor(profile.industry);
  const weights = {} as Record<DomainId, number>;

  for (const domain of DOMAINS) {
    let weight = domain.baseWeight * (rule.domainEmphasis[domain.id] ?? 1);

    for (const goal of profile.priorities) {
      const emphasis = goalEmphasisFor(goal)[domain.id];
      if (emphasis) weight *= emphasis;
    }

    if (profile.primaryGoal) {
      const primary = goalEmphasisFor(profile.primaryGoal)[domain.id];
      // Applied a second time: the primary goal outranks the other two.
      if (primary) weight *= primary;
    }

    weights[domain.id] = clamp(round(weight), 0.4, 3.5);
  }

  return weights;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
