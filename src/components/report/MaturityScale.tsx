import type { MaturityLevel } from "@/engine/scoreEngine";
import { cn } from "@/lib/cn";

const STAGES = ["Nascent", "Emerging", "Established", "Advanced", "Leading"];

/** Five-stage ladder with the current stage named, not just coloured. */
export function MaturityScale({ maturity }: { maturity: MaturityLevel }) {
  return (
    <div>
      <ol className="flex gap-1.5" aria-label="Maturity stage">
        {STAGES.map((stage, index) => {
          const reached = index < maturity.step;
          const current = index === maturity.step - 1;
          return (
            <li key={stage} className="flex-1">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  reached ? "bg-accent" : "bg-surface-raised"
                )}
                aria-hidden
              />
              <p
                className={cn(
                  "mt-2 text-[11px] leading-tight",
                  current ? "font-semibold text-ink" : "text-ink-muted"
                )}
              >
                {stage}
                {current ? <span className="sr-only"> — current stage</span> : null}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
