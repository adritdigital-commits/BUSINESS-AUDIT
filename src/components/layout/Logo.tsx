import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      prefetch={false}
      href={href}
      className="group inline-flex items-center gap-2.5"
      aria-label="RakeshProTech — home"
    >
      <span className="relative grid size-8 place-items-center rounded-lg bg-accent text-accent-ink">
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden fill="none">
          <path
            d="M3 14.5 7.5 8l3.5 4L17 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-ink">
        RakeshProTech
      </span>
    </Link>
  );
}
