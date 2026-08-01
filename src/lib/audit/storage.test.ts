import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  STORAGE_KEY,
  clearState,
  emptyState,
  loadState,
  saveState,
} from "@/lib/audit/storage";

describe("audit storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("round-trips a complete state", () => {
    const state = emptyState();
    state.contact.fullName = "Priya Sharma";
    state.profile.businessName = "Northline Interiors";
    state.profile.industry = "healthcare";
    state.profile.acquisitionChannels = ["whatsapp", "referrals"];
    state.profile.priorities = ["more-leads", "crm", "seo"];
    state.answers = { "web-dependency": { optionId: "web-dependency-none" } };
    state.currentIndex = 4;
    state.startedAt = "2026-08-01T09:00:00.000Z";

    expect(saveState(state)).toBe(true);
    expect(loadState()).toEqual(state);
  });

  it("returns null when nothing has been stored", () => {
    expect(loadState()).toBeNull();
  });

  it("returns null rather than throwing on malformed JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadState()).toBeNull();
  });

  it("discards a payload written by a different schema version", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...emptyState(), version: 99 })
    );
    expect(loadState()).toBeNull();
  });

  it("drops unknown and wrongly-typed detail fields", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...emptyState(),
        contact: { fullName: "Priya", email: 42, unexpected: "value" },
      })
    );

    const loaded = loadState()!;
    expect(loaded.contact.fullName).toBe("Priya");
    expect(loaded.contact.email).toBe("");
    expect(loaded.contact).not.toHaveProperty("unexpected");
  });

  it("drops non-string entries from the multi-select profile fields", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...emptyState(),
        profile: {
          businessName: "Northline",
          acquisitionChannels: ["whatsapp", 7, "whatsapp", null],
          priorities: "not-an-array",
        },
      })
    );

    const loaded = loadState()!;
    expect(loaded.profile.acquisitionChannels).toEqual(["whatsapp"]);
    expect(loaded.profile.priorities).toEqual([]);
    expect(loaded.profile.businessName).toBe("Northline");
  });

  it("drops answers that carry no usable value", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...emptyState(),
        answers: {
          good: { optionId: "a" },
          skipped: { skipped: true },
          junk: { optionId: 5 },
          empty: {},
          notAnObject: "nope",
        },
      })
    );

    const loaded = loadState()!;
    expect(Object.keys(loaded.answers).sort()).toEqual(["good", "skipped"]);
    expect(loaded.answers.good).toEqual({ optionId: "a" });
  });

  it("clamps a negative or fractional question index", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...emptyState(), currentIndex: -12 })
    );
    expect(loadState()!.currentIndex).toBe(0);

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...emptyState(), currentIndex: 7.9 })
    );
    expect(loadState()!.currentIndex).toBe(7);
  });

  it("reports a failed write instead of throwing", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(saveState(emptyState())).toBe(false);
  });

  it("survives a blocked read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    expect(loadState()).toBeNull();
  });

  it("clears stored progress", () => {
    saveState(emptyState());
    clearState();
    expect(loadState()).toBeNull();
  });
});
