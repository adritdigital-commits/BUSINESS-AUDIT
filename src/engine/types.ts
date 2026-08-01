/**
 * The assessment domain.
 *
 * Everything the engines operate on is declared here and nowhere else. No
 * React component may define, widen or reinterpret these types — components
 * render what the engines return.
 */

// ---------------------------------------------------------------- taxonomy

/** The nine capability areas the assessment scores independently. */
export type DomainId =
  | "website"
  | "seo"
  | "brand"
  | "marketing"
  | "sales"
  | "crm"
  | "automation"
  | "analytics"
  | "customerExperience";

export const DOMAIN_IDS: readonly DomainId[] = [
  "website",
  "seo",
  "brand",
  "marketing",
  "sales",
  "crm",
  "automation",
  "analytics",
  "customerExperience",
] as const;

export interface Domain {
  id: DomainId;
  name: string;
  /** Axis label, where a full name will not fit. */
  shortName: string;
  description: string;
  /** Baseline contribution to overall maturity, before profile modifiers. */
  baseWeight: number;
}

export type Priority = "HIGH" | "MEDIUM" | "LOW";

/** How hard an engagement is to deliver. */
export type Difficulty = "easy" | "moderate" | "complex";

/**
 * How sophisticated a question is — deliberately distinct from `Difficulty`.
 * A basic question is one any owner can answer; an advanced one assumes the
 * business already measures something. Used to avoid asking a one-year-old
 * business about attribution modelling.
 */
export type QuestionDifficulty = "basic" | "intermediate" | "advanced";

export type Impact = "low" | "medium" | "high" | "transformational";

// ----------------------------------------------------------------- profile

export type BusinessAge =
  | "startup"
  | "1-3-years"
  | "3-5-years"
  | "5-10-years"
  | "10-plus-years";

export type BusinessType =
  | "b2b"
  | "b2c"
  | "b2b-b2c"
  | "local"
  | "service"
  | "manufacturer"
  | "distributor"
  | "agency"
  | "education"
  | "healthcare"
  | "restaurant"
  | "retail"
  | "construction"
  | "other";

export type IndustryId =
  | "healthcare"
  | "manufacturing"
  | "education"
  | "retail"
  | "construction"
  | "restaurant"
  | "realestate"
  | "agency"
  | "professional-services"
  | "technology"
  | "logistics"
  | "nonprofit"
  | "other";

export type AcquisitionChannel =
  | "google-search"
  | "google-business-profile"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "youtube"
  | "referrals"
  | "whatsapp"
  | "cold-calling"
  | "email-marketing"
  | "walk-ins"
  | "marketplace"
  | "other";

export type PriorityGoal =
  | "more-leads"
  | "better-website"
  | "better-branding"
  | "seo"
  | "google-ranking"
  | "marketing"
  | "social-media"
  | "automation"
  | "crm"
  | "ai"
  | "sales"
  | "customer-retention"
  | "team-productivity"
  | "reporting"
  | "analytics";

export type TeamSize = "solo" | "2-10" | "11-50" | "51-200" | "200-plus";

export type RevenueBand =
  | "pre-revenue"
  | "under-25l"
  | "25l-1cr"
  | "1cr-5cr"
  | "5cr-25cr"
  | "25cr-plus"
  | "undisclosed";

