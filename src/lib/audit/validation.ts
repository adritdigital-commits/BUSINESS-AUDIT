import type { BusinessDetails, ClientDetails } from "@/lib/audit/types";

/**
 * Validation for the two detail steps. Deliberately small and synchronous —
 * these forms never leave the browser, so there is no server contract to
 * mirror and no reason to pull a schema library into the bundle for them.
 */

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

// Intentionally permissive: the goal is to catch typos, not to adjudicate
// which addresses RFC 5322 permits.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Accepts international and Indian formats, with or without separators.
const PHONE = /^[+()\d][\d\s\-().]{6,19}$/;

export function validateClient(details: ClientDetails): FieldErrors<ClientDetails> {
  const errors: FieldErrors<ClientDetails> = {};

  if (!details.fullName.trim()) {
    errors.fullName = "Tell us who we should address the report to.";
  } else if (details.fullName.trim().length < 2) {
    errors.fullName = "That looks too short to be a name.";
  }

  if (!details.email.trim()) {
    errors.email = "We need an email to put on the report.";
  } else if (!EMAIL.test(details.email.trim())) {
    errors.email = "That does not look like a valid email address.";
  }

  if (details.phone.trim() && !PHONE.test(details.phone.trim())) {
    errors.phone = "Enter a valid phone number, or leave it blank.";
  }

  if (!details.role.trim()) {
    errors.role = "Select your role so we can pitch the report correctly.";
  }

  return errors;
}

export function validateBusiness(details: BusinessDetails): FieldErrors<BusinessDetails> {
  const errors: FieldErrors<BusinessDetails> = {};

  if (!details.businessName.trim()) {
    errors.businessName = "The report is titled with your business name.";
  }

  if (details.website.trim() && !isPlausibleUrl(details.website.trim())) {
    errors.website = "Enter a web address like example.com, or leave it blank.";
  }

  if (!details.industry.trim()) errors.industry = "Select the closest industry.";
  if (!details.teamSize.trim()) errors.teamSize = "Select your team size.";
  if (!details.annualRevenue.trim()) errors.annualRevenue = "Select a revenue band.";
  if (!details.primaryGoal.trim()) {
    errors.primaryGoal = "Pick the goal that matters most right now.";
  }

  return errors;
}

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}

/** Accepts bare domains as well as full URLs, since most people type the former. */
function isPlausibleUrl(value: string): boolean {
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    return url.hostname.includes(".") && !url.hostname.endsWith(".");
  } catch {
    return false;
  }
}
