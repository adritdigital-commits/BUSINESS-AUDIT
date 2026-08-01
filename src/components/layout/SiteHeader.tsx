"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/layout/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#what-we-measure", label: "What we measure" },
  { href: "/#outcomes", label: "Outcomes" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const inFlow = ["/audit", "/report", "/proposal"].some((prefix) =>
    pathname.startsWith(prefix)
  );

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Logo />

        {!inFlow ? (
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <Link
                prefetch={false}
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[13.5px] text-ink-secondary",
                  "transition-colors hover:bg-white/[0.05] hover:text-ink"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : (
          <p className="hidden text-[13px] text-ink-muted sm:block">
            Business Growth Audit
          </p>
        )}

        <ButtonLink
          href={inFlow ? "/" : "/audit/client"}
          size="sm"
          variant={inFlow ? "secondary" : "primary"}
        >
          {inFlow ? "Exit" : "Start the audit"}
        </ButtonLink>
      </div>
    </header>
  );
}
