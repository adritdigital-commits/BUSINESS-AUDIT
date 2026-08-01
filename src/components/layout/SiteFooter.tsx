import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-hairline">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-ink-muted">
            A consultant-grade diagnostic across seven areas of digital and
            commercial maturity, scored and sequenced into a 90-day plan.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          <Link href="/audit" className="text-ink-secondary hover:text-ink">
            Start the audit
          </Link>
          <Link href="/#what-we-measure" className="text-ink-secondary hover:text-ink">
            What we measure
          </Link>
          <Link href="/#outcomes" className="text-ink-secondary hover:text-ink">
            Outcomes
          </Link>
        </nav>
      </div>
      <div className="mx-auto w-full max-w-6xl px-5 pb-10 sm:px-8">
        <p className="text-[12px] text-ink-muted">
          © RakeshProTech. Scores and investment bands are indicative and confirmed
          on a scoping call.
        </p>
      </div>
    </footer>
  );
}
