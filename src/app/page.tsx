import { ResumeBanner } from "@/components/audit/ResumeBanner";
import { CategoryMeter } from "@/components/charts/CategoryMeter";
import { ScoreRing } from "@/components/charts/ScoreRing";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CATEGORIES, TOTAL_QUESTIONS } from "@/data/questionBank";
import { SERVICES } from "@/data/services";
import { bandFor } from "@/lib/audit/scoring";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Tell us who you are",
    body: "Two short forms: who to address the report to, and the shape of the business we are assessing.",
  },
  {
    step: "02",
    title: `Answer ${TOTAL_QUESTIONS} questions`,
    body: "Seven areas, five questions each. Skip anything that does not apply — the score adjusts for what you answered.",
  },
  {
    step: "03",
    title: "Get scored",
    body: "A weighted maturity score out of 100, broken down by category, with strengths and gaps named explicitly.",
  },
  {
    step: "04",
    title: "Take the plan",
    body: "A sequenced 90-day roadmap, matched services, effort and investment — and a proposal you can download.",
  },
];

const OUTCOMES = [
  {
    title: "Know exactly where you stand",
    body: "A single number you can track, decomposed into seven areas so it is actionable rather than decorative.",
  },
  {
    title: "Stop guessing what to fix first",
    body: "Every gap is ranked by priority and effort, so the first thirty days go to the work that actually pays back.",
  },
  {
    title: "Leave with a real proposal",
    body: "Scope, deliverables, effort in days, timeline and an investment band — not a brochure.",
  },
];

// A worked example, so the landing page shows the real output rather than
// describing it. Labelled as illustrative, and drawn through the same
// rendering path the live report uses.
const SAMPLE_SCORES: Record<string, number> = {
  website: 72,
  brand: 58,
  seo: 34,
  marketing: 41,
  sales: 63,
  automation: 28,
  operations: 47,
};

export default function LandingPage() {
  const sampleCategories = CATEGORIES.map((category) => {
    const score = SAMPLE_SCORES[category.id] ?? 0;
    const meta = bandFor(score);
    return {
      categoryId: category.id,
      name: category.name,
      shortName: category.shortName,
      description: category.description,
      weight: category.weight,
      score,
      answered: 5,
      total: 5,
      band: meta.band,
      bandLabel: meta.label,
      colorVar: meta.colorVar,
    };
  });

  return (
    <main>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="aurora pointer-events-none absolute inset-0" />
        <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-16 sm:px-8 sm:pt-24">
          <ResumeBanner />

          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="accent" className="mb-6">
              {TOTAL_QUESTIONS} questions · about 8 minutes
            </Badge>
            <h1 className="text-[clamp(2.15rem,6vw,4rem)] font-semibold leading-[1.05] text-ink">
              Find out exactly where your business stands — and what to fix first.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-secondary">
              A consultant-grade audit across website, brand, SEO, marketing, sales,
              automation and operations. You get a digital maturity score, a
              prioritised 90-day roadmap, and a proposal you can act on the same day.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/audit/client" size="lg">
                Start the audit
                <svg viewBox="0 0 16 16" className="size-4" aria-hidden fill="none">
                  <path
                    d="M3 8h9m0 0-3.5-3.5M12 8l-3.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </ButtonLink>
              <ButtonLink href="#sample-report" size="lg" variant="secondary">
                See a sample report
              </ButtonLink>
            </div>

            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-ink-muted">
              <li>No account needed</li>
              <li aria-hidden>·</li>
              <li>Progress saved on your device</li>
              <li aria-hidden>·</li>
              <li>PDF report and proposal included</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- sample report */}
      <section id="sample-report" className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-7">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
              Sample output
            </p>
            <Badge>Illustrative figures</Badge>
          </div>
          <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-12">
            <div className="mx-auto lg:mx-0">
              <ScoreRing score={49} caption="Emerging · Elevated risk" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {sampleCategories.slice(0, 4).map((category) => (
                <CategoryMeter key={category.categoryId} category={category} />
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* ------------------------------------------------------ how it works */}
      <section id="how-it-works" className="mx-auto w-full max-w-6xl px-5 pt-24 sm:px-8">
        <SectionIntro
          eyebrow="How it works"
          title="Four steps, start to finished plan"
          body="Nothing to install, no account to create, and no sales call required before you see your numbers."
        />
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item) => (
            <li key={item.step}>
              <Card className="h-full p-6">
                <p className="tabular text-[13px] font-medium text-accent">{item.step}</p>
                <h3 className="mt-4 text-[15px] font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{item.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* --------------------------------------------------- what we measure */}
      <section id="what-we-measure" className="mx-auto w-full max-w-6xl px-5 pt-24 sm:px-8">
        <SectionIntro
          eyebrow="What we measure"
          title="Seven areas, weighted by what actually moves revenue"
          body="Each category is scored out of 100 from five questions. Categories carry different weights in the overall score — sales and website weigh most, automation least."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category) => (
            <Card key={category.id} className="p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[15px] font-semibold text-ink">{category.name}</h3>
                <span className="tabular shrink-0 text-[12px] text-ink-muted">
                  ×{category.weight}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                {category.description}
              </p>
            </Card>
          ))}
          <Card className="flex flex-col justify-between border-accent/25 bg-accent/[0.05] p-6">
            <div>
              <h3 className="text-[15px] font-semibold text-ink">
                {SERVICES.length} matched engagements
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                Every answer that reveals a gap maps to a specific piece of work, with
                its own deliverables, effort and investment band.
              </p>
            </div>
            <ButtonLink href="/audit/client" size="sm" className="mt-6 self-start">
              Start the audit
            </ButtonLink>
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------------------ outcomes */}
      <section id="outcomes" className="mx-auto w-full max-w-6xl px-5 pt-24 sm:px-8">
        <SectionIntro
          eyebrow="Outcomes"
          title="What you walk away with"
          body="The audit ends with a decision, not a download."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {OUTCOMES.map((outcome) => (
            <Card key={outcome.title} className="p-6">
              <h3 className="text-[15px] font-semibold text-ink">{outcome.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                {outcome.body}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- final CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-24 sm:px-8">
        <Card className="relative overflow-hidden p-8 text-center sm:p-14">
          <div aria-hidden className="aurora pointer-events-none absolute inset-0" />
          <div className="relative">
            <h2 className="text-[clamp(1.6rem,4vw,2.4rem)] font-semibold text-ink">
              Eight minutes now, a quarter of clarity after.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-ink-secondary">
              Answer {TOTAL_QUESTIONS} questions and get your score, your roadmap and
              your proposal — without talking to anyone first.
            </p>
            <ButtonLink href="/audit/client" size="lg" className="mt-8">
              Start the audit
            </ButtonLink>
          </div>
        </Card>
      </section>

      <SiteFooter />
    </main>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-[clamp(1.5rem,3.5vw,2.15rem)] font-semibold leading-tight text-ink">
        {title}
      </h2>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-secondary">{body}</p>
    </div>
  );
}
