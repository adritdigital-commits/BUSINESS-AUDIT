import { describe, expect, it } from "vitest";
import { hasErrors, validateBusiness, validateClient } from "@/lib/audit/validation";
import {
  EMPTY_BUSINESS_DETAILS,
  EMPTY_CLIENT_DETAILS,
  type BusinessDetails,
  type ClientDetails,
} from "@/lib/audit/types";

const VALID_CLIENT: ClientDetails = {
  fullName: "Priya Sharma",
  email: "priya@northline.co.in",
  phone: "+91 98765 43210",
  role: "Founder / Owner",
};

const VALID_BUSINESS: BusinessDetails = {
  businessName: "Northline Interiors",
  website: "northline.co.in",
  industry: "Real estate & construction",
  teamSize: "11–50 people",
  annualRevenue: "₹1 – 5 crore",
  primaryGoal: "Generate more qualified leads",
};

describe("validateClient", () => {
  it("accepts a complete set of details", () => {
    expect(hasErrors(validateClient(VALID_CLIENT))).toBe(false);
  });

  it("requires name, email and role", () => {
    const errors = validateClient(EMPTY_CLIENT_DETAILS);
    expect(errors.fullName).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.role).toBeDefined();
  });

  it("treats phone as optional but validates it when present", () => {
    expect(validateClient({ ...VALID_CLIENT, phone: "" }).phone).toBeUndefined();
    expect(validateClient({ ...VALID_CLIENT, phone: "  " }).phone).toBeUndefined();
    expect(validateClient({ ...VALID_CLIENT, phone: "abc" }).phone).toBeDefined();
    expect(validateClient({ ...VALID_CLIENT, phone: "12" }).phone).toBeDefined();
  });

  it("accepts common phone formats", () => {
    for (const phone of ["9876543210", "+91 98765 43210", "(022) 4567-8900", "022-45678900"]) {
      expect(validateClient({ ...VALID_CLIENT, phone }).phone, phone).toBeUndefined();
    }
  });

  it("rejects malformed email addresses", () => {
    for (const email of ["priya", "priya@", "@northline.co.in", "priya northline.co.in", "a@b.c"]) {
      expect(validateClient({ ...VALID_CLIENT, email }).email, email).toBeDefined();
    }
  });

  it("ignores surrounding whitespace", () => {
    expect(
      hasErrors(validateClient({ ...VALID_CLIENT, email: "  priya@northline.co.in  " }))
    ).toBe(false);
  });
});

describe("validateBusiness", () => {
  it("accepts a complete set of details", () => {
    expect(hasErrors(validateBusiness(VALID_BUSINESS))).toBe(false);
  });

  it("requires everything except the website", () => {
    const errors = validateBusiness(EMPTY_BUSINESS_DETAILS);
    expect(errors.businessName).toBeDefined();
    expect(errors.industry).toBeDefined();
    expect(errors.teamSize).toBeDefined();
    expect(errors.annualRevenue).toBeDefined();
    expect(errors.primaryGoal).toBeDefined();
    expect(errors.website).toBeUndefined();
  });

  it("accepts bare domains as well as full URLs", () => {
    for (const website of [
      "northline.co.in",
      "www.northline.co.in",
      "https://northline.co.in",
      "http://northline.co.in/services",
    ]) {
      expect(validateBusiness({ ...VALID_BUSINESS, website }).website, website).toBeUndefined();
    }
  });

  it("rejects a value that is not a web address", () => {
    for (const website of ["not a url", "northline", "http://"]) {
      expect(validateBusiness({ ...VALID_BUSINESS, website }).website, website).toBeDefined();
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
