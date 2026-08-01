"use client";

import Link from "next/link";
import { useAudit } from "@/lib/audit/AuditProvider";

/**
 * Rendered only once storage has been read, so the server markup and the
 * first client render agree and there is nothing to reconcile.
 */
export function ResumeBanner() {
  const { ready, hasSavedProgress, answeredCount, skippedCount, isComplete, plan, reset } =
    useAudit();

  if (!ready || !hasSavedProgress) return null;

  const seen = answeredCount + skippedCount;
  const href = isComplete ? "/report" : "/audit/questions";

  return (
    <div className="mx-auto mb-10 w-full max-w-3xl animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-accent/30 bg-accent/[0.07] px-5 py-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink">
            {isComplete ? "Your report is ready." : "You have an assessment in progress."}
          </p>
          <p className="mt-0.5 text-[13px] text-ink-secondary">
            {isComplete
              ? "Pick up where you left off, or start a fresh assessment."
              : `${seen} of ${plan.questions.length} questions answered. Progress is saved on this device.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-full px-3.5 py-2 text-[13px] text-ink-secondary transition-colors hover:bg-white/[0.06] hover:text-ink"
          >
            Start over
          </button>
          <Link
            prefetch={false}
            href={href}
            className="rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-accent-ink transition-[filter] hover:brightness-110"
          >
            {isComplete ? "View report" : "Continue"}
          </Link>
        </div>
      </div>
    </div>
  );
}
