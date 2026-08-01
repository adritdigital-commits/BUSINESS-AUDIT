import type { ReactNode } from "react";
import { FlowStepper } from "@/components/layout/FlowStepper";
import { cn } from "@/lib/cn";

/** Shared chrome for every step of the audit journey. */
export function FlowShell({
  children,
  width = "narrow",
}: {
  children: ReactNode;
  width?: "narrow" | "wide";
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full px-5 pb-24 pt-8 sm:px-8 sm:pt-10",
        width === "narrow" ? "max-w-3xl" : "max-w-6xl"
      )}
    >
      <div className="no-print mb-10 overflow-x-auto pb-1">
        <FlowStepper />
      </div>
      {children}
    </main>
  );
}

export function StepHeading({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">{step}</p>
      <h1 className="mt-3 text-[clamp(1.6rem,4vw,2.25rem)] font-semibold leading-tight text-ink">
        {title}
      </h1>
      <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-secondary">
        {description}
      </p>
    </header>
  );
}

/**
 * Placeholder shown while saved progress is being read. It renders on the
 * server and on the first client pass alike, which is what keeps the flow
 * pages free of hydration mismatches.
 */
export function FlowSkeleton({ label = "Loading your audit" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-ink-muted"
    >
      <span
        aria-hidden
        className="size-6 animate-spin rounded-full border-2 border-hairline-strong border-t-accent"
      />
      <p className="text-sm">{label}</p>
    </div>
  );
}
