import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { ORDERED_QUESTIONS, TOTAL_QUESTIONS } from "@/data/questionBank";
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

describe("AuditProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts empty and becomes ready after reading storage", async () => {
    const { result } = await mount();

    expect(result.current.hasSavedProgress).toBe(false);
    expect(result.current.answeredCount).toBe(0);
    expect(result.current.progress).toBe(0);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.report).toBeNull();
  });

  it("adopts saved progress on mount", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...emptyState(),
        answers: { "web-presence": { optionId: "web-presence-none" } },
        currentIndex: 3,
        startedAt: "2026-08-01T09:00:00.000Z",
      })
    );

    const { result } = await mount();
    expect(result.current.hasSavedProgress).toBe(true);
    expect(result.current.answeredCount).toBe(1);
    expect(result.current.state.currentIndex).toBe(3);
  });

  it("records an answer and counts it towards progress", async () => {
    const { result } = await mount();

    act(() => result.current.setAnswer("web-presence", { optionId: "web-presence-dated" }));

    expect(result.current.answeredCount).toBe(1);
    expect(result.current.skippedCount).toBe(0);
    expect(result.current.state.answers["web-presence"]).toEqual({
      optionId: "web-presence-dated",
      skipped: false,
    });
  });

  it("counts a skip as seen but not as answered", async () => {
    const { result } = await mount();

    act(() => result.current.skipQuestion("web-presence"));

    expect(result.current.answeredCount).toBe(0);
    expect(result.current.skippedCount).toBe(1);
    expect(result.current.progress).toBe(Math.round((1 / TOTAL_QUESTIONS) * 100));
  });

  it("replaces a previous answer when the question is skipped", async () => {
    const { result } = await mount();

    act(() => result.current.setAnswer("web-presence", { optionId: "web-presence-none" }));
    act(() => result.current.skipQuestion("web-presence"));

    expect(result.current.state.answers["web-presence"]).toEqual({ skipped: true });
    expect(result.current.answeredCount).toBe(0);
  });

  it("clamps the question index to the bank's bounds", async () => {
    const { result } = await mount();

    act(() => result.current.setCurrentIndex(-4));
    expect(result.current.state.currentIndex).toBe(0);

    act(() => result.current.setCurrentIndex(9999));
    expect(result.current.state.currentIndex).toBe(TOTAL_QUESTIONS - 1);
  });

  it("stamps the start time once and does not move it", async () => {
    const { result } = await mount();

    act(() => result.current.markStarted());
    const first = result.current.state.startedAt;
    expect(first).toBeTruthy();

    act(() => result.current.markStarted());
    expect(result.current.state.startedAt).toBe(first);
  });

  it("builds a report only once the audit is completed with answers", async () => {
    const { result } = await mount();

    act(() => result.current.markCompleted());
    // Completed but empty is not a report worth showing.
    expect(result.current.isComplete).toBe(false);
    expect(result.current.report).toBeNull();

    act(() => result.current.setAnswer("web-presence", { optionId: "web-presence-none" }));
    expect(result.current.isComplete).toBe(true);
    expect(result.current.report).not.toBeNull();
    expect(result.current.report!.recommendations.length).toBeGreaterThan(0);
  });

  it("dates the report from the completion timestamp, not from render time", async () => {
    const { result } = await mount();

    act(() => result.current.setAnswer("web-presence", { optionId: "web-presence-none" }));
    act(() => result.current.markCompleted());

    expect(result.current.report!.generatedAt).toBe(result.current.state.completedAt);
  });

  it("persists changes and reports a successful save", async () => {
    const { result } = await mount();

    act(() => result.current.setAnswer("web-presence", { optionId: "web-presence-none" }));
    act(() => result.current.saveNow());

    await waitFor(() => expect(result.current.saveStatus).toBe("saved"));
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)!);
    expect(stored.answers["web-presence"].optionId).toBe("web-presence-none");
  });

  it("clears everything on reset", async () => {
    const { result } = await mount();

    act(() => result.current.setClient({ fullName: "Priya Sharma" }));
    act(() => result.current.setBusiness({ businessName: "Northline Interiors" }));
    act(() => result.current.setAnswer("web-presence", { optionId: "web-presence-none" }));
    act(() => result.current.reset());

    expect(result.current.state).toEqual(emptyState());
    expect(result.current.hasSavedProgress).toBe(false);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("reaches 100% progress once every question has been seen", async () => {
    const { result } = await mount();

    act(() => {
      for (const question of ORDERED_QUESTIONS) {
        if (question.type === "SCALE") result.current.setAnswer(question.id, { value: 8 });
        else result.current.setAnswer(question.id, { optionId: question.options[0].id });
      }
    });

    expect(result.current.answeredCount).toBe(TOTAL_QUESTIONS);
    expect(result.current.progress).toBe(100);
  });
});
