"use client";

import { cn } from "@/lib/cn";
import type { AnswerEntry, Question } from "@/lib/audit/types";

/**
 * A single question. CHOICE renders as a radio group; SCALE renders as a
 * discrete 1–10 group with its ends labelled — both are real radio groups, so
 * arrow-key navigation and screen readers behave as expected.
 */
export function QuestionCard({
  question,
  entry,
  onAnswer,
  invalid,
}: {
  question: Question;
  entry: AnswerEntry | undefined;
  onAnswer: (entry: AnswerEntry) => void;
  invalid: boolean;
}) {
  const skipped = Boolean(entry?.skipped);

  return (
    <div>
      <h2 className="text-[clamp(1.25rem,3vw,1.6rem)] font-semibold leading-snug text-ink">
        {question.text}
      </h2>
      {question.help ? (
        <p className="mt-3 max-w-prose text-[14.5px] leading-relaxed text-ink-secondary">
          {question.help}
        </p>
      ) : null}

      {skipped ? (
        <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-hairline-strong px-3 py-1.5 text-[12.5px] text-ink-muted">
          Skipped — it will not count towards your score. Pick an answer to include it.
        </p>
      ) : null}

      <div className="mt-7">
        {question.type === "CHOICE" ? (
          <ChoiceInput question={question} entry={entry} onAnswer={onAnswer} />
        ) : (
          <ScaleInput question={question} entry={entry} onAnswer={onAnswer} />
        )}
      </div>

      <p
        role="alert"
        aria-live="polite"
        className={cn(
          "mt-4 text-[13px] transition-opacity",
          invalid ? "text-critical opacity-100" : "opacity-0"
        )}
      >
        {invalid ? "Choose an answer, or use Skip to leave this one out." : " "}
      </p>
    </div>
  );
}

function ChoiceInput({
  question,
  entry,
  onAnswer,
}: {
  question: Question;
  entry: AnswerEntry | undefined;
  onAnswer: (entry: AnswerEntry) => void;
}) {
  return (
    <div role="radiogroup" aria-label={question.text} className="flex flex-col gap-2.5">
      {question.options.map((option, index) => {
        const selected = !entry?.skipped && entry?.optionId === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onAnswer({ optionId: option.id })}
            className={cn(
              "group flex w-full items-center gap-3.5 rounded-xl border px-4 py-4 text-left",
              "transition-[border-color,background-color] duration-150",
              selected
                ? "border-accent/70 bg-accent/[0.08]"
                : "border-hairline-strong bg-surface hover:border-white/25 hover:bg-white/[0.03]"
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-md border text-[11px] font-semibold",
                selected
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-hairline-strong text-ink-muted"
              )}
            >
              {selected ? "✓" : index + 1}
            </span>
            <span className="text-[15px] leading-snug text-ink">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ScaleInput({
  question,
  entry,
  onAnswer,
}: {
  question: Question;
  entry: AnswerEntry | undefined;
  onAnswer: (entry: AnswerEntry) => void;
}) {
  const min = question.scaleMin ?? 1;
  const max = question.scaleMax ?? 10;
  const values = Array.from({ length: max - min + 1 }, (_, index) => min + index);

  return (
    <div role="radiogroup" aria-label={question.text}>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {values.map((value) => {
          const selected = !entry?.skipped && entry?.value === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${value} out of ${max}`}
              onClick={() => onAnswer({ value })}
              className={cn(
                "tabular h-12 rounded-lg border text-[15px] font-medium",
                "transition-[border-color,background-color,color] duration-150",
                selected
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-hairline-strong bg-surface text-ink-secondary hover:border-white/25 hover:text-ink"
              )}
            >
              {value}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-[12.5px] text-ink-muted">
        <span>{question.scaleLowLabel ?? "Poor"}</span>
        <span>{question.scaleHighLabel ?? "Excellent"}</span>
      </div>
    </div>
  );
}
