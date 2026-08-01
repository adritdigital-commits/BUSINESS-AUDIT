/**
 * The audit domain, defined locally.
 *
 * These types deliberately do not import from `@prisma/client`: the frontend
 * runs entirely on the bundled question bank in `src/data`, with no database,
 * no network and no generated client in the dependency graph. When the
 * persistence layer is reconnected the API can map its rows onto these
 * shapes — the UI never needs to know which side the data came from.
 */

export type Priority = "HIGH" | "MEDIUM" | "LOW";

export type QuestionType = "CHOICE" | "SCALE";

export type CategoryId =
  | "website"
  | "brand"
  | "seo"
  | "marketing"
  | "sales"
  | "automation"
  | "operations";

/** A billable engagement the audit can recommend. */
export interface Service {
  id: string;
  name: string;
  /** One sentence a client can understand without context. */
  summary: string;
  category: CategoryId;
  /** Concrete things handed over at the end of the engagement. */
  deliverables: string[];
  /** Outcomes the client should expect, phrased as business results. */
  benefits: string[];
  /** Consultant-days of effort, used for the proposal's effort column. */
  effortDays: number;
  /** Calendar time from kick-off to handover. */
  timeline: string;
  /** Indicative investment band, in rupees. */
  costMin: number;
  costMax: number;
}

/**
 * One selectable answer. `points` is the 0–100 contribution to the parent
 * category; `service` names the engagement this answer triggers, if any.
 */
export interface Option {
  id: string;
  label: string;
  points: number;
  service?: string;
  priority?: Priority;
  /** Why this answer matters commercially. Rendered in the report. */
  impact?: string;
}

export interface Question {
  id: string;
  categoryId: CategoryId;
  text: string;
  /** Plain-language context shown under the question. */
  help?: string;
  type: QuestionType;
  options: Option[];
  /** SCALE only. */
  scaleMin?: number;
  scaleMax?: number;
  scaleLowLabel?: string;
  scaleHighLabel?: string;
  /** SCALE only: triggered when the answer is at or below this value. */
  scaleThreshold?: number;
  scaleService?: string;
  scalePriority?: Priority;
  scaleImpact?: string;
}

export interface Category {
  id: CategoryId;
  name: string;
  /** Short label for chart axes, where a full name will not fit. */
  shortName: string;
  slug: string;
  description: string;
  /** Relative contribution to the overall score. */
  weight: number;
}

/** One recorded answer, keyed by question id in `AnswersMap`. */
export interface AnswerEntry {
  /** CHOICE. */
  optionId?: string;
  /** SCALE. */
  value?: number;
  /** Explicitly skipped: recorded so "unanswered" and "skipped" stay distinct. */
  skipped?: boolean;
}

export type AnswersMap = Record<string, AnswerEntry>;

/** Everything captured before the questionnaire starts. */
export interface ClientDetails {
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

export interface BusinessDetails {
  businessName: string;
  website: string;
  industry: string;
  teamSize: string;
  annualRevenue: string;
  primaryGoal: string;
}

export const EMPTY_CLIENT_DETAILS: ClientDetails = {
  fullName: "",
  email: "",
  phone: "",
  role: "",
};

export const EMPTY_BUSINESS_DETAILS: BusinessDetails = {
  businessName: "",
  website: "",
  industry: "",
  teamSize: "",
  annualRevenue: "",
  primaryGoal: "",
};
