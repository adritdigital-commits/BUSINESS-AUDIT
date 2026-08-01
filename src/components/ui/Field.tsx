"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-xl border bg-surface-sunken px-4 text-[15px] text-ink " +
  "placeholder:text-ink-muted transition-colors duration-150 " +
  "hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-accent/60 focus:border-accent/60";

function Label({ htmlFor, children, optional }: { htmlFor: string; children: string; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-ink">
      {children}
      {optional ? <span className="ml-1.5 font-normal text-ink-muted">(optional)</span> : null}
    </label>
  );
}

function Error({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-[13px] text-critical">
      {message}
    </p>
  );
}

export function TextField({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  optional,
  autoComplete,
  inputMode,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  type?: "text" | "email" | "tel" | "url";
  optional?: boolean;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "url";
  hint?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div>
      <Label htmlFor={id} optional={optional}>
        {label}
      </Label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={cn(CONTROL, "h-12", error ? "border-critical/70" : "border-hairline-strong")}
      />
      {hint && !error ? (
        <p id={hintId} className="mt-2 text-[13px] text-ink-muted">
          {hint}
        </p>
      ) : null}
      <Error id={errorId} message={error} />
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  placeholder = "Select one",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  error?: string;
  placeholder?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <select
          id={id}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            CONTROL,
            "h-12 appearance-none pr-11",
            error ? "border-critical/70" : "border-hairline-strong",
            value ? "text-ink" : "text-ink-muted"
          )}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option} className="bg-surface text-ink">
              {option}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </div>
      <Error id={errorId} message={error} />
    </div>
  );
}
