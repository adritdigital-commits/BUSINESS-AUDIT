"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * The journey, made visible. Steps are derived from the route rather than
 * from component state, so a refresh or a direct link never shows the wrong
 * position.
 */
const STEPS = [
  { href: "/audit/client", label: "Your details" },
  { href: "/audit/business", label: "Your business" },
  { href: "/audit/questions", label: "35 questions" },
  { href: "/report", label: "Report" },
  { href: "/proposal", label: "Proposal" },
] as const;

export function FlowStepper() {
  const pathname = usePathname();
  const currentIndex = Math.max(
    STEPS.findIndex((step) => pathname.startsWith(step.href)),
    0
  );

  return (
    <nav aria-label="Audit progress" className="w-full">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[12.5px]">
        {STEPS.map((step, index) => {
          const state =
            index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
          return (
            <li key={step.href} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors",
                  state === "current" && "border-accent/50 bg-accent/10 text-accent",
                  state === "done" && "border-hairline-strong text-ink-secondary",
                  state === "upcoming" && "border-hairline text-ink-muted"
                )}
                aria-current={state === "current" ? "step" : undefined}
              >
                <span
                  className={cn(
                    "grid size-4 place-items-center rounded-full text-[10px] font-semibold",
                    state === "current" && "bg-accent text-accent-ink",
                    state === "done" && "bg-white/15 text-ink",
                    state === "upcoming" && "bg-white/[0.06] text-ink-muted"
                  )}
                  aria-hidden
                >
                  {state === "done" ? "✓" : index + 1}
                </span>
                {step.label}
              </span>
              {index < STEPS.length - 1 ? (
                <span aria-hidden className="hidden h-px w-4 bg-hairline-strong sm:block" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
