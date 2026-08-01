import { ResumeBanner } from "@/components/audit/ResumeBanner";
import { DomainMeter } from "@/components/charts/DomainMeter";
import { ScoreRing } from "@/components/charts/ScoreRing";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SERVICES } from "@/data/services";
import { QUESTION_BANK_SIZE } from "@/data/questionBanks";
import { DOMAINS } from "@/engine/domains";
import { ALL_INDUSTRY_RULES } from "@/engine/industryRules";
import { MAX_TOTAL_QUESTIONS, QUOTA_BREAKDOWN } from "@/engine/questionEngine";
import { bandFor } from "@/engine/scoreEngine";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Build your profile",
    body: "Industry, type, stage, size, where customers come from, and the three things you most want to fix.",
  },
  {
    step: "02",
    title: "We build the assessment",
    body: `${QUOTA_BREAKDOWN.core} core questions, ${QUOTA_BREAKDOWN.industry} for your industry, ${QUOTA_BREAKDOWN.goal} for your goals and ${QUOTA_BREAKDOWN.size} for your size — drawn from a bank of ${QUESTION_BANK_SIZE}.`,
  },
  {
    step: "03",
    title: "Answer, and it adapts",
    body: "Answers unlock follow-up questions and remove ones that no longer apply. No website means no page-speed questions.",
  },
  {
    step: "04",
    title: "Take the plan",
    body: "Nine capability scores, risk and opportunity reads, a sequenced roadmap out to twelve months, and a proposal.",
  },
];

const OUTCOMES = [
  {
    title: "An assessment built for you",
    body: "A clinic is not asked about dealer portals. A manufacturer is not asked about table reservations. The question set is assembled from your profile, not handed out.",
  },
  {
    title: "Scores weighted to your reality",
    body: "Every capability carries a different weight depending on your sector and your stated priorities. Reviews matter more to a restaurant than automation does.",
  },
  {
    title: "A plan you could actually run",
    body: "Sequenced by urgency, by what depends on what, and by how many workstreams a team your size can handle at once.",
  },
];

// A worked example, so the landing page shows the real output rather than
// describing it. Labelled as illustrative, and drawn through the same
// rendering path the live report uses.
const SAMPLE_SCORES: Record<string, number> = {
  website: 72,
  seo: 34,
  brand: 58,
  marketing: 41,
  sales: 63,
  crm: 26,
  automation: 38,
  analytics: 31,
  customerExperience: 55,
};

export default function LandingPage() {
  const sampleDomains = DOMAINS.map((domain) => {
    const score = SAMPLE_SCORES[domain.id] ?? 0;
    const meta = bandFor(score);
    return {
      domainId: domain.id,
      name: domain.name,
      shortName: domain.shortName,
      description: domain.description,
      weight: domain.baseWeight,
      score,
      answered: 4,
      asked: 4,
      band: meta.band,
      bandLabel: meta.label,
      colorVar: meta.colorVar,
      notAssessed: false,
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
              Adaptive · up to {MAX_TOTAL_QUESTIONS} questions · about 8 minutes
            </Badge>
            <h1 className="text-[clamp(2.15rem,6vw,4rem)] font-semibold leading-[1.05] text-ink">
              A business audit that asks you different questions than it asks anyone else.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-ink-secondary">
              Most audits hand every business the same list. This one builds a profile first,
              then assembles the assessment from it — your industry, your stage, your channels
              and the three things you actually want to fix.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/audit/client" size="lg">
                Start the assessment
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
              <ScoreRing score={46} caption="Emerging · Elevated risk · Substantial upside" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {sampleDomains.slice(0, 4).map((domain) => (
                <DomainMeter key={domain.domainId} domain={domain} showWeight={false} />
              ))}
            </div>
          </div>
        </Card>
      </section>

      {/* ------------------------------------------------------ how it works */}
      <section id="how-it-works" className="mx-auto w-full max-w-6xl px-5 pt-24 sm:px-8">
        <SectionIntro
          eyebrow="How it works"
          title="Four steps, and the questions change at every one"
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
          title="Nine capabilities, weighted differently for every business"
          body="Each is scored out of 100 from the questions you were actually asked. The weights below are the defaults — your industry and your priorities change them."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAINS.map((domain) => (
            <Card key={domain.id} className="p-6">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-[15px] font-semibold text-ink">{domain.name}</h3>
                <span className="tabular shrink-0 text-[12px] text-ink-muted">
                  ×{domain.baseWeight}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                {domain.description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------- industries */}
      <section id="industries" className="mx-auto w-full max-w-6xl px-5 pt-24 sm:px-8">
        <SectionIntro
          eyebrow="Industry playbooks"
          title="Each sector gets its own questions and its own priorities"
          body="Below is what changes when you pick your industry — the topics we assess that a generic audit would never ask about."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_INDUSTRY_RULES.filter((rule) => rule.id !== "other")
            .slice(0, 9)
            .map((rule) => (
              <Card key={rule.id} className="p-6">
                <h3 className="text-[15px] font-semibold text-ink">{rule.label}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-secondary">
                  {rule.narrative}
                </p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {rule.injectedTopics.slice(0, 3).map((topic) => (
                    <li
                      key={topic}
                      className="rounded-full border border-hairline-strong px-2.5 py-1 text-[11.5px] text-ink-muted"
                    >
                      {topic}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          <Card className="flex flex-col justify-between border-accent/25 bg-accent/[0.05] p-6">
            <div>
              <h3 className="text-[15px] font-semibold text-ink">
                {SERVICES.length} matched engagements
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
                Every answer that reveals a gap maps to a specific piece of work, with its own
                deliverables, effort, timeline, investment band and expected return. Nothing is
                recommended without an answer behind it.
              </p>
            </div>
            <ButtonLink href="/audit/client" size="sm" className="mt-6 self-start">
              Start the assessment
            </ButtonLink>
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------------------ outcomes */}
      <section id="outcomes" className="mx-auto w-full max-w-6xl px-5 pt-24 sm:px-8">
        <SectionIntro
          eyebrow="Outcomes"
          title="What you walk away with"
          body="The assessment ends with a decision, not a download."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {OUTCOMES.map((outcome) => (
            <Card key={outcome.title} className="p-6">
              <h3 className="text-[15px] font-semibold text-ink">{outcome.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{outcome.body}</p>
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
              Build your profile, answer the questions it selects, and get your scores, your
              roadmap and your proposal — without talking to anyone first.
            </p>
            <ButtonLink href="/audit/client" size="lg" className="mt-8">
              Start the assessment
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
