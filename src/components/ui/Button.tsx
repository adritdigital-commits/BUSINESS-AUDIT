import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium " +
  "transition-[background-color,border-color,color,transform,opacity] duration-150 " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-40 " +
  "whitespace-nowrap select-none";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-[1.08] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset]",
  secondary:
    "bg-surface-raised text-ink border border-hairline-strong hover:border-white/30 hover:bg-white/[0.06]",
  ghost: "text-ink-secondary hover:text-ink hover:bg-white/[0.05]",
  danger: "text-critical border border-critical/40 hover:bg-critical/10",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-6 text-sm",
  lg: "h-[52px] px-8 text-[15px]",
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </button>
  );
}

/**
 * `prefetch={false}` throughout: every route in this app is a small static
 * page already covered by the shared bundle, so route prefetching buys no
 * measurable speed and only adds background `?_rsc=` requests — which show up
 * as cancelled entries in the Network tab whenever the visitor navigates
 * before one lands.
 */
export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  ...props
}: CommonProps & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...props}
    >
      {children}
    </Link>
  );
}
