import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** The one surface treatment used across the product. */
export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag
      className={cn(
        "rounded-card border border-hairline bg-surface shadow-lift",
        className
      )}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-hairline p-5 sm:p-6">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="text-base font-semibold text-ink sm:text-lg">{title}</h3>
        {description ? (
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
