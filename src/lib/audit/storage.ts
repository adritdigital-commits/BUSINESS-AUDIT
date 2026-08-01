import { EMPTY_CONTACT, EMPTY_PROFILE } from "@/engine/businessProfile";
import type {
  AcquisitionChannel,
  AnswersMap,
  BusinessProfile,
  ContactDetails,
  PriorityGoal,
} from "@/engine/types";

/**
 * Progress lives in the browser. There is no account, no server round-trip and
 * nothing to lose on a refresh — which is also why every read is defensive:
 * the stored blob is user-writable and may be from an older release.
 */

export const STORAGE_KEY = "rakeshprotech.audit.v2";
export const STORAGE_VERSION = 2;

export interface AuditState {
  version: number;
  contact: ContactDetails;
  profile: BusinessProfile;
  answers: AnswersMap;
  /** Index into the resolved question flow. */
  currentIndex: number;
  startedAt: string | null;
  completedAt: string | null;
}

export function emptyState(): AuditState {
  return {
    version: STORAGE_VERSION,
    contact: { ...EMPTY_CONTACT },
    profile: { ...EMPTY_PROFILE, acquisitionChannels: [], priorities: [] },
    answers: {},
    currentIndex: 0,
    startedAt: null,
    completedAt: null,
  };
}

/**
 * Reads saved progress. Returns null — never a partial object — when there is
 * nothing usable, so callers fall back to a clean state rather than to a
 * half-populated one.
 */
export function loadState(): AuditState | null {
  if (typeof window === "undefined") return null;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing or a blocked storage partition. Not worth surfacing:
    // the audit still works, it just will not be remembered.
    return null;
  }
  if (!raw) return null;

  try {
    return normalise(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveState(state: AuditState): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // A failed clear leaves stale progress, not broken state.
  }
}

/** Coerces an unknown blob into a complete AuditState, dropping anything odd. */
function normalise(input: unknown): AuditState | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Partial<AuditState>;
  if (source.version !== STORAGE_VERSION) return null;

  const base = emptyState();

  return {
    version: STORAGE_VERSION,
    contact: mergeStrings(base.contact, source.contact),
    profile: normaliseProfile(source.profile),
    answers: normaliseAnswers(source.answers),
    currentIndex:
      typeof source.currentIndex === "number" && Number.isFinite(source.currentIndex)
        ? Math.max(0, Math.trunc(source.currentIndex))
        : 0,
    startedAt: typeof source.startedAt === "string" ? source.startedAt : null,
    completedAt: typeof source.completedAt === "string" ? source.completedAt : null,
  };
}

function normaliseProfile(source: unknown): BusinessProfile {
  const base = { ...EMPTY_PROFILE };
  if (!source || typeof source !== "object") {
    return { ...base, acquisitionChannels: [], priorities: [] };
  }
  const incoming = source as Record<string, unknown>;

  const scalars = mergeStrings(
    {
      businessName: base.businessName,
      website: base.website,
      industry: base.industry,
      businessType: base.businessType,
      businessAge: base.businessAge,
      teamSize: base.teamSize,
      annualRevenue: base.annualRevenue,
      primaryGoal: base.primaryGoal,
    },
    incoming
  );

  return {
    ...scalars,
    acquisitionChannels: stringArray<AcquisitionChannel>(incoming.acquisitionChannels),
    priorities: stringArray<PriorityGoal>(incoming.priorities),
  } as BusinessProfile;
}

/**
 * Copies string fields from the stored blob onto a known-good default, keyed
 * by the default's own fields — so an extra or renamed key in old storage is
 * dropped rather than carried forward.
 */
function mergeStrings<T extends object>(base: T, source: unknown): T {
  if (!source || typeof source !== "object") return base;
  const incoming = source as Record<string, unknown>;
  const result = { ...base };

  for (const key of Object.keys(base) as Array<keyof T & string>) {
    const value = incoming[key];
    if (typeof value === "string") result[key] = value as T[keyof T & string];
  }

  return result;
}

function stringArray<T extends string>(source: unknown): T[] {
  if (!Array.isArray(source)) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const value of source) {
    if (typeof value !== "string" || seen.has(value)) continue;
    seen.add(value);
    out.push(value as T);
  }
  return out;
}

function normaliseAnswers(source: unknown): AnswersMap {
  if (!source || typeof source !== "object") return {};
  const result: AnswersMap = {};

  for (const [questionId, value] of Object.entries(source as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>;
    const next: AnswersMap[string] = {};

    if (typeof entry.optionId === "string") next.optionId = entry.optionId;
    if (entry.skipped === true) next.skipped = true;

    if (Object.keys(next).length > 0) result[questionId] = next;
  }

  return result;
}
