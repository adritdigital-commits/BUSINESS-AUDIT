"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ORDERED_QUESTIONS, TOTAL_QUESTIONS } from "@/data/questionBank";
import { buildReport, type Report } from "@/lib/audit/report";
import { computeScores, isAnswered } from "@/lib/audit/scoring";
import {
  clearState,
  emptyState,
  loadState,
  saveState,
  type AuditState,
} from "@/lib/audit/storage";
import type { AnswerEntry, BusinessDetails, ClientDetails } from "@/lib/audit/types";

/**
 * Single source of truth for the audit in progress.
 *
 * Hydration contract: the provider always renders `emptyState()` on the
 * server and on the first client render, and only adopts saved progress
 * inside an effect. `ready` tells consumers which of the two they are looking
 * at, so nothing that depends on stored data is rendered before the markup
 * has matched.
 */

export type SaveStatus = "idle" | "saving" | "saved" | "unavailable";

interface AuditContextValue {
  state: AuditState;
  ready: boolean;
  saveStatus: SaveStatus;
  /** True once storage has been read and something was actually in it. */
  hasSavedProgress: boolean;

  setClient: (patch: Partial<ClientDetails>) => void;
  setBusiness: (patch: Partial<BusinessDetails>) => void;
  setAnswer: (questionId: string, entry: AnswerEntry) => void;
  skipQuestion: (questionId: string) => void;
  setCurrentIndex: (index: number) => void;
  markStarted: () => void;
  markCompleted: () => void;
  saveNow: () => void;
  reset: () => void;

  answeredCount: number;
  skippedCount: number;
  progress: number;
  isComplete: boolean;
  report: Report | null;
}

const AuditContext = createContext<AuditContextValue | null>(null);

export function AuditProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuditState>(emptyState);
  const [ready, setReady] = useState(false);
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  // Cleared on unmount so a fast navigation never leaves a timer writing to
  // an unmounted component.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = loadState();
    if (stored) {
      setState(stored);
      setHasSavedProgress(Boolean(stored.startedAt) || Object.keys(stored.answers).length > 0);
    }
    setReady(true);
  }, []);

  // Autosave. Skipped until `ready`, otherwise the first render would
  // overwrite saved progress with the empty placeholder state.
  useEffect(() => {
    if (!ready) return;
    setSaveStatus("saving");

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setSaveStatus(saveState(state) ? "saved" : "unavailable");
    }, 250);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, ready]);

  const setClient = useCallback((patch: Partial<ClientDetails>) => {
    setState((prev) => ({ ...prev, client: { ...prev.client, ...patch } }));
  }, []);

  const setBusiness = useCallback((patch: Partial<BusinessDetails>) => {
    setState((prev) => ({ ...prev, business: { ...prev.business, ...patch } }));
  }, []);

  const setAnswer = useCallback((questionId: string, entry: AnswerEntry) => {
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: { ...entry, skipped: false } },
    }));
  }, []);

  const skipQuestion = useCallback((questionId: string) => {
    setState((prev) => ({
      ...prev,
      // A skip replaces any previous answer: leaving the old one behind would
      // score a question the client explicitly declined to answer.
      answers: { ...prev.answers, [questionId]: { skipped: true } },
    }));
  }, []);

  const setCurrentIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      currentIndex: Math.min(Math.max(index, 0), TOTAL_QUESTIONS - 1),
    }));
  }, []);

  const markStarted = useCallback(() => {
    setState((prev) =>
      prev.startedAt ? prev : { ...prev, startedAt: new Date().toISOString() }
    );
  }, []);

  const markCompleted = useCallback(() => {
    setState((prev) => ({ ...prev, completedAt: new Date().toISOString() }));
  }, []);

  const saveNow = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus(saveState(state) ? "saved" : "unavailable");
  }, [state]);

  const reset = useCallback(() => {
    clearState();
    setState(emptyState());
    setHasSavedProgress(false);
    setSaveStatus("idle");
  }, []);

  const { answeredCount, skippedCount } = useMemo(() => {
    let answered = 0;
    let skipped = 0;
    for (const question of ORDERED_QUESTIONS) {
      const entry = state.answers[question.id];
      if (isAnswered(entry)) answered += 1;
      else if (entry?.skipped) skipped += 1;
    }
    return { answeredCount: answered, skippedCount: skipped };
  }, [state.answers]);

  const isComplete = Boolean(state.completedAt) && answeredCount > 0;

  const report = useMemo(() => {
    if (!isComplete) return null;
    return buildReport({
      answers: state.answers,
      client: state.client,
      business: state.business,
      generatedAt: state.completedAt ?? undefined,
    });
  }, [isComplete, state.answers, state.client, state.business, state.completedAt]);

  const value = useMemo<AuditContextValue>(
    () => ({
      state,
      ready,
      saveStatus,
      hasSavedProgress,
      setClient,
      setBusiness,
      setAnswer,
      skipQuestion,
      setCurrentIndex,
      markStarted,
      markCompleted,
      saveNow,
      reset,
      answeredCount,
      skippedCount,
      progress: TOTAL_QUESTIONS
        ? Math.round(((answeredCount + skippedCount) / TOTAL_QUESTIONS) * 100)
        : 0,
      isComplete,
      report,
    }),
    [
      state,
      ready,
      saveStatus,
      hasSavedProgress,
      setClient,
      setBusiness,
      setAnswer,
      skipQuestion,
      setCurrentIndex,
      markStarted,
      markCompleted,
      saveNow,
      reset,
      answeredCount,
      skippedCount,
      isComplete,
      report,
    ]
  );

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
}

export function useAudit(): AuditContextValue {
  const context = useContext(AuditContext);
  if (!context) {
    throw new Error("useAudit must be used inside <AuditProvider>");
  }
  return context;
}

/**
 * Live scores while the questionnaire is still in progress. Kept separate
 * from the provider so a component that only needs the running total does not
 * re-render on every keystroke in the details forms.
 */
export function useLiveScores() {
  const { state } = useAudit();
  return useMemo(() => computeScores(state.answers), [state.answers]);
}
