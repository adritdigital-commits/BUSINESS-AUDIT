import type { DomainScore } from "@/engine/scoreEngine";
import { cn } from "@/lib/cn";

/**
 * A capability domain's score as a meter. Severity is carried by the fill
 * colour *and* by the band label beside it, so state survives colourblindness,
 * print and forced-colors. The unfilled track is a recessive surface step.
 */
export function DomainMeter({
  domain,
  className,
  showWeight = true,
}: {
  domain: DomainScore;
  className?: string;
  showWeight?: boolean;
}) {
  const value = Math.round(domain.score);

  return (
    <div className={cn("rounded-card border border-hairline bg-surface p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-ink">{domain.name}</h4>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-ink-muted">
            {domain.notAssessed ? (
              <span>Not assessed</span>
            ) : (
              <>
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: domain.colorVar }}
                />
                {domain.bandLabel}
                <span aria-hidden>·</span>
                {domain.answered} of {domain.asked} answered
                {showWeight ? (
                  <>
                    <span aria-hidden>·</span>
                    <span className="tabular">weight ×{domain.weight}</span>
                  </>
                ) : null}
              </>
            )}
          </p>
        </div>
        <p className="tabular shrink-0 text-2xl font-semibold leading-none text-ink">
          {domain.notAssessed ? "—" : value}
          {domain.notAssessed ? null : (
            <span className="ml-0.5 text-sm font-normal text-ink-muted">/100</span>
          )}
        </p>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-surface-raised"
        role="meter"
        aria-valuenow={domain.notAssessed ? 0 : value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${domain.name} score`}
      >
        {domain.notAssessed ? null : (
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(value, 1)}%`, backgroundColor: domain.colorVar }}
          />
        )}
      </div>
    </div>
  );
}

/** Compact meter for dense lists — same encoding, less chrome. */
export function InlineMeter({
  label,
  value,
  colorVar,
  muted = false,
}: {
  label: string;
  value: number;
  colorVar: string;
  muted?: boolean;
}) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 truncate text-[13px] text-ink-secondary">{label}</span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-raised"
        role="meter"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(rounded, 1)}%`, backgroundColor: colorVar }}
        />
      </div>
      <span
        className={cn(
          "tabular w-8 shrink-0 text-right text-[13px] font-medium",
          muted ? "text-ink-muted" : "text-ink"
        )}
      >
        {muted ? "—" : rounded}
      </span>
    </div>
  );
}
