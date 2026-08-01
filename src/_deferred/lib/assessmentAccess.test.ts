import { describe, expect, it } from "vitest";
import type { Profile, Role } from "@prisma/client";
import { assertAccessAssessment, canAccessAssessment } from "@/lib/assessmentAccess";
import { AuthError } from "@/lib/auth";

const assessment = {
  clientId: "client_1",
  claimedByProfileId: "profile_owner",
  resumeToken: "secret-token",
};

function profile(role: Role, overrides: Partial<Profile> = {}): Profile {
  return {
    id: "profile_1",
    email: "user@example.com",
    fullName: null,
    role,
    clientId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Profile;
}

describe("canAccessAssessment", () => {
  describe("staff", () => {
    it("allows ADMIN unconditionally", () => {
      expect(canAccessAssessment(assessment, profile("ADMIN"), null)).toBe(true);
    });

    it("allows STAFF unconditionally", () => {
      expect(canAccessAssessment(assessment, profile("STAFF"), null)).toBe(true);
    });
  });

  describe("client", () => {
    it("allows a client whose clientId matches", () => {
      const p = profile("CLIENT", { clientId: "client_1" });
      expect(canAccessAssessment(assessment, p, null)).toBe(true);
    });

    it("denies a client belonging to a different business", () => {
      const p = profile("CLIENT", { clientId: "client_other" });
      expect(canAccessAssessment(assessment, p, null)).toBe(false);
    });

    it("allows the profile that claimed the assessment", () => {
      const p = profile("CLIENT", { id: "profile_owner" });
      expect(canAccessAssessment(assessment, p, null)).toBe(true);
    });

    it("denies a logged-in client with neither a matching clientId nor a claim", () => {
      expect(canAccessAssessment(assessment, profile("CLIENT"), null)).toBe(false);
    });

    it("does not let a logged-in client bypass ownership using a resume token", () => {
      const stranger = profile("CLIENT", { id: "profile_stranger", clientId: "client_other" });
      expect(canAccessAssessment(assessment, stranger, "secret-token")).toBe(false);
    });
  });

  describe("anonymous", () => {
    it("allows a correct resume token", () => {
      expect(canAccessAssessment(assessment, null, "secret-token")).toBe(true);
    });

    it("denies an incorrect token", () => {
      expect(canAccessAssessment(assessment, null, "wrong-token")).toBe(false);
    });

    it("denies a missing token", () => {
      expect(canAccessAssessment(assessment, null, null)).toBe(false);
    });

    it("denies an empty-string token", () => {
      expect(canAccessAssessment(assessment, null, "")).toBe(false);
    });

    it("denies any token when the assessment has none stored", () => {
      const noToken = { ...assessment, resumeToken: null };
      expect(canAccessAssessment(noToken, null, "anything")).toBe(false);
    });

    it("denies when both the stored token and the supplied token are null", () => {
      const noToken = { ...assessment, resumeToken: null };
      expect(canAccessAssessment(noToken, null, null)).toBe(false);
    });
  });
});

describe("assertAccessAssessment", () => {
  it("returns silently when access is allowed", () => {
    expect(() => assertAccessAssessment(assessment, profile("ADMIN"), null)).not.toThrow();
  });

  it("throws a 403 AuthError when access is denied", () => {
    try {
      assertAccessAssessment(assessment, null, "wrong");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError);
      expect((error as AuthError).status).toBe(403);
    }
  });
});
