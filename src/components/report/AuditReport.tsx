"use client";

import { CategoryMeter } from "@/components/charts/CategoryMeter";
import { MaturityRadar } from "@/components/charts/MaturityRadar";
import { ScoreRing } from "@/components/charts/ScoreRing";
import { MaturityScale } from "@/components/report/MaturityScale";
import { Badge, PriorityBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { Recommendation, Report } from "@/lib/audit/report";
import { formatBudgetRange } from "@/lib/format";
import { cn } from "@/lib/cn";

const RISK_TONE = {
  critical: "critical",
  elevated: "critical",
  moderate: "warning",
  low: "good",
} as const;

/**
 * The on-screen consulting report. Everything it renders comes from the
 * `Report` object — it performs no calculation of its own, so the screen, the
 * PDF and the proposal cannot disagree.
 */
export function AuditReport({ report }: { report: Report }) {
  const issued = new Date(report.generatedAt);

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
          {report.completeness < 100 ? (
            <Badge tone="warning">{report.completeness}% of questions answered</Badge>
          ) : null}
        </div>

        <h1 className="mt-5 text-[clamp(1.9rem,5vw,2.9rem)] font-semibold leading-tight text-ink">
          {report.business.businessName || "Your business"}
        </h1>
        <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-secondary">
          Prepared for {report.client.fullName || "you"}
          {report.client.role ? `, ${report.client.role}` : ""} ·{" "}
          {report.business.industry || "Industry not specified"} ·{" "}
          {report.business.teamSize || "Team size not specified"}
        </p>
      </header>

      {/* ------------------------------------------------------------- scores */}
      <section aria-labelledby="score-heading">
        <SectionTitle id="score-heading" eyebrow="01" title="Digital maturity score" />
        <Card className="mt-6 p-5 sm:p-8">
          <div className="grid gap-10 lg:grid-cols-[auto_1fr] lg:gap-14">
            <div className="mx-auto lg:mx-0">
              <ScoreRing score={report.overall} />
            </div>

            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-ink">
                {report.maturity.title} — stage {report.maturity.step} of 5
              </h3>
              <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-secondary">
                {report.maturity.summary}
              </p>

              <div className="mt-6">
                <MaturityScale maturity={report.maturity} />
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Stat label="Risk level" value={report.risk.label} tone={RISK_TONE[report.risk.level]} />
                <Stat label="Engagements identified" value={`${report.recommendations.length}`} />
                <Stat
                  label="Indicative investment"
                  value={formatBudgetRange(report.investment.min, report.investment.max)}
                />
              </div>

              <p className="mt-5 text-[13.5px] leading-relaxed text-ink-secondary">
                {report.risk.summary}
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* --------------------------------------------------- category scores */}
      <section aria-labelledby="categories-heading">
        <SectionTitle
          id="categories-heading"
          eyebrow="02"
          title="Category scores"
          description="Each category is the mean of its answered questions, out of 100. The overall score weights them by commercial impact."
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr] lg:items-start">
          <Card className="p-5">
            <MaturityRadar categories={report.scores.categoryScores} />
          </Card>
          <div className="grid gap-3 sm:grid-cols-2">
            {report.scores.categoryScores.map((category) => (
              <CategoryMeter key={category.categoryId} category={category} />
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
            {report.strengths.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-3">
                {report.strengths.map((category) => (
                  <li key={category.categoryId} className="text-sm">
                    <span className="font-medium text-ink">{category.name}</span>
                    <span className="tabular ml-2 text-ink-muted">
                      {Math.round(category.score)}/100
                    </span>
                    <p className="mt-1 leading-relaxed text-ink-secondary">
                      {category.description}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
                No category scored 70 or above yet. The fastest route to a strength is
                the first phase of the roadmap below.
              </p>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <span aria-hidden className="size-2 rounded-full bg-critical" />
              Weaknesses
            </h3>
            {report.weaknesses.length > 0 ? (
              <ul className="mt-4 flex flex-col gap-3">
                {report.weaknesses.map((category) => (
                  <li key={category.categoryId} className="text-sm">
                    <span className="font-medium text-ink">{category.name}</span>
                    <span className="tabular ml-2 text-ink-muted">
                      {Math.round(category.score)}/100
                    </span>
                    <p className="mt-1 leading-relaxed text-ink-secondary">
                      {category.description}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
                Nothing scored below 55. There is no structural weakness to remediate —
                the work ahead is optimisation.
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
            items={report.quickWins}
            emptyMessage="No short-cycle work identified."
          />
          <WorkList
            title="Long-term improvements"
            caption="Multi-week programmes"
            items={report.longTermMoves}
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
          description="Every recommended engagement, ranked. Investment bands are indicative and confirmed on a scoping call."
        />

        {report.recommendations.length > 0 ? (
          <Card className="mt-6 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <caption className="sr-only">
                  Recommended engagements with priority, effort and indicative investment
                </caption>
                <thead>
                  <tr className="border-b border-hairline text-[12px] uppercase tracking-wider text-ink-muted">
                    <th scope="col" className="px-5 py-3 font-medium">Engagement</th>
                    <th scope="col" className="px-5 py-3 font-medium">Priority</th>
                    <th scope="col" className="px-5 py-3 font-medium">Effort</th>
                    <th scope="col" className="px-5 py-3 font-medium">Timeline</th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">Investment</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recommendations.map((recommendation) => (
                    <tr
                      key={recommendation.service.id}
                      className="border-b border-hairline last:border-0"
                    >
                      <th scope="row" className="px-5 py-4 font-medium text-ink">
                        {recommendation.service.name}
                        <span className="mt-1 block text-[12.5px] font-normal text-ink-muted">
                          {recommendation.categoryNames.join(" · ")}
                        </span>
                      </th>
                      <td className="px-5 py-4">
                        <PriorityBadge priority={recommendation.priority} />
                      </td>
                      <td className="tabular px-5 py-4 text-ink-secondary">
                        {recommendation.service.effortDays} days
                      </td>
                      <td className="px-5 py-4 text-ink-secondary">
                        {recommendation.service.timeline}
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
                    <th scope="row" className="px-5 py-4 text-left font-semibold">
                      Total
                    </th>
                    <td className="px-5 py-4" />
                    <td className="tabular px-5 py-4 font-medium">{report.effortDays} days</td>
                    <td className="px-5 py-4" />
                    <td className="tabular px-5 py-4 text-right font-semibold">
                      {formatBudgetRange(report.investment.min, report.investment.max)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        ) : (
          <Card className="mt-6 p-6">
            <p className="text-sm leading-relaxed text-ink-secondary">
              No remediation work was triggered by your answers. That is a strong
              result — the recommended next step is a maintenance and optimisation
              cadence rather than a programme of change.
            </p>
          </Card>
        )}
      </section>

      {/* ---------------------------------------------------------- roadmap */}
      <section aria-labelledby="roadmap-heading">
        <SectionTitle
          id="roadmap-heading"
          eyebrow="06"
          title="90-day priority roadmap"
          description="Sequenced so each phase depends on the one before it."
        />
        <ol className="mt-6 flex flex-col gap-4">
          {report.roadmap.map((phase, phaseIndex) => (
            <li key={phase.key}>
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
                          {phase.window}
                        </p>
                        <h3 className="text-[15px] font-semibold text-ink">{phase.title}</h3>
                      </div>
                    </div>
                    <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-secondary">
                      {phase.objective}
                    </p>
                  </div>
                  {phase.recommendations.length > 0 ? (
                    <div className="text-right text-[13px]">
                      <p className="tabular font-medium text-ink">{phase.effortDays} days</p>
                      <p className="tabular mt-1 text-ink-muted">
                        {formatBudgetRange(phase.investmentMin, phase.investmentMax)}
                      </p>
                    </div>
                  ) : null}
                </div>

                {phase.recommendations.length > 0 ? (
                  <ul className="mt-5 flex flex-col gap-2 border-t border-hairline pt-5">
                    {phase.recommendations.map((recommendation) => (
                      <li
                        key={recommendation.service.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span className="text-ink">{recommendation.service.name}</span>
                        <span className="tabular text-[12.5px] text-ink-muted">
                          {recommendation.service.timeline} ·{" "}
                          {formatBudgetRange(
                            recommendation.service.costMin,
                            recommendation.service.costMax
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 border-t border-hairline pt-5 text-sm text-ink-muted">
                    Nothing scheduled — maintain and measure what the earlier phases put
                    in place.
                  </p>
                )}
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------ recommended services */}
      {report.recommendations.length > 0 ? (
        <section aria-labelledby="services-heading">
          <SectionTitle
            id="services-heading"
            eyebrow="07"
            title="Recommended services"
            description="What each engagement covers, and the answer that triggered it."
          />
          <div className="mt-6 flex flex-col gap-4">
            {report.recommendations.map((recommendation) => (
              <ServiceCard key={recommendation.service.id} recommendation={recommendation} />
            ))}
          </div>
        </section>
      ) : null}
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
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warning" | "critical";
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
            <li key={item.service.id} className="border-t border-hairline pt-4 first:border-0 first:pt-0">
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
        <PriorityBadge priority={recommendation.priority} />
      </div>

      <dl className="mt-5 grid gap-3 border-y border-hairline py-4 sm:grid-cols-3">
        <div>
          <dt className="text-[12px] text-ink-muted">Effort</dt>
          <dd className="tabular mt-0.5 text-sm text-ink">{service.effortDays} consultant-days</dd>
        </div>
        <div>
          <dt className="text-[12px] text-ink-muted">Timeline</dt>
          <dd className="mt-0.5 text-sm text-ink">{service.timeline}</dd>
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
            {service.deliverables.map((item) => (
              <li key={item} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-secondary">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink-muted" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">
            Benefits
          </h4>
          <ul className="mt-3 flex flex-col gap-2">
            {service.benefits.map((item) => (
              <li key={item} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-secondary">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-accent" />
                {item}
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
            <li key={finding.questionId} className="text-[13.5px] leading-relaxed">
              <p className="text-ink-secondary">
                <span className="text-ink-muted">{finding.question}</span>{" "}
                <span className="text-ink">“{finding.answerLabel}”</span>
              </p>
              {finding.impact ? (
                <p className="mt-1 text-ink-secondary">{finding.impact}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
