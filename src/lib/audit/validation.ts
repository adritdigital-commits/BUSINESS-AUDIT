import { PRIORITY_PICK_COUNT } from "@/engine/businessProfile";
import type { BusinessProfile, ContactDetails } from "@/engine/types";

/**
 * Validation for the two capture steps.
 *
 * Deliberately small and synchronous — these forms never leave the browser, so
 * there is no server contract to mirror and no reason to pull a schema library
 * into the bundle for them.
 */

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

// Intentionally permissive: the goal is to catch typos, not to adjudicate
// which addresses RFC 5322 permits.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Accepts international and Indian formats, with or without separators.
const PHONE = /^[+()\d][\d\s\-().]{6,19}$/;

export function validateContact(details: ContactDetails): FieldErrors<ContactDetails> {
  const errors: FieldErrors<ContactDetails> = {};

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

export function validateProfile(profile: BusinessProfile): FieldErrors<BusinessProfile> {
  const errors: FieldErrors<BusinessProfile> = {};

  if (!profile.businessName.trim()) {
    errors.businessName = "The report is titled with your business name.";
  }

  if (profile.website.trim() && !isPlausibleUrl(profile.website.trim())) {
    errors.website = "Enter a web address like example.com, or leave it blank.";
  }

  if (!profile.industry) errors.industry = "Select the closest industry.";
  if (!profile.businessType) errors.businessType = "Select what kind of business this is.";
  if (!profile.businessAge) errors.businessAge = "Select how long you have been trading.";
  if (!profile.teamSize) errors.teamSize = "Select your team size.";
  if (!profile.annualRevenue) errors.annualRevenue = "Select a revenue band.";
  if (!profile.primaryGoal) errors.primaryGoal = "Pick the goal that matters most right now.";

  if (profile.acquisitionChannels.length === 0) {
    errors.acquisitionChannels = "Select at least one place customers come from today.";
  }

  if (profile.priorities.length !== PRIORITY_PICK_COUNT) {
    const remaining = PRIORITY_PICK_COUNT - profile.priorities.length;
    errors.priorities =
      remaining > 0
        ? `Choose ${remaining} more — exactly ${PRIORITY_PICK_COUNT} in total.`
        : `Choose only ${PRIORITY_PICK_COUNT}.`;
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
