"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

interface Option<T extends string> {
  id: T;
  label: string;
  hint?: string;
}

function Legend({ children, hint }: { children: string; hint?: string }) {
  return (
    <legend className="mb-3 block text-sm font-medium text-ink">
      {children}
      {hint ? <span className="ml-2 font-normal text-ink-muted">{hint}</span> : null}
    </legend>
  );
}

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2.5 text-[13px] text-critical">
      {message}
    </p>
  );
}

const CHIP =
  "rounded-full border px-3.5 py-2 text-[13.5px] leading-none transition-colors duration-150 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";

/** Single-choice chips. Used where a dropdown would hide the options. */
export function ChipRadioGroup<T extends string>({
  label,
  hint,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  hint?: string;
  options: ReadonlyArray<Option<T>>;
  value: T | "";
  onChange: (value: T) => void;
  error?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <Legend hint={hint}>{label}</Legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.id)}
              className={cn(
                CHIP,
                selected
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-hairline-strong bg-surface text-ink-secondary hover:border-white/25 hover:text-ink"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <ErrorText id={errorId} message={error} />
    </fieldset>
  );
}

/**
 * Multi-choice chips, optionally capped.
 *
 * When the cap is reached the remaining options are disabled rather than
 * silently swapping one out — the user keeps control of what they picked.
 */
export function ChipCheckboxGroup<T extends string>({
  label,
  hint,
  options,
  values,
  onToggle,
  error,
  max,
}: {
  label: string;
  hint?: string;
  options: ReadonlyArray<Option<T>>;
  values: readonly T[];
  onToggle: (value: T) => void;
  error?: string;
  max?: number;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const atCap = max !== undefined && values.length >= max;

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <Legend hint={hint}>{label}</Legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = values.includes(option.id);
          const disabled = !selected && atCap;
          return (
            <button
              key={option.id}
              type="button"
              role="checkbox"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onToggle(option.id)}
              className={cn(
                CHIP,
                "inline-flex items-center gap-1.5",
                selected
                  ? "border-accent bg-accent text-accent-ink"
                  : disabled
                    ? "cursor-not-allowed border-hairline text-ink-muted opacity-45"
                    : "border-hairline-strong bg-surface text-ink-secondary hover:border-white/25 hover:text-ink"
              )}
            >
              {selected ? (
                <svg viewBox="0 0 12 12" className="size-3" aria-hidden fill="none">
                  <path
                    d="M2.5 6.5 5 9l4.5-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
              {option.label}
            </button>
          );
        })}
      </div>
      {max !== undefined ? (
        <p className="mt-2.5 text-[12.5px] text-ink-muted">
          {values.length} of {max} selected
          {atCap ? " — deselect one to change your choices." : ""}
        </p>
      ) : null}
      <ErrorText id={errorId} message={error} />
    </fieldset>
  );
}
