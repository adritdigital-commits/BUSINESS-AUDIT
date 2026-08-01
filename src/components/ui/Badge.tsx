import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Priority } from "@/engine/types";

/**
 * Status is never carried by colour alone: every badge renders its label, and
 * the severity variants pair the colour with a filled dot.
 */
export function Badge({
  children,
  className,
  tone = "neutral",
  dotColor,
}: {
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "accent" | "good" | "warning" | "critical";
  dotColor?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-hairline-strong text-ink-secondary",
    accent: "border-accent/40 bg-accent/10 text-accent",
    good: "border-good/40 bg-good/10 text-good",
    warning: "border-warning/40 bg-warning/10 text-warning",
    critical: "border-critical/40 bg-critical/10 text-critical",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        tones[tone],
        className
      )}
    >
      {dotColor ? (
        <span
          aria-hidden
          className="size-1.5 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      ) : null}
      {children}
    </span>
  );
}

const PRIORITY_TONE: Record<Priority, "critical" | "warning" | "good"> = {
  HIGH: "critical",
  MEDIUM: "warning",
  LOW: "good",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH: "High priority",
  MEDIUM: "Medium priority",
  LOW: "Low priority",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Badge>;
}
