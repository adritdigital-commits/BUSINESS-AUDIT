"use client";

import { DomainMeter } from "@/components/charts/DomainMeter";
import { MaturityRadar } from "@/components/charts/MaturityRadar";
import { ScoreRing } from "@/components/charts/ScoreRing";
import { MaturityScale } from "@/components/report/MaturityScale";
import { Badge, PriorityBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  businessAgeLabel,
  businessTypeLabel,
  channelLabel,
  goalLabel,
  teamSizeLabel,
} from "@/engine/businessProfile";
import type { Assessment } from "@/engine";
import type { Recommendation } from "@/engine/recommendationEngine";
import { activePhases } from "@/engine/roadmapEngine";
import type { Difficulty, Impact } from "@/engine/types";
import { formatBudgetRange } from "@/lib/format";
import { cn } from "@/lib/cn";

const RISK_TONE = {
  critical: "critical",
  elevated: "critical",
  moderate: "warning",
  low: "good",
} as const;

const CONFIDENCE_TONE = { high: "good", moderate: "warning", low: "critical" } as const;

const OPPORTUNITY_TONE = {
  substantial: "good",
  significant: "good",
  moderate: "warning",
  limited: "neutral",
} as const;

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Low effort",
  moderate: "Moderate effort",
  complex: "Complex",
};

const IMPACT_LABEL: Record<Impact, string> = {
  low: "Low impact",
  medium: "Medium impact",
  high: "High impact",
  transformational: "Transformational",
};

/**
 * The on-screen consulting report.
 *
 * Everything it renders comes from the `Assessment` object — it performs no
 * calculation of its own, so the screen, the proposal and the PDF cannot
 * disagree.
 */
