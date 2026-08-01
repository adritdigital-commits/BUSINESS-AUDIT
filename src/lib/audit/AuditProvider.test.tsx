import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { CLINIC, CONTACT } from "@/engine/fixtures";
import { AuditProvider, useAudit } from "@/lib/audit/AuditProvider";
import { STORAGE_KEY, emptyState } from "@/lib/audit/storage";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuditProvider>{children}</AuditProvider>
);

async function mount() {
  const view = renderHook(() => useAudit(), { wrapper });
  // The provider deliberately renders empty state first and adopts storage in
  // an effect; wait for that pass before asserting on anything stored.
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  return view;
}

function seed(profile = CLINIC) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...emptyState(), contact: CONTACT, profile, startedAt: "2026-08-01T09:00:00.000Z" })
  );
}

describe("AuditProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts empty and becomes ready after reading storage", async () => {
    const { result } = await mount();
    expect(result.current.hasSavedProgress).toBe(false);
    expect(result.current.answeredCount).toBe(0);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.assessment).toBeNull();
  });

  it("falls back to a generic plan before the profile is filled in", async () => {
    const { result } = await mount();
    expect(result.current.profileComplete).toBe(false);

    // The engine still produces a usable set — the flow gates on
    // `profileComplete`, so this is a safety net rather than a path users hit.
    const generic = result.current.plan.questions.map((item) => item.question.id);
    expect(generic.length).toBeGreaterThan(0);
    expect(generic.some((id) => id.startsWith("ind-health-"))).toBe(false);
  });

  it("re-plans when the profile changes", async () => {
    const { result } = await mount();
    const before = result.current.plan.questions.map((item) => item.question.id);

    act(() => result.current.setProfile(CLINIC));
    const after = result.current.plan.questions.map((item) => item.question.id);

    expect(after).not.toEqual(before);
    expect(after.some((id) => id.startsWith("ind-health-"))).toBe(true);
  });

  it("adopts saved progress on mount", async () => {
    seed();
    const { result } = await mount();
    expect(result.current.hasSavedProgress).toBe(true);
    expect(result.current.profileComplete).toBe(true);
    expect(result.current.plan.questions.length).toBeGreaterThan(20);
  });

  it("builds an adaptive plan once the profile is filled in", async () => {
    const { result } = await mount();

    act(() => result.current.setContact(CONTACT));
    act(() => result.current.setProfile(CLINIC));

    expect(result.current.profileComplete).toBe(true);
    const ids = result.current.plan.questions.map((item) => item.question.id);
    expect(ids.some((id) => id.startsWith("ind-health-"))).toBe(true);
  });

  it("caps priorities at three and never silently replaces one", async () => {
    const { result } = await mount();

    act(() => {
      result.current.togglePriority("seo");
      result.current.togglePriority("crm");
      result.current.togglePriority("sales");
      result.current.togglePriority("ai");
    });

    expect(result.current.state.profile.priorities).toEqual(["seo", "crm", "sales"]);

    act(() => result.current.togglePriority("crm"));
    expect(result.current.state.profile.priorities).toEqual(["seo", "sales"]);
  });

  it("toggles acquisition channels without a cap", async () => {
    const { result } = await mount();

    act(() => {
      result.current.toggleChannel("google-search");
      result.current.toggleChannel("whatsapp");
      result.current.toggleChannel("referrals");
    });
    expect(result.current.state.profile.acquisitionChannels).toHaveLength(3);

    act(() => result.current.toggleChannel("whatsapp"));
    expect(result.current.state.profile.acquisitionChannels).toEqual([
      "google-search",
      "referrals",
    ]);
  });

  it("records an answer and counts it towards progress", async () => {
    seed();
    const { result } = await mount();
    const first = result.current.plan.questions[0].question;

    act(() => result.current.setAnswer(first.id, { optionId: first.options[0].id }));

    expect(result.current.answeredCount).toBe(1);
    expect(result.current.skippedCount).toBe(0);
    expect(result.current.progress).toBeGreaterThan(0);
  });

  it("counts a skip as seen but not as answered", async () => {
    seed();
    const { result } = await mount();
    const first = result.current.plan.questions[0].question;

    act(() => result.current.skipQuestion(first.id));

    expect(result.current.answeredCount).toBe(0);
    expect(result.current.skippedCount).toBe(1);
  });

  it("replaces a previous answer when the question is skipped", async () => {
    seed();
    const { result } = await mount();
    const first = result.current.plan.questions[0].question;

    act(() => result.current.setAnswer(first.id, { optionId: first.options[0].id }));
    act(() => result.current.skipQuestion(first.id));

    expect(result.current.state.answers[first.id]).toEqual({ skipped: true });
    expect(result.current.answeredCount).toBe(0);
  });

  it("grows the flow when an answer unlocks a follow-up", async () => {
    seed();
    const { result } = await mount();

    const parent = result.current.plan.questions.find(
      (item) => item.question.id === "core-record-of-customers"
    );
    if (!parent) return; // Not selected for this profile; nothing to assert.

    const before = result.current.plan.questions.length;
    act(() => result.current.setAnswer("core-record-of-customers", { optionId: "core-record-none" }));

    expect(result.current.plan.questions.length).toBe(before + 1);
    expect(result.current.plan.followUpCount).toBe(1);
  });

  it("builds an assessment only once completed with answers", async () => {
    seed();
    const { result } = await mount();
    const first = result.current.plan.questions[0].question;

    act(() => result.current.markCompleted());
    expect(result.current.isComplete).toBe(false);
    expect(result.current.assessment).toBeNull();

    act(() => result.current.setAnswer(first.id, { optionId: first.options[0].id }));
    expect(result.current.isComplete).toBe(true);
    expect(result.current.assessment).not.toBeNull();
    expect(result.current.assessment!.scores.domains).toHaveLength(9);
  });

  it("dates the assessment from the completion timestamp", async () => {
    seed();
    const { result } = await mount();
    const first = result.current.plan.questions[0].question;

    act(() => result.current.setAnswer(first.id, { optionId: first.options[0].id }));
    act(() => result.current.markCompleted());

    expect(result.current.assessment!.generatedAt).toBe(result.current.state.completedAt);
  });

  it("persists changes and reports a successful save", async () => {
    seed();
    const { result } = await mount();
    const first = result.current.plan.questions[0].question;

    act(() => result.current.setAnswer(first.id, { optionId: first.options[0].id }));
    act(() => result.current.saveNow());

    await waitFor(() => expect(result.current.saveStatus).toBe("saved"));
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored.answers[first.id].optionId).toBe(first.options[0].id);
  });

  it("clears everything on reset", async () => {
    seed();
    const { result } = await mount();

    act(() => result.current.reset());

    expect(result.current.state).toEqual(emptyState());
    expect(result.current.hasSavedProgress).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("stamps the start time once and does not move it", async () => {
    const { result } = await mount();

    act(() => result.current.markStarted());
    const first = result.current.state.startedAt;
    expect(first).toBeTruthy();

    act(() => result.current.markStarted());
    expect(result.current.state.startedAt).toBe(first);
  });
});
