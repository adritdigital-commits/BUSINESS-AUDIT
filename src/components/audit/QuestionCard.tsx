"use client";

import { Badge } from "@/components/ui/Badge";
import type { PlannedQuestion } from "@/engine/questionEngine";
import type { AnswerEntry } from "@/engine/types";
import { cn } from "@/lib/cn";

/**
 * A single question, rendered as a real radio group so arrow-key navigation
 * and screen readers behave as expected.
 *
 * The card carries the reason the question was selected. In an adaptive
 * assessment that is not decoration — it is what stops a bespoke question set
 * feeling arbitrary.
 */
export function QuestionCard({
  item,
  entry,
  onAnswer,
  invalid,
}: {
  item: PlannedQuestion;
  entry: AnswerEntry | undefined;
  onAnswer: (entry: AnswerEntry) => void;
  invalid: boolean;
}) {
  const { question } = item;
  const skipped = Boolean(entry?.skipped);

  return (
    <div>
      {item.reason ? (
        <Badge tone={item.isFollowUp ? "accent" : "neutral"} className="mb-4">
          {item.reason}
        </Badge>
      ) : null}

      <h2 className="text-[clamp(1.25rem,3vw,1.6rem)] font-semibold leading-snug text-ink">
        {question.title}
      </h2>
      {question.description ? (
        <p className="mt-3 max-w-prose text-[14.5px] leading-relaxed text-ink-secondary">
          {question.description}
        </p>
      ) : null}

      {skipped ? (
        <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-hairline-strong px-3 py-1.5 text-[12.5px] text-ink-muted">
          Skipped — it will not count towards your score. Pick an answer to include it.
        </p>
      ) : null}

      <div
        role="radiogroup"
        aria-label={question.title}
        className="mt-7 flex flex-col gap-2.5"
      >
        {question.options.map((option, index) => {
          const selected = !skipped && entry?.optionId === option.id;
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

      <p
        role="alert"
        aria-live="polite"
        className={cn(
          "mt-4 text-[13px] transition-opacity",
          invalid ? "text-critical opacity-100" : "opacity-0"
        )}
      >
        {invalid ? "Choose an answer, or use Skip to leave this one out." : " "}
      </p>
    </div>
  );
}