export function AuditReport({ assessment }: { assessment: Assessment }) {
  const issued = new Date(assessment.generatedAt);
  const { scores, profile } = assessment;
  const phases = activePhases(assessment.roadmap);

  return (
    <article className="flex flex-col gap-14">
      {/* ------------------------------------------------------------ header */}
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">Growth audit report</Badge>
          <Badge>
            {issued.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Badge>
          <Badge tone={CONFIDENCE_TONE[scores.confidence.level]}>
            {scores.confidence.label} confidence · {scores.confidence.percent}%
          </Badge>
        </div>

        <h1 className="mt-5 text-[clamp(1.9rem,5vw,2.9rem)] font-semibold leading-tight text-ink">
          {profile.businessName || "Your business"}
        </h1>
        <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-secondary">
          Prepared for {assessment.contact.fullName || "you"}
          {assessment.contact.role ? `, ${assessment.contact.role}` : ""} ·{" "}
          {assessment.industry.label} · {businessTypeLabel(profile.businessType || undefined)} ·{" "}
          {teamSizeLabel(profile.teamSize || undefined)} ·{" "}
          {businessAgeLabel(profile.businessAge || undefined)}
        </p>

        <Card className="mt-6 border-accent/25 bg-accent/[0.05] p-5">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
            Why this assessment looked the way it did
          </p>
          <p className="mt-2.5 max-w-prose text-[14.5px] leading-relaxed text-ink-secondary">
            {assessment.industry.narrative}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {assessment.industry.injectedTopics.map((topic) => (
              <Badge key={topic}>{topic}</Badge>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-ink-muted">
            {assessment.plan.baseCount} questions selected for your profile
            {assessment.plan.followUpCount > 0
              ? `, plus ${assessment.plan.followUpCount} follow-up${assessment.plan.followUpCount === 1 ? "" : "s"} unlocked by your answers`
              : ""}
            . Priorities: {profile.priorities.map((goal) => goalLabel(goal)).join(", ") || "—"}.
          </p>
        </Card>
      </header>

      {/* ------------------------------------------------------------- scores */}
      <section aria-labelledby="score-heading">
        <SectionTitle id="score-heading" eyebrow="01" title="Digital maturity score" />
        <Card className="mt-6 p-5 sm:p-8">
          <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:gap-14">
            <div className="mx-auto lg:mx-0">
              <ScoreRing score={scores.overall} />
            </div>

            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-ink">
                {scores.maturity.title} — stage {scores.maturity.step} of 5
              </h3>
              <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-secondary">
                {scores.maturity.summary}
              </p>

              <div className="mt-6">
                <MaturityScale maturity={scores.maturity} />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Stat
                  label="Business risk"
                  value={scores.risk.label}
                  detail={`Index ${scores.risk.index}/100`}
                  tone={RISK_TONE[scores.risk.level]}
                />
                <Stat
                  label="Growth opportunity"
                  value={scores.opportunity.label}
                  detail={`Headroom ${scores.opportunity.index}/100`}
                  tone={OPPORTUNITY_TONE[scores.opportunity.level]}
                />
                <Stat
                  label="Confidence"
                  value={scores.confidence.label}
                  detail={`${scores.answered} of ${scores.asked} answered`}
                  tone={CONFIDENCE_TONE[scores.confidence.level]}
                />
              </div>

              <div className="mt-6 flex flex-col gap-3 text-[13.5px] leading-relaxed text-ink-secondary">
                <p>
                  <span className="font-medium text-ink">Risk. </span>
                  {scores.risk.summary}
                  {scores.risk.drivers.length > 0
                    ? ` Driven by ${scores.risk.drivers.join(", ")}.`
                    : ""}
                </p>
                <p>
                  <span className="font-medium text-ink">Opportunity. </span>
                  {scores.opportunity.summary}
                  {scores.opportunity.topDomains.length > 0
                    ? ` The most valuable gaps are in ${scores.opportunity.topDomains.join(", ")}.`
                    : ""}
                </p>
                <p>
                  <span className="font-medium text-ink">Confidence. </span>
                  {scores.confidence.summary}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* ----------------------------------------------------- domain scores */}
      <section aria-labelledby="domains-heading">
        <SectionTitle
          id="domains-heading"
          eyebrow="02"
          title="Capability scores"
          description="Nine areas, each scored out of 100 from the questions you were asked. Weights reflect your industry and the priorities you selected — they are not the same for every business."
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
          <Card className="p-5">
            <MaturityRadar domains={scores.domains} />
          </Card>
          <div className="grid gap-3 sm:grid-cols-2">
            {scores.domains.map((domain) => (
              <DomainMeter key={domain.domainId} domain={domain} />
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------ strengths and weaknesses */}
      <section aria-labelledby="findings-heading">
        <SectionTitle
          id="findings-heading"
          eyebrow="03"
          title="Strengths and weaknesses"
          description="What is already working, and where the business is most exposed."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card className="p-6">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <span aria-hidden className="size-2 rounded-full bg-good" />
              Strengths
            </h3>
            {assessment.strengths.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-3">
                {assessment.strengths.map((domain) => (
                  <li key={domain.domainId} className="text-sm">
                    <span className="font-medium text-ink">{domain.name}</span>
                    <span className="tabular ml-2 text-ink-muted">
                      {Math.round(domain.score)}/100
                    </span>
                    <p className="mt-1 leading-relaxed text-ink-secondary">
                      {domain.description}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
                No capability scored 70 or above yet. The fastest route to a strength is the
                first phase of the roadmap below.
              </p>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <span aria-hidden className="size-2 rounded-full bg-critical" />
              Weaknesses
            </h3>
            {assessment.weaknesses.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-3">
                {assessment.weaknesses.map((domain) => (
                  <li key={domain.domainId} className="text-sm">
                    <span className="font-medium text-ink">{domain.name}</span>
                    <span className="tabular ml-2 text-ink-muted">
                      {Math.round(domain.score)}/100
                    </span>
                    <p className="mt-1 leading-relaxed text-ink-secondary">
                      {domain.description}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
                Nothing scored below 55. There is no structural weakness to remediate — the
                work ahead is optimisation.
              </p>
            )}
          </Card>
        </div>
      </section>

      {/* --------------------------------------- quick wins and longer plays */}
      <section aria-labelledby="wins-heading">
        <SectionTitle
          id="wins-heading"
          eyebrow="04"
          title="Quick wins and long-term improvements"
          description="Split by effort, not by priority — a fast critical fix belongs in the first column, not buried in a programme."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <WorkList
            title="Quick wins"
            caption="Ten consultant-days or fewer"
            items={assessment.quickWins}
            emptyMessage="No short-cycle work identified."
          />
          <WorkList
            title="Long-term improvements"
            caption="Multi-week programmes"
            items={assessment.longTermMoves}
            emptyMessage="No long-cycle work identified."
          />
        </div>
      </section>

      {/* --------------------------------------------------- priority matrix */}
      <section aria-labelledby="priority-heading">
        <SectionTitle
          id="priority-heading"
          eyebrow="05"
          title="Investment priority"
          description="Every recommended engagement, ranked by urgency, sector fit, your stated priorities and how much evidence sits behind it."
        />

        {assessment.recommendations.length > 0 ? (
          <Card className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Recommended engagements with priority, difficulty, impact, effort and
                  indicative investment
                </caption>
                <thead>
                  <tr className="border-b border-hairline text-[12px] uppercase tracking-wider text-ink-muted">
                    <th scope="col" className="px-5 py-3 font-medium">Engagement</th>
                    <th scope="col" className="px-5 py-3 font-medium">Priority</th>
                    <th scope="col" className="px-5 py-3 font-medium">Difficulty</th>
                    <th scope="col" className="px-5 py-3 font-medium">Impact</th>
                    <th scope="col" className="px-5 py-3 font-medium">Effort</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Investment</th>
                  </tr>
                </thead>
                <tbody>
                  {assessment.recommendations.map((recommendation) => (
                    <tr
                      key={recommendation.service.id}
                      className="border-b border-hairline last:border-0"
                    >
                      <th scope="row" className="px-5 py-4 font-medium text-ink">
                        {recommendation.service.name}
                        <span className="mt-1 block text-[12.5px] font-normal text-ink-muted">
                          {recommendation.domainNames.join(" · ")}
                          {recommendation.industryPriority ? " · sector priority" : ""}
                          {recommendation.goalAligned ? " · matches your goals" : ""}
                        </span>
                      </th>
                      <td className="px-5 py-4">
                        <PriorityBadge priority={recommendation.priority} />
                      </td>
                      <td className="px-5 py-4 text-ink-secondary">
                        {DIFFICULTY_LABEL[recommendation.service.difficulty]}
                      </td>
                      <td className="px-5 py-4 text-ink-secondary">
                        {IMPACT_LABEL[recommendation.service.impact]}
                      </td>
                      <td className="tabular px-5 py-4 text-ink-secondary">
                        {recommendation.service.effortDays} days
                      </td>
                      <td className="tabular px-5 py-4 text-right text-ink-secondary">
                        {formatBudgetRange(
                          recommendation.service.costMin,
                          recommendation.service.costMax
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-surface-raised text-ink">
                    <th scope="row" className="px-5 py-4 text-left font-semibold">Total</th>
                    <td className="px-5 py-4" />
                    <td className="px-5 py-4" />
                    <td className="px-5 py-4" />
                    <td className="tabular px-5 py-4 font-medium">
                      {assessment.effortDays} days
                    </td>
                    <td className="tabular px-5 py-4 text-right font-semibold">
                      {formatBudgetRange(
                        assessment.investment.min,
                        assessment.investment.max
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="mt-6 p-6">
            <p className="text-sm leading-relaxed text-ink-secondary">
              No remediation work was triggered by your answers. That is a strong result — the
              recommended next step is a maintenance and optimisation cadence rather than a
              programme of change.
            </p>
          </Card>
        )}
      </section>

      {/* ------------------------------------------------------------ roadmap */}
      <section aria-labelledby="roadmap-heading">
        <SectionTitle
          id="roadmap-heading"
          eyebrow="06"
          title="Priority roadmap"
          description="Sequenced by urgency, by what depends on what, and by how many workstreams a team of your size can realistically run at once."
        />
        {phases.length > 0 ? (
          <ol className="mt-6 flex flex-col gap-4">
            {phases.map((phase, phaseIndex) => (
              <li key={phase.id}>
                <Card className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="tabular grid size-8 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent/10 text-[13px] font-semibold text-accent"
                        >
                          {phaseIndex + 1}
                        </span>
                        <div>
                          <p className="text-[12px] uppercase tracking-wider text-ink-muted">
                            {phase.label}
                          </p>
                          <h3 className="text-[15px] font-semibold text-ink">
                            {phase.tasks.length} engagement
                            {phase.tasks.length === 1 ? "" : "s"}
                          </h3>
                        </div>
                      </div>
                      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-secondary">
                        {phase.objective}
                      </p>
                    </div>
                    <div className="text-right text-[13px]">
                      <p className="tabular font-medium text-ink">{phase.effortDays} days</p>
                      <p className="tabular mt-1 text-ink-muted">
                        {formatBudgetRange(phase.investmentMin, phase.investmentMax)}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-5 flex flex-col gap-4 border-t border-hairline pt-5">
                    {phase.tasks.map((task) => (
                      <li key={task.serviceId}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-medium text-ink">{task.title}</p>
                          <PriorityBadge priority={task.priority} />
                        </div>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-secondary">
                          {task.summary}
                        </p>
                        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px]">
                          <Meta label="Difficulty" value={DIFFICULTY_LABEL[task.difficulty]} />
                          <Meta label="Impact" value={IMPACT_LABEL[task.impact]} />
                          <Meta label="Effort" value={`${task.effortDays} days`} />
                          <Meta
                            label="Cost"
                            value={formatBudgetRange(task.costMin, task.costMax)}
                          />
                        </dl>
                        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">
                          <span className="text-ink-secondary">ROI:</span> {task.roi}
                        </p>
                        {task.sequencingNote ? (
                          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">
                            <span className="text-ink-secondary">Sequencing:</span>{" "}
                            {task.sequencingNote}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            ))}
          </ol>
        ) : (
          <Card className="mt-6 p-6">
            <p className="text-sm leading-relaxed text-ink-secondary">
              Nothing needs scheduling. Maintain and measure what you already have in place.
            </p>
          </Card>
        )}
      </section>

      {/* ------------------------------------------------ recommended services */}
      {assessment.recommendations.length > 0 ? (
        <section aria-labelledby="services-heading">
          <SectionTitle
            id="services-heading"
            eyebrow="07"
            title="Recommended services"
            description="What each engagement covers, and the answer that triggered it. Nothing here was recommended without evidence."
          />
          <div className="mt-6 flex flex-col gap-4">
            {assessment.recommendations.map((recommendation) => (
              <ServiceCard key={recommendation.service.id} recommendation={recommendation} />
            ))}
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- your inputs */}
      <section aria-labelledby="profile-heading">
        <SectionTitle
          id="profile-heading"
          eyebrow="08"
          title="The profile this was built from"
          description="Change any of these and the assessment changes with it."
        />
        <Card className="mt-6 p-6">
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Industry" value={assessment.industry.label} />
            <Detail label="Business type" value={businessTypeLabel(profile.businessType || undefined)} />
            <Detail label="Trading for" value={businessAgeLabel(profile.businessAge || undefined)} />
            <Detail label="Team size" value={teamSizeLabel(profile.teamSize || undefined)} />
            <Detail label="Website" value={profile.website || "None yet"} />
            <Detail label="Primary goal" value={goalLabel(profile.primaryGoal || undefined)} />
            <Detail
              label="Customer acquisition"
              value={
                profile.acquisitionChannels.map((channel) => channelLabel(channel)).join(", ") ||
                "—"
              }
            />
            <Detail
              label="Selected priorities"
              value={profile.priorities.map((goal) => goalLabel(goal)).join(", ") || "—"}
            />
          </dl>
        </Card>
      </section>
    </article>
  );
}

function SectionTitle({
  id,
  eyebrow,
  title,
  description,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="tabular text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
        {eyebrow}
      </p>
      <h2 id={id} className="mt-2 text-[clamp(1.35rem,3vw,1.75rem)] font-semibold text-ink">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-secondary">{description}</p>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "good" | "warning" | "critical" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "text-good"
      : tone === "warning"
        ? "text-warning"
        : tone === "critical"
          ? "text-critical"
          : "text-ink";

  return (
    <div className="rounded-xl border border-hairline bg-surface-sunken px-4 py-3">
      <p className="text-[12px] text-ink-muted">{label}</p>
      <p className={cn("mt-1 text-[15px] font-semibold", toneClass)}>{value}</p>
      {detail ? <p className="tabular mt-0.5 text-[12px] text-ink-muted">{detail}</p> : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink-secondary">{value}</dd>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-ink-muted">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}

function WorkList({
  title,
  caption,
  items,
  emptyMessage,
}: {
  title: string;
  caption: string;
  items: Recommendation[];
  emptyMessage: string;
}) {
  return (
    <Card className="p-6">
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-[12.5px] text-ink-muted">{caption}</p>
      {items.length > 0 ? (
        <ul className="mt-5 flex flex-col gap-4">
          {items.map((item) => (
            <li
              key={item.service.id}
              className="border-t border-hairline pt-4 first:border-0 first:pt-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium text-ink">{item.service.name}</p>
                <PriorityBadge priority={item.priority} />
              </div>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-secondary">
                {item.service.summary}
              </p>
              <p className="tabular mt-2 text-[12.5px] text-ink-muted">
                {item.service.effortDays} days · {item.service.timeline} ·{" "}
                {formatBudgetRange(item.service.costMin, item.service.costMax)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 text-sm leading-relaxed text-ink-secondary">{emptyMessage}</p>
      )}
    </Card>
  );
}

function ServiceCard({ recommendation }: { recommendation: Recommendation }) {
  const { service } = recommendation;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold text-ink">{service.name}</h3>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-secondary">
            {service.summary}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {recommendation.stretch ? <Badge tone="warning">Sequenced later</Badge> : null}
          <PriorityBadge priority={recommendation.priority} />
        </div>
      </div>

      <dl className="mt-5 grid gap-3 border-y border-hairline py-4 sm:grid-cols-4">
        <div>
          <dt className="text-[12px] text-ink-muted">Effort</dt>
          <dd className="tabular mt-0.5 text-sm text-ink">{service.effortDays} days</dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-muted">Timeline</dt>
          <dd className="mt-0.5 text-sm text-ink">{service.timeline}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-muted">Impact</dt>
          <dd className="mt-0.5 text-sm text-ink">{IMPACT_LABEL[service.impact]}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-muted">Investment</dt>
          <dd className="tabular mt-0.5 text-sm text-ink">
            {formatBudgetRange(service.costMin, service.costMax)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div>
          <h4 className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">
            Deliverables
          </h4>
          <ul className="mt-3 flex flex-col gap-2">
            {service.deliverables.map((deliverable) => (
              <li
                key={deliverable}
                className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-secondary"
              >
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink-muted" />
                {deliverable}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">
            Benefits
          </h4>
          <ul className="mt-3 flex flex-col gap-2">
            {service.benefits.map((benefit) => (
              <li
                key={benefit}
                className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-secondary"
              >
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-hairline bg-surface-sunken p-4">
        <h4 className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">
          Why this is recommended
        </h4>
        <ul className="mt-3 flex flex-col gap-3">
          {recommendation.findings.map((finding) => (
            <li key={`${finding.questionId}-${finding.serviceId}`} className="text-[13.5px] leading-relaxed">
              <p className="text-ink-secondary">
                <span className="text-ink-muted">{finding.question}</span>{" "}
                <span className="text-ink">“{finding.answerLabel}”</span>
              </p>
              {finding.insight ? (
                <p className="mt-1 text-ink-secondary">{finding.insight}</p>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-hairline pt-3 text-[13px] text-ink-muted">
          <span className="text-ink-secondary">Expected return:</span> {service.roi}
        </p>
      </div>
    </Card>
  );
}
