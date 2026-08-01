"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { FlowShell, FlowSkeleton } from "@/components/audit/FlowShell";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { DownloadPdfButton } from "@/components/report/DownloadPdfButton";
import { Badge, PriorityBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAudit } from "@/lib/audit/AuditProvider";
import { buildProposal } from "@/lib/audit/proposal";
import { formatBudgetRange } from "@/lib/format";

export default function ProposalPage() {
  const router = useRouter();
  const { ready, isComplete, report } = useAudit();

  const missing = ready && (!isComplete || !report);
  useEffect(() => {
    if (missing) router.replace("/audit");
  }, [missing, router]);

  const proposal = useMemo(() => (report ? buildProposal(report) : null), [report]);

  if (!ready || missing || !report || !proposal) {
    return (
      <FlowShell>
        <FlowSkeleton label="Preparing your proposal" />
      </FlowShell>
    );
  }

  const issued = new Date(proposal.issuedAt);
  const valid = new Date(proposal.validUntil);
  const dateFormat: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  };

  return (
    <>
      <FlowShell width="wide">
        <Card className="no-print mb-10 flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Proposal preview</p>
            <p className="mt-0.5 text-[13px] text-ink-secondary">
              Generated from your score. The PDF contains the full report and this
              proposal.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href="/report" variant="ghost" size="md">
              Back to report
            </ButtonLink>
            <DownloadPdfButton report={report} label="Download proposal (PDF)" />
          </div>
        </Card>

        <article className="flex flex-col gap-12">
          {/* ---------------------------------------------------------- head */}
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">Proposal</Badge>
              <Badge>{proposal.reference}</Badge>
            </div>
            <h1 className="mt-5 text-[clamp(1.9rem,5vw,2.9rem)] font-semibold leading-tight text-ink">
              {proposal.headline}
            </h1>
            <dl className="mt-6 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[12px] text-ink-muted">Prepared for</dt>
                <dd className="mt-1 text-ink">{proposal.preparedFor}</dd>
                <dd className="text-ink-secondary">
                  {proposal.contactName}
                  {proposal.contactEmail ? ` · ${proposal.contactEmail}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-muted">Issued</dt>
                <dd className="mt-1 text-ink">
                  {issued.toLocaleDateString("en-IN", dateFormat)}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-ink-muted">Valid until</dt>
                <dd className="mt-1 text-ink">
                  {valid.toLocaleDateString("en-IN", dateFormat)}
                </dd>
              </div>
            </dl>
          </header>

          {/* ----------------------------------------------- executive summary */}
          <section aria-labelledby="summary-heading">
            <Card className="p-6 sm:p-8">
              <h2 id="summary-heading" className="text-[15px] font-semibold text-ink">
                Executive summary
              </h2>
              <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-secondary">
                {proposal.executiveSummary}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                <Figure label="Total effort" value={`${proposal.totalEffortDays} days`} />
                <Figure label="Engagement window" value={proposal.engagementWindow} />
                <Figure
                  label="Indicative investment"
                  value={formatBudgetRange(proposal.investmentMin, proposal.investmentMax)}
                />
              </div>
            </Card>
          </section>

          {/* -------------------------------------------------------- outcomes */}
          <section aria-labelledby="outcomes-heading">
            <h2
              id="outcomes-heading"
              className="text-[clamp(1.3rem,3vw,1.6rem)] font-semibold text-ink"
            >
              What this delivers
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {proposal.outcomes.map((outcome) => (
                <li
                  key={outcome}
                  className="flex gap-3 rounded-card border border-hairline bg-surface p-4 text-sm leading-relaxed text-ink-secondary"
                >
                  <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                  {outcome}
                </li>
              ))}
            </ul>
          </section>

          {/* ------------------------------------------------------ scope */}
          <section aria-labelledby="scope-heading">
            <h2
              id="scope-heading"
              className="text-[clamp(1.3rem,3vw,1.6rem)] font-semibold text-ink"
            >
              Recommended scope
            </h2>
            <p className="mt-3 max-w-prose text-[14.5px] leading-relaxed text-ink-secondary">
              Each engagement below was triggered by a specific answer in your audit. The
              rationale is quoted so nothing here is a guess.
            </p>

            {proposal.lineItems.length > 0 ? (
              <ol className="mt-6 flex flex-col gap-4">
                {proposal.lineItems.map((item, index) => (
                  <li key={item.serviceId}>
                    <Card className="p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="tabular text-[12px] text-ink-muted">
                            {`${index + 1}`.padStart(2, "0")} · {item.phase}
                          </p>
                          <h3 className="mt-1.5 text-[16px] font-semibold text-ink">
                            {item.name}
                          </h3>
                          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-ink-secondary">
                            {item.summary}
                          </p>
                        </div>
                        <PriorityBadge priority={item.priority} />
                      </div>

                      <dl className="mt-5 grid gap-3 border-y border-hairline py-4 sm:grid-cols-3">
                        <div>
                          <dt className="text-[12px] text-ink-muted">Estimated effort</dt>
                          <dd className="tabular mt-0.5 text-sm text-ink">
                            {item.effortDays} consultant-days
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[12px] text-ink-muted">Timeline</dt>
                          <dd className="mt-0.5 text-sm text-ink">{item.timeline}</dd>
                        </div>
                        <div>
                          <dt className="text-[12px] text-ink-muted">Investment</dt>
                          <dd className="tabular mt-0.5 text-sm text-ink">
                            {formatBudgetRange(item.costMin, item.costMax)}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-5 grid gap-6 sm:grid-cols-2">
                        <div>
                          <h4 className="text-[12px] font-medium uppercase tracking-wider text-ink-muted">
                            Deliverables
                          </h4>
                          <ul className="mt-3 flex flex-col gap-2">
                            {item.deliverables.map((deliverable) => (
                              <li
                                key={deliverable}
                                className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-secondary"
                              >
                                <span
                                  aria-hidden
                                  className="mt-2 size-1 shrink-0 rounded-full bg-ink-muted"
                                />
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
                            {item.benefits.map((benefit) => (
                              <li
                                key={benefit}
                                className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-secondary"
                              >
                                <span
                                  aria-hidden
                                  className="mt-2 size-1 shrink-0 rounded-full bg-accent"
                                />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <p className="mt-5 rounded-xl border border-hairline bg-surface-sunken p-4 text-[13.5px] leading-relaxed text-ink-secondary">
                        {item.rationale}
                      </p>
                    </Card>
                  </li>
                ))}
              </ol>
            ) : (
              <Card className="mt-6 p-6">
                <p className="text-sm leading-relaxed text-ink-secondary">
                  Your answers did not trigger any remediation work. We would propose a
                  light retainer to maintain the current standard and to catch
                  regressions before they reach revenue.
                </p>
              </Card>
            )}
          </section>

          {/* ------------------------------------------------------- schedule */}
          <section aria-labelledby="schedule-heading">
            <h2
              id="schedule-heading"
              className="text-[clamp(1.3rem,3vw,1.6rem)] font-semibold text-ink"
            >
              Delivery schedule
            </h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {proposal.phases.map((phase) => (
                <Card key={phase.key} className="flex flex-col p-6">
                  <p className="text-[12px] uppercase tracking-wider text-ink-muted">
                    {phase.window}
                  </p>
                  <h3 className="mt-1.5 text-[15px] font-semibold text-ink">{phase.title}</h3>
                  <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-ink-secondary">
                    {phase.objective}
                  </p>
                  <p className="tabular mt-4 border-t border-hairline pt-4 text-[13px] text-ink-muted">
                    {phase.recommendations.length > 0
                      ? `${phase.recommendations.length} engagement${phase.recommendations.length === 1 ? "" : "s"} · ${phase.effortDays} days`
                      : "No work scheduled"}
                  </p>
                </Card>
              ))}
            </div>
          </section>

          {/* ----------------------------------------------------- assumptions */}
          <section aria-labelledby="assumptions-heading">
            <Card className="p-6 sm:p-8">
              <h2 id="assumptions-heading" className="text-[15px] font-semibold text-ink">
                Assumptions and terms
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {proposal.assumptions.map((assumption) => (
                  <li
                    key={assumption}
                    className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-secondary"
                  >
                    <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ink-muted" />
                    {assumption}
                  </li>
                ))}
              </ul>
            </Card>
          </section>

          {/* ------------------------------------------------------- next step */}
          <section className="no-print">
            <Card className="relative overflow-hidden p-8 text-center sm:p-12">
              <div aria-hidden className="aurora pointer-events-none absolute inset-0" />
              <div className="relative">
                <h2 className="text-[clamp(1.4rem,3.5vw,2rem)] font-semibold text-ink">
                  Take this to your team
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-secondary">
                  The PDF contains the full report and this proposal, referenced{" "}
                  {proposal.reference}.
                </p>
                <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                  <DownloadPdfButton report={report} label="Download the full PDF" />
                  <ButtonLink href="/report" variant="secondary" size="md">
                    Back to the report
                  </ButtonLink>
                </div>
              </div>
            </Card>
          </section>
        </article>
      </FlowShell>
      <SiteFooter />
    </>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-sunken px-4 py-3">
      <p className="text-[12px] text-ink-muted">{label}</p>
      <p className="tabular mt-1 text-[17px] font-semibold text-ink">{value}</p>
    </div>
  );
}
