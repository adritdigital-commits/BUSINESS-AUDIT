"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlowShell, FlowSkeleton } from "@/components/audit/FlowShell";
import { QuestionCard } from "@/components/audit/QuestionCard";
import { InlineMeter } from "@/components/charts/DomainMeter";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { scoreAssessment } from "@/engine/scoreEngine";
import type { AnswerEntry } from "@/engine/types";
import { useAudit } from "@/lib/audit/AuditProvider";
import { hasErrors, validateProfile } from "@/lib/audit/validation";
import { cn } from "@/lib/cn";

export default function QuestionnairePage() {
  const router = useRouter();
  const {
    ready,
    state,
    plan,
    setAnswer,
    skipQuestion,
    setCurrentIndex,
    markCompleted,
    saveNow,
    saveStatus,
    answeredCount,
    skippedCount,
  } = useAudit();

  const [invalid, setInvalid] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const profileIncomplete = ready && hasErrors(validateProfile(state.profile));
  useEffect(() => {
    if (profileIncomplete) router.replace("/audit/business");
  }, [profileIncomplete, router]);

  const total = plan.questions.length;
  // The flow can grow when an answer unlocks a follow-up, so the index is
  // clamped on read rather than trusted from storage.
  const index = Math.min(state.currentIndex, Math.max(total - 1, 0));
  const item = plan.questions[index];

  // Live scores use the same engine the report does — there is no second
  // calculation to drift.
  const live = useMemo(
    () => scoreAssessment({ profile: state.profile, answers: state.answers, plan }),
    [state.profile, state.answers, plan]
  );

  const entry = item ? state.answers[item.question.id] : undefined;
  const seen = answeredCount + skippedCount;
  const progress = total ? Math.round((seen / total) * 100) : 0;
  const isLast = index >= total - 1;
  const canAdvance = Boolean(entry?.optionId) || Boolean(entry?.skipped);

  const sectionPosition = useMemo(() => {
    if (!item) return { position: 0, count: 0 };
    const inSection = plan.questions.filter(
      (candidate) => candidate.sectionName === item.sectionName
    );
    return {
      position: inSection.findIndex((candidate) => candidate.question.id === item.question.id) + 1,
      count: inSection.length,
    };
  }, [item, plan]);

  const finish = useCallback(() => {
    markCompleted();
    router.push("/report");
  }, [markCompleted, router]);

  const goNext = useCallback(() => {
    if (!canAdvance) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (isLast) {
      finish();
      return;
    }
    setCurrentIndex(index + 1);
  }, [canAdvance, isLast, index, finish, setCurrentIndex]);

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
      if (!item) return;
      setInvalid(false);
      setAnswer(item.question.id, next);
    },
    [item, setAnswer]
  );

  const handleSkip = useCallback(() => {
    if (!item) return;
    setInvalid(false);
    skipQuestion(item.question.id);
    if (isLast) {
      finish();
      return;
    }
    setCurrentIndex(index + 1);
  }, [item, isLast, index, finish, setCurrentIndex, skipQuestion]);

  // Number keys select an option, arrows move between questions. Guarded so a
  // modifier combination or a focused field is never intercepted.
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
      if (Number.isNaN(digit) || !item) return;
      const option = item.question.options[digit - 1];
      if (option) {
        event.preventDefault();
        handleAnswer({ optionId: option.id });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, goNext, goPrevious, handleAnswer]);

  function handleSaveAndExit() {
    saveNow();
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
  }

  if (!ready || profileIncomplete || !item) {
    return (
      <FlowShell>
        <FlowSkeleton label="Building your assessment" />
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
                  {item.sectionName}
                </p>
                <p className="mt-1 text-[13px] text-ink-muted">
                  Question {sectionPosition.position} of {sectionPosition.count} in this section
                </p>
              </div>
              <p className="tabular text-[13px] text-ink-secondary">
                <span className="font-semibold text-ink">{index + 1}</span> / {total}
              </p>
            </div>

            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface-raised"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Assessment completion"
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
                {plan.followUpCount > 0
                  ? ` · ${plan.followUpCount} follow-up${plan.followUpCount === 1 ? "" : "s"} unlocked`
                  : ""}
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
              key={item.question.id}
              item={item}
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
              Tip: press <Kbd>1</Kbd>–<Kbd>9</Kbd> to answer, <Kbd>←</Kbd> <Kbd>→</Kbd> to move.
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
              Weighted for your industry and priorities. Skipped questions are excluded.
            </p>

            <p className="tabular mt-5 text-4xl font-semibold leading-none text-ink">
              {Math.round(live.overall)}
              <span className="ml-1 text-base font-normal text-ink-muted">/100</span>
            </p>

            <div className="mt-6 flex flex-col gap-3">
              {live.domains
                .filter((domain) => domain.asked > 0)
                .map((domain) => (
                  <InlineMeter
                    key={domain.domainId}
                    label={domain.shortName}
                    value={domain.score}
                    colorVar={
                      domain.notAssessed ? "var(--border-strong)" : domain.colorVar
                    }
                    muted={domain.notAssessed}
                  />
                ))}
            </div>

            <div className="mt-6 border-t border-hairline pt-4">
              <p className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">
                Assessed for
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {plan.injectedTopics.slice(0, 4).map((topic) => (
                  <Badge key={topic} className="text-[11px]">
                    {topic}
                  </Badge>
                ))}
              </div>
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
