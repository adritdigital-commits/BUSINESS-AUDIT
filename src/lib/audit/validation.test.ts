import { describe, expect, it } from "vitest";
import { hasErrors, validateContact, validateProfile } from "@/lib/audit/validation";
import { EMPTY_CONTACT, EMPTY_PROFILE } from "@/engine/businessProfile";
import type { BusinessProfile, ContactDetails } from "@/engine/types";

const VALID_CONTACT: ContactDetails = {
  fullName: "Priya Sharma",
  email: "priya@northline.co.in",
  phone: "+91 98765 43210",
  role: "Founder / Owner",
};

const VALID_PROFILE: BusinessProfile = {
  businessName: "Northline Interiors",
  website: "northline.co.in",
  industry: "construction",
  businessType: "b2b",
  businessAge: "5-10-years",
  teamSize: "11-50",
  annualRevenue: "1cr-5cr",
  primaryGoal: "more-leads",
  acquisitionChannels: ["google-search", "referrals"],
  priorities: ["more-leads", "seo", "crm"],
};

describe("validateClient", () => {
  it("accepts a complete set of details", () => {
    expect(hasErrors(validateContact(VALID_CONTACT))).toBe(false);
  });

  it("requires name, email and role", () => {
    const errors = validateContact(EMPTY_CONTACT);
    expect(errors.fullName).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.role).toBeDefined();
  });

  it("treats phone as optional but validates it when present", () => {
    expect(validateContact({ ...VALID_CONTACT, phone: "" }).phone).toBeUndefined();
    expect(validateContact({ ...VALID_CONTACT, phone: "  " }).phone).toBeUndefined();
    expect(validateContact({ ...VALID_CONTACT, phone: "abc" }).phone).toBeDefined();
    expect(validateContact({ ...VALID_CONTACT, phone: "12" }).phone).toBeDefined();
  });

  it("accepts common phone formats", () => {
    for (const phone of ["9876543210", "+91 98765 43210", "(022) 4567-8900", "022-45678900"]) {
      expect(validateContact({ ...VALID_CONTACT, phone }).phone, phone).toBeUndefined();
    }
  });

  it("rejects malformed email addresses", () => {
    for (const email of ["priya", "priya@", "@northline.co.in", "priya northline.co.in", "a@b.c"]) {
      expect(validateContact({ ...VALID_CONTACT, email }).email, email).toBeDefined();
    }
  });

  it("ignores surrounding whitespace", () => {
    expect(
      hasErrors(validateContact({ ...VALID_CONTACT, email: "  priya@northline.co.in  " }))
    ).toBe(false);
  });
});

describe("validateBusiness", () => {
  it("accepts a complete set of details", () => {
    expect(hasErrors(validateProfile(VALID_PROFILE))).toBe(false);
  });

  it("requires everything except the website", () => {
    const errors = validateProfile(EMPTY_PROFILE);
    expect(errors.businessName).toBeDefined();
    expect(errors.industry).toBeDefined();
    expect(errors.businessType).toBeDefined();
    expect(errors.businessAge).toBeDefined();
    expect(errors.teamSize).toBeDefined();
    expect(errors.annualRevenue).toBeDefined();
    expect(errors.primaryGoal).toBeDefined();
    expect(errors.acquisitionChannels).toBeDefined();
    expect(errors.priorities).toBeDefined();
    expect(errors.website).toBeUndefined();
  });

  it("requires at least one acquisition channel", () => {
    expect(validateProfile({ ...VALID_PROFILE, acquisitionChannels: [] }).acquisitionChannels)
      .toBeDefined();
  });

  it("requires exactly three priorities, and says how many are missing", () => {
    expect(validateProfile({ ...VALID_PROFILE, priorities: [] }).priorities).toMatch(/3 more/);
    expect(
      validateProfile({ ...VALID_PROFILE, priorities: ["seo", "crm"] }).priorities
    ).toMatch(/1 more/);
    expect(validateProfile(VALID_PROFILE).priorities).toBeUndefined();
  });

  it("accepts bare domains as well as full URLs", () => {
    for (const website of [
      "northline.co.in",
      "www.northline.co.in",
      "https://northline.co.in",
      "http://northline.co.in/services",
    ]) {
      expect(validateProfile({ ...VALID_PROFILE, website }).website, website).toBeUndefined();
    }
  });

  it("rejects a value that is not a web address", () => {
    for (const website of ["not a url", "northline", "http://"]) {
      expect(validateProfile({ ...VALID_PROFILE, website }).website, website).toBeDefined();
    }
  });
});

describe("hasErrors", () => {
  it("is false for an empty error object", () => {
    expect(hasErrors({})).toBe(false);
  });

  it("is true when any field carries a message", () => {
    expect(hasErrors({ email: "Bad" })).toBe(true);
  });
});
