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
import { runAssessment, type Assessment } from "@/engine";
import { isProfileComplete, PRIORITY_PICK_COUNT } from "@/engine/businessProfile";
import { planAssessment, type AssessmentPlan } from "@/engine/questionEngine";
import { isAnswered } from "@/engine/scoreEngine";
import {
  clearState,
  emptyState,
  loadState,
  saveState,
  type AuditState,
} from "@/lib/audit/storage";
import type {
  AnswerEntry,
  BusinessProfile,
  ContactDetails,
  PriorityGoal,
} from "@/engine/types";

/**
 * Single source of truth for the assessment in progress.
 *
 * The provider holds state and persistence only. Every rule — which questions
 * to ask, what they score, what to recommend — lives in `src/engine`, and is
 * called from here as a pure function. Nothing in the React tree decides
 * anything about the assessment itself.
 *
 * Hydration contract: the provider always renders `emptyState()` on the server
 * and on the first client render, and only adopts saved progress inside an
 * effect. `ready` tells consumers which of the two they are looking at.
 */

export type SaveStatus = "idle" | "saving" | "saved" | "unavailable";

interface AuditContextValue {
  state: AuditState;
  ready: boolean;
  saveStatus: SaveStatus;
  hasSavedProgress: boolean;

  setContact: (patch: Partial<ContactDetails>) => void;
  setProfile: (patch: Partial<BusinessProfile>) => void;
  toggleChannel: (channel: BusinessProfile["acquisitionChannels"][number]) => void;
  togglePriority: (goal: PriorityGoal) => void;

  setAnswer: (questionId: string, entry: AnswerEntry) => void;
  skipQuestion: (questionId: string) => void;
  setCurrentIndex: (index: number) => void;
  markStarted: () => void;
  markCompleted: () => void;
  saveNow: () => void;
  reset: () => void;

  /** The live, adaptive question flow for the current profile and answers. */
  plan: AssessmentPlan;
  profileComplete: boolean;
  answeredCount: number;
  skippedCount: number;
  progress: number;
  isComplete: boolean;
  /** Null until the assessment is finished. */
  assessment: Assessment | null;
}

const AuditContext = createContext<AuditContextValue | null>(null);

export function AuditProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuditState>(emptyState);
  const [ready, setReady] = useState(false);
  const [hasSavedProgress, setHasSavedProgress] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

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

  const setContact = useCallback((patch: Partial<ContactDetails>) => {
    setState((prev) => ({ ...prev, contact: { ...prev.contact, ...patch } }));
  }, []);

  const setProfile = useCallback((patch: Partial<BusinessProfile>) => {
    setState((prev) => ({ ...prev, profile: { ...prev.profile, ...patch } }));
  }, []);

  const toggleChannel = useCallback(
    (channel: BusinessProfile["acquisitionChannels"][number]) => {
      setState((prev) => {
        const current = prev.profile.acquisitionChannels;
        const next = current.includes(channel)
          ? current.filter((value) => value !== channel)
          : [...current, channel];
        return { ...prev, profile: { ...prev.profile, acquisitionChannels: next } };
      });
    },
    []
  );

  const togglePriority = useCallback((goal: PriorityGoal) => {
    setState((prev) => {
      const current = prev.profile.priorities;
      if (current.includes(goal)) {
        return {
          ...prev,
          profile: { ...prev.profile, priorities: current.filter((value) => value !== goal) },
        };
      }
      // Selecting a fourth is a no-op rather than a silent replacement — the
      // form tells the user to deselect one, so nothing disappears unexplained.
      if (current.length >= PRIORITY_PICK_COUNT) return prev;
      return { ...prev, profile: { ...prev.profile, priorities: [...current, goal] } };
    });
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
    setState((prev) => ({ ...prev, currentIndex: Math.max(index, 0) }));
  }, []);

  const markStarted = useCallback(() => {
    setState((prev) => (prev.startedAt ? prev : { ...prev, startedAt: new Date().toISOString() }));
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

  const profileComplete = useMemo(() => isProfileComplete(state.profile), [state.profile]);

  // Re-planned on every answer: an answer can unlock a follow-up or make a
  // later question irrelevant. Deterministic and pinned, so already-answered
  // questions never disappear.
  const plan = useMemo(
    () => planAssessment(state.profile, state.answers),
    [state.profile, state.answers]
  );

  const { answeredCount, skippedCount } = useMemo(() => {
    let answered = 0;
    let skipped = 0;
    for (const item of plan.questions) {
      const entry = state.answers[item.question.id];
      if (isAnswered(entry)) answered += 1;
      else if (entry?.skipped) skipped += 1;
    }
    return { answeredCount: answered, skippedCount: skipped };
  }, [plan, state.answers]);

  const isComplete = Boolean(state.completedAt) && answeredCount > 0;

  const assessment = useMemo(() => {
    if (!isComplete) return null;
    return runAssessment({
      contact: state.contact,
      profile: state.profile,
      answers: state.answers,
      generatedAt: state.completedAt ?? undefined,
    });
  }, [isComplete, state.contact, state.profile, state.answers, state.completedAt]);

  const total = plan.questions.length;

  const value = useMemo<AuditContextValue>(
    () => ({
      state,
      ready,
      saveStatus,
      hasSavedProgress,
      setContact,
      setProfile,
      toggleChannel,
      togglePriority,
      setAnswer,
      skipQuestion,
      setCurrentIndex,
      markStarted,
      markCompleted,
      saveNow,
      reset,
      plan,
      profileComplete,
      answeredCount,
      skippedCount,
      progress: total ? Math.round(((answeredCount + skippedCount) / total) * 100) : 0,
      isComplete,
      assessment,
    }),
    [
      state,
      ready,
      saveStatus,
      hasSavedProgress,
      setContact,
      setProfile,
      toggleChannel,
      togglePriority,
      setAnswer,
      skipQuestion,
      setCurrentIndex,
      markStarted,
      markCompleted,
      saveNow,
      reset,
      plan,
      profileComplete,
      answeredCount,
      skippedCount,
      total,
      isComplete,
      assessment,
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
