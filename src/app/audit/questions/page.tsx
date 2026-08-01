"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlowShell, FlowSkeleton } from "@/components/audit/FlowShell";
import { QuestionCard } from "@/components/audit/QuestionCard";
import { InlineMeter } from "@/components/charts/CategoryMeter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CATEGORIES, ORDERED_QUESTIONS, TOTAL_QUESTIONS } from "@/data/questionBank";
import { useAudit, useLiveScores } from "@/lib/audit/AuditProvider";
import { isAnswered } from "@/lib/audit/scoring";
import type { AnswerEntry } from "@/lib/audit/types";
import { hasErrors, validateBusiness } from "@/lib/audit/validation";
import { cn } from "@/lib/cn";

export default function QuestionnairePage() {
  const router = useRouter();
  const {
    ready,
    state,
    setAnswer,
    skipQuestion,
    setCurrentIndex,
    markCompleted,
    saveNow,
    saveStatus,
    answeredCount,
    skippedCount,
  } = useAudit();
  const live = useLiveScores();

  const [invalid, setInvalid] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const detailsIncomplete = ready && hasErrors(validateBusiness(state.business));
  useEffect(() => {
    if (detailsIncomplete) router.replace("/audit/business");
  }, [detailsIncomplete, router]);

  const index = Math.min(state.currentIndex, TOTAL_QUESTIONS - 1);
  const question = ORDERED_QUESTIONS[index];
  const entry = state.answers[question.id];
  const category = CATEGORIES.find((candidate) => candidate.id === question.categoryId)!;

  const positionInCategory = useMemo(() => {
    const withinCategory = ORDERED_QUESTIONS.filter(
      (candidate) => candidate.categoryId === question.categoryId
    );
    return {
      position: withinCategory.findIndex((candidate) => candidate.id === question.id) + 1,
      total: withinCategory.length,
    };
  }, [question]);

  const seen = answeredCount + skippedCount;
  const progress = Math.round((seen / TOTAL_QUESTIONS) * 100);
  const isLast = index === TOTAL_QUESTIONS - 1;
  const canAdvance = isAnswered(entry) || Boolean(entry?.skipped);

  const goNext = useCallback(() => {
    if (!canAdvance) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (isLast) {
      markCompleted();
      router.push("/report");
      return;
    }
    setCurrentIndex(index + 1);
  }, [canAdvance, isLast, index, markCompleted, router, setCurrentIndex]);

  const goPrevious = useCallback(() => {
    setInvalid(false);
    if (index === 0) {
      router.push("/audit/business");
      return;
    }
    setCurrentIndex(index - 1);
  }, [index, router, setCurrentIndex]);

  const handleAnswer = useCallback(
    (next: AnswerEntry) => {
      setInvalid(false);
      setAnswer(question.id, next);
    },
    [question.id, setAnswer]
  );

  const handleSkip = useCallback(() => {
    setInvalid(false);
    skipQuestion(question.id);
    if (isLast) {
      markCompleted();
      router.push("/report");
      return;
    }
    setCurrentIndex(index + 1);
  }, [index, isLast, markCompleted, question.id, router, setCurrentIndex, skipQuestion]);

  // Number keys select an option, arrows move between questions. Guarded so a
  // modifier combination or a focused text field is never intercepted.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goNext();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goPrevious();
        return;
      }

      const digit = Number.parseInt(event.key, 10);
      if (Number.isNaN(digit)) return;

      if (question.type === "CHOICE") {
        const option = question.options[digit - 1];
        if (option) {
          event.preventDefault();
          handleAnswer({ optionId: option.id });
        }
        return;
      }

      const min = question.scaleMin ?? 1;
      const max = question.scaleMax ?? 10;
      // 0 stands in for 10 on a 1–10 scale, matching the key row.
      const value = digit === 0 ? 10 : digit;
      if (value >= min && value <= max) {
        event.preventDefault();
        handleAnswer({ value });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [question, goNext, goPrevious, handleAnswer]);

  function handleSaveAndExit() {
    saveNow();
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
  }

  if (!ready || detailsIncomplete) {
    return (
      <FlowShell>
        <FlowSkeleton />
      </FlowShell>
    );
  }

  return (
    <FlowShell width="wide">
      <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
        <div>
          {/* ------------------------------------------------ progress header */}
          <div className="mb-6">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
                  {category.name}
                </p>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Question {positionInCategory.position} of {positionInCategory.total} in
                  this section
                </p>
              </div>
              <p className="tabular text-[13px] text-ink-secondary">
                <span className="font-semibold text-ink">{index + 1}</span> / {TOTAL_QUESTIONS}
              </p>
            </div>

            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface-raised"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Audit completion"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${Math.max(progress, 1)}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-ink-muted">
              <span>
                {answeredCount} answered
                {skippedCount > 0 ? ` · ${skippedCount} skipped` : ""}
              </span>
              <span aria-live="polite">
                {savedFlash
                  ? "Progress saved"
                  : saveStatus === "unavailable"
                    ? "Saving is unavailable in this browser"
                    : saveStatus === "saved"
                      ? "Saved automatically"
                      : ""}
              </span>
            </div>
          </div>

          {/* -------------------------------------------------------- question */}
          <Card className="p-5 sm:p-8">
            <QuestionCard
              key={question.id}
              question={question}
              entry={entry}
              onAnswer={handleAnswer}
              invalid={invalid}
            />
          </Card>

          {/* --------------------------------------------------------- actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <Button variant="secondary" size="md" onClick={goPrevious}>
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden fill="none">
                <path
                  d="M13 8H4m0 0 3.5-3.5M4 8l3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Previous
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="md" onClick={handleSkip}>
                Skip
              </Button>
              <Button size="md" onClick={goNext}>
                {isLast ? "Generate my report" : "Next"}
                {!isLast ? (
                  <svg viewBox="0 0 16 16" className="size-4" aria-hidden fill="none">
                    <path
                      d="M3 8h9m0 0-3.5-3.5M12 8l-3.5 3.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
            <p className="text-[12.5px] text-ink-muted">
              Tip: press <Kbd>1</Kbd>–<Kbd>9</Kbd> to answer, <Kbd>←</Kbd> <Kbd>→</Kbd> to
              move between questions.
            </p>
            <Button variant="ghost" size="sm" onClick={handleSaveAndExit}>
              Save progress
            </Button>
          </div>
        </div>

        {/* ------------------------------------------------------ live scores */}
        <aside className="lg:sticky lg:top-24">
          <Card className="p-5">
            <h3 className="text-[13px] font-semibold text-ink">Running score</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
              Updates as you answer. Skipped questions are excluded.
            </p>

            <p className="tabular mt-5 text-4xl font-semibold leading-none text-ink">
              {Math.round(live.overall)}
              <span className="ml-1 text-base font-normal text-ink-muted">/100</span>
            </p>

            <div className="mt-6 flex flex-col gap-3">
              {live.categoryScores.map((score) => (
                <InlineMeter
                  key={score.categoryId}
                  label={score.shortName}
                  value={score.score}
                  colorVar={score.answered > 0 ? score.colorVar : "var(--border-strong)"}
                />
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </FlowShell>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className={cn(
        "mx-0.5 inline-block rounded border border-hairline-strong bg-surface-raised",
        "px-1.5 py-0.5 font-mono text-[11px] text-ink-secondary"
      )}
    >
      {children}
    </kbd>
  );
}