/** Who the report is addressed to. Captured before the profile. */
export interface ContactDetails {
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

/** Everything the engines know about the business before a question is asked. */
export interface BusinessProfile {
  businessName: string;
  website: string;
  industry: IndustryId | "";
  businessType: BusinessType | "";
  businessAge: BusinessAge | "";
  teamSize: TeamSize | "";
  annualRevenue: RevenueBand | "";
  primaryGoal: PriorityGoal | "";
  /** Where customers come from today. Multi-select, at least one. */
  acquisitionChannels: AcquisitionChannel[];
  /** The three areas the business most wants to improve. Exactly three. */
  priorities: PriorityGoal[];
}

/**
 * Facts derived from the profile, computed once and passed to every engine so
 * the same question is never answered twice in two different ways.
 */
export interface ProfileSignals {
  hasWebsite: boolean;
  /** Digitally acquired vs. offline/word-of-mouth dependent. */
  isDigitallyAcquired: boolean;
  /** Depends on a single acquisition channel. */
  isSingleChannel: boolean;
  isLocal: boolean;
  isB2B: boolean;
  isB2C: boolean;
  isYoung: boolean;
  isEstablished: boolean;
  isSmallTeam: boolean;
  isLargeTeam: boolean;
  isEarlyRevenue: boolean;
  isScaledRevenue: boolean;
  /** Fast lookup for conditions and weighting. */
  prioritySet: ReadonlySet<PriorityGoal>;
  channelSet: ReadonlySet<AcquisitionChannel>;
}

// ---------------------------------------------------------------- questions

/** Which quota a question competes in during selection. */
export type QuestionPool = "core" | "industry" | "goal" | "size";

/**
 * A declarative gate. Conditions are data, never functions, so a question bank
 * stays serialisable and a rule can be inspected, tested and explained to the
 * user ("asked because you are in healthcare").
 */
export type Condition =
  | { kind: "industry"; in: IndustryId[] }
  | { kind: "businessType"; in: BusinessType[] }
  | { kind: "businessAge"; in: BusinessAge[] }
  | { kind: "teamSize"; in: TeamSize[] }
  | { kind: "revenue"; in: RevenueBand[] }
  | { kind: "priority"; anyOf: PriorityGoal[] }
  | { kind: "channel"; anyOf: AcquisitionChannel[] }
  | { kind: "signal"; is: keyof ProfileSignals; equals: boolean }
  | { kind: "answered"; questionId: string; optionIn: string[] }
  | { kind: "not"; condition: Condition };

export interface AnswerOption {
  id: string;
  label: string;
  /** 0–100 contribution to the question's domain. */
  score: number;
  /** Services this answer puts on the table. */
  recommendedServices?: string[];
  /** Priority attached to those services when this answer is chosen. */
  priority?: Priority;
  /** Why this answer matters, quoted back in the report. */
  insight?: string;
  /** Ids of follow-up questions this answer unlocks. */
  unlocks?: string[];
}

export interface Question {
  id: string;
  title: string;
  description?: string;
  category: DomainId;
  pool: QuestionPool;
  /** Relative importance inside its domain, before profile modifiers. */
  weight: number;
  difficulty: QuestionDifficulty;
  /** ALL must hold for the question to be eligible. */
  triggerConditions?: Condition[];
  options: AnswerOption[];
  /** Follow-ups live with their parent and are only reachable through it. */
  followUpQuestions?: Question[];
  /** Industry pool only: which industries this question belongs to. */
  industries?: IndustryId[];
  /** Goal pool only: which priorities this question serves. */
  goals?: PriorityGoal[];
  /** Shown to the user to explain why they are being asked this. */
  rationale?: string;
}

/** One recorded answer, keyed by question id. */
export interface AnswerEntry {
  optionId?: string;
  skipped?: boolean;
}

export type AnswersMap = Record<string, AnswerEntry>;

// ----------------------------------------------------------------- services

export interface Service {
  id: string;
  name: string;
  summary: string;
  domain: DomainId;
  deliverables: string[];
  benefits: string[];
  effortDays: number;
  timeline: string;
  costMin: number;
  costMax: number;
  difficulty: Difficulty;
  impact: Impact;
  /** Expected return, expressed as a payback statement. */
  roi: string;
  /** How soon the work should start, absent any other signal. */
  defaultHorizon: HorizonId;
}

export type HorizonId =
  | "immediate"
  | "30-days"
  | "60-days"
  | "90-days"
  | "6-months"
  | "12-months";
