import type { IndustryId, Question } from "@/engine/types";

import { ANALYTICS_QUESTIONS } from "@/data/questionBanks/analytics";
import { AUTOMATION_QUESTIONS } from "@/data/questionBanks/automation";
import { BRANDING_QUESTIONS } from "@/data/questionBanks/branding";
import { COMMON_QUESTIONS } from "@/data/questionBanks/common";
import { CRM_QUESTIONS } from "@/data/questionBanks/crm";
import { CUSTOMER_EXPERIENCE_QUESTIONS } from "@/data/questionBanks/customerExperience";
import { MARKETING_QUESTIONS } from "@/data/questionBanks/marketing";
import { SALES_QUESTIONS } from "@/data/questionBanks/sales";
import { SEO_QUESTIONS } from "@/data/questionBanks/seo";
import { WEBSITE_QUESTIONS } from "@/data/questionBanks/website";

import { AGENCY_QUESTIONS } from "@/data/questionBanks/industry/agency";
import { CONSTRUCTION_QUESTIONS } from "@/data/questionBanks/industry/construction";
import { EDUCATION_QUESTIONS } from "@/data/questionBanks/industry/education";
import { GENERIC_INDUSTRY_QUESTIONS } from "@/data/questionBanks/industry/generic";
import { HEALTHCARE_QUESTIONS } from "@/data/questionBanks/industry/healthcare";
import { MANUFACTURING_QUESTIONS } from "@/data/questionBanks/industry/manufacturing";
import { REAL_ESTATE_QUESTIONS } from "@/data/questionBanks/industry/realestate";
import { RESTAURANT_QUESTIONS } from "@/data/questionBanks/industry/restaurant";
import { RETAIL_QUESTIONS } from "@/data/questionBanks/industry/retail";
import { SERVICE_QUESTIONS } from "@/data/questionBanks/industry/service";

/**
 * The question bank registry.
 *
 * Adding an industry is one import and one map entry. Adding a topic is one
 * import and one array entry. Nothing else in the application needs to know
 * a new bank exists — the question engine reads only from here.
 */

/** Domain banks: asked of anyone whose profile satisfies their conditions. */
export const DOMAIN_BANKS: ReadonlyArray<{ name: string; questions: Question[] }> = [
  { name: "common", questions: COMMON_QUESTIONS },
  { name: "website", questions: WEBSITE_QUESTIONS },
  { name: "branding", questions: BRANDING_QUESTIONS },
  { name: "seo", questions: SEO_QUESTIONS },
  { name: "marketing", questions: MARKETING_QUESTIONS },
  { name: "sales", questions: SALES_QUESTIONS },
  { name: "crm", questions: CRM_QUESTIONS },
  { name: "automation", questions: AUTOMATION_QUESTIONS },
  { name: "analytics", questions: ANALYTICS_QUESTIONS },
  { name: "customerExperience", questions: CUSTOMER_EXPERIENCE_QUESTIONS },
];

/** Industry banks, by the industry that owns them. */
export const INDUSTRY_BANKS: Readonly<Partial<Record<IndustryId, Question[]>>> = {
  healthcare: HEALTHCARE_QUESTIONS,
  manufacturing: MANUFACTURING_QUESTIONS,
  education: EDUCATION_QUESTIONS,
  retail: RETAIL_QUESTIONS,
  construction: CONSTRUCTION_QUESTIONS,
  restaurant: RESTAURANT_QUESTIONS,
  realestate: REAL_ESTATE_QUESTIONS,
  agency: AGENCY_QUESTIONS,
  "professional-services": SERVICE_QUESTIONS,
};

/** Used when an industry has no dedicated bank yet. */
export const FALLBACK_INDUSTRY_QUESTIONS = GENERIC_INDUSTRY_QUESTIONS;

/** Every domain question, flattened. */
export const ALL_DOMAIN_QUESTIONS: Question[] = DOMAIN_BANKS.flatMap((bank) => bank.questions);

/** Every industry question across every bank, flattened. */
export const ALL_INDUSTRY_QUESTIONS: Question[] = [
  ...Object.values(INDUSTRY_BANKS).flat(),
  ...FALLBACK_INDUSTRY_QUESTIONS,
];

/** Questions relevant to one industry, falling back when none are registered. */
export function industryQuestionsFor(industry: IndustryId | ""): Question[] {
  if (!industry) return [];
  return INDUSTRY_BANKS[industry] ?? FALLBACK_INDUSTRY_QUESTIONS;
}

/**
 * Every question in the system, including follow-ups.
 *
 * Follow-ups are nested under their parent so a bank reads as one unit, but
 * lookup and validation need them flat.
 */
export const ALL_QUESTIONS_FLAT: Question[] = flatten([
  ...ALL_DOMAIN_QUESTIONS,
  ...ALL_INDUSTRY_QUESTIONS,
]);

function flatten(questions: Question[]): Question[] {
  const out: Question[] = [];
  for (const question of questions) {
    out.push(question);
    if (question.followUpQuestions?.length) out.push(...flatten(question.followUpQuestions));
  }
  return out;
}

const BY_ID = new Map(ALL_QUESTIONS_FLAT.map((question) => [question.id, question]));

export function getQuestion(id: string): Question | undefined {
  return BY_ID.get(id);
}

/** Total distinct questions available to draw from, follow-ups included. */
export const QUESTION_BANK_SIZE = BY_ID.size;
