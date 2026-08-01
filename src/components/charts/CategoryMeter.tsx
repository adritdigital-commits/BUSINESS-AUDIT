import type { CategoryScore } from "@/lib/audit/scoring";
import { cn } from "@/lib/cn";

/**
 * A category's score as a meter. Severity is carried by the fill colour *and*
 * by the band label beside it, so the state survives colourblindness, print
 * and forced-colors. The unfilled track is a recessive surface step.
 */
export function CategoryMeter({
  category,
  className,
}: {
  category: CategoryScore;
  className?: string;
}) {
  const value = Math.round(category.score);

  return (
    <div className={cn("rounded-card border border-hairline bg-surface p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-ink">{category.name}</h4>
          <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-muted">
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: category.colorVar }}
            />
            {category.bandLabel}
            <span aria-hidden>·</span>
            {category.answered} of {category.total} answered
          </p>
        </div>
        <p className="tabular shrink-0 text-2xl font-semibold leading-none text-ink">
          {value}
          <span className="ml-0.5 text-sm font-normal text-ink-muted">/100</span>
        </p>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-surface-raised"
        role="meter"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${category.name} score`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(value, 1)}%`, backgroundColor: category.colorVar }}
        />
      </div>
    </div>
  );
}

/** Compact meter for dense lists — same encoding, less chrome. */
export function InlineMeter({
  label,
  value,
  colorVar,
  suffix,
}: {
  label: string;
  value: number;
  colorVar: string;
  suffix?: string;
}) {
  const rounded = Math.round(value);
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-[13px] text-ink-secondary">{label}</span>
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
      <span className="tabular w-12 shrink-0 text-right text-[13px] font-medium text-ink">
        {rounded}
        {suffix}
      </span>
    </div>
  );
}
