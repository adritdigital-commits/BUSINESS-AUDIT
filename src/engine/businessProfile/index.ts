import { DIGITAL_CHANNELS, PRIORITY_PICK_COUNT } from "@/engine/businessProfile/options";
import type { BusinessProfile, ContactDetails, ProfileSignals } from "@/engine/types";

export * from "@/engine/businessProfile/options";

export const EMPTY_CONTACT: ContactDetails = {
  fullName: "",
  email: "",
  phone: "",
  role: "",
};

export const EMPTY_PROFILE: BusinessProfile = {
  businessName: "",
  website: "",
  industry: "",
  businessType: "",
  businessAge: "",
  teamSize: "",
  annualRevenue: "",
  primaryGoal: "",
  acquisitionChannels: [],
  priorities: [],
};

/**
 * Turns the raw profile into the handful of facts every engine actually asks
 * about. Derived once so "does this business have a website?" has exactly one
 * definition — the bug class where the question engine and the score engine
 * disagree about the same business simply cannot occur.
 */
export function deriveSignals(profile: BusinessProfile): ProfileSignals {
  const channelSet = new Set(profile.acquisitionChannels);
  const prioritySet = new Set(profile.priorities);

  const digitalChannels = profile.acquisitionChannels.filter((channel) =>
    DIGITAL_CHANNELS.includes(channel)
  );

  return {
    hasWebsite: profile.website.trim().length > 0,
    isDigitallyAcquired: digitalChannels.length > 0,
    isSingleChannel: profile.acquisitionChannels.length === 1,
    isLocal:
      profile.businessType === "local" ||
      profile.businessType === "restaurant" ||
      profile.businessType === "retail" ||
      channelSet.has("walk-ins") ||
      channelSet.has("google-business-profile"),
    isB2B:
      profile.businessType === "b2b" ||
      profile.businessType === "b2b-b2c" ||
      profile.businessType === "manufacturer" ||
      profile.businessType === "distributor" ||
      profile.businessType === "agency",
    isB2C:
      profile.businessType === "b2c" ||
      profile.businessType === "b2b-b2c" ||
      profile.businessType === "retail" ||
      profile.businessType === "restaurant" ||
      profile.businessType === "healthcare" ||
      profile.businessType === "education",
    isYoung: profile.businessAge === "startup" || profile.businessAge === "1-3-years",
    isEstablished:
      profile.businessAge === "5-10-years" || profile.businessAge === "10-plus-years",
    isSmallTeam: profile.teamSize === "solo" || profile.teamSize === "2-10",
    isLargeTeam: profile.teamSize === "51-200" || profile.teamSize === "200-plus",
    isEarlyRevenue:
      profile.annualRevenue === "pre-revenue" || profile.annualRevenue === "under-25l",
    isScaledRevenue:
      profile.annualRevenue === "5cr-25cr" || profile.annualRevenue === "25cr-plus",
    prioritySet,
    channelSet,
  };
}

/** A profile complete enough to plan an assessment from. */
export function isProfileComplete(profile: BusinessProfile): boolean {
  return (
    profile.businessName.trim().length > 0 &&
    profile.industry !== "" &&
    profile.businessType !== "" &&
    profile.businessAge !== "" &&
    profile.teamSize !== "" &&
    profile.annualRevenue !== "" &&
    profile.primaryGoal !== "" &&
    profile.acquisitionChannels.length > 0 &&
    profile.priorities.length === PRIORITY_PICK_COUNT
  );
}
