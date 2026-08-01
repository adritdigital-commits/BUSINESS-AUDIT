import { Document, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { Assessment } from "@/engine";
import { businessAgeLabel, businessTypeLabel, goalLabel, teamSizeLabel } from "@/engine/businessProfile";
import { buildProposal } from "@/engine/proposalEngine";
import { activePhases } from "@/engine/roadmapEngine";
import { formatBudgetRange } from "@/lib/format";

/**
 * The downloadable report.
 *
 * This module is only ever reached through the dynamic import in
 * `download.ts`, so `@react-pdf/renderer` never enters the server bundle or
 * the initial client chunk. It uses the built-in Helvetica family — no font is
 * fetched at generation time, so export works with no network at all.
 *
 * The PDF is set on a light surface: it is printed and forwarded, where the
 * dark screen theme would be unreadable and wasteful.
 */

const INK = "#14171d";
const INK_SOFT = "#4c5361";
const INK_MUTED = "#767e8c";
const RULE = "#dfe3e9";
const ACCENT = "#a97f10";
const GOOD = "#0ca30c";
const WARNING = "#b07c05";
const CRITICAL = "#d03b3b";

function bandColor(score: number): string {
  if (score >= 70) return GOOD;
  if (score >= 40) return WARNING;
  return CRITICAL;
}

function bandLabel(score: number): string {
  if (score >= 70) return "Strong";
  if (score >= 40) return "Developing";
  return "At risk";
}

function priorityColor(priority: string): string {
  if (priority === "HIGH") return CRITICAL;
  if (priority === "MEDIUM") return WARNING;
  return GOOD;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: INK,
    lineHeight: 1.5,
  },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.4,
    color: ACCENT,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  h1: { fontSize: 24, fontFamily: "Helvetica-Bold", marginBottom: 10, lineHeight: 1.2 },
  h2: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  meta: { fontSize: 9.5, color: INK_SOFT },
  section: { marginTop: 20 },
  sectionHead: {
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    paddingBottom: 6,
    marginBottom: 10,
  },
  body: { fontSize: 9.5, color: INK_SOFT },
  row: { flexDirection: "row" },
  spread: { flexDirection: "row", justifyContent: "space-between" },
  scoreBlock: { borderWidth: 1, borderColor: RULE, borderRadius: 6, padding: 16, marginTop: 14 },
  bigScore: { fontSize: 44, fontFamily: "Helvetica-Bold", lineHeight: 1.1 },
  track: { height: 5, backgroundColor: "#eef0f4", borderRadius: 3, marginTop: 5 },
  fill: { height: 5, borderRadius: 3 },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    paddingBottom: 5,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f2f5",
  },
  th: { fontSize: 8, letterSpacing: 0.6, color: INK_MUTED, fontFamily: "Helvetica-Bold" },
  td: { fontSize: 9, color: INK_SOFT },
  bullet: { flexDirection: "row", marginBottom: 3 },
  dot: { width: 10, fontSize: 9, color: INK_MUTED },
  card: { borderWidth: 1, borderColor: RULE, borderRadius: 6, padding: 12, marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
    fontSize: 8,
    color: INK_SOFT,
  },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: INK_MUTED,
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 8,
  },
});

function Footer({ reference }: { reference: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>RakeshProTech · Business Growth Audit · {reference}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

/**
 * `wrap={false}` keeps the number and the title on the same page — without it
 * a section head that lands near a page break splits into a widow.
 *
 * THE RULE, learned twice from the same crash: pagination hints belong only on
 * boxes of a small, fixed size — this one and the meters. Never put
 * `wrap={false}` OR `minPresenceAhead` on a box whose height grows with the
 * data. Both reserve space the layout engine may not have, and when the box
 * outgrows what is left on the page the engine computes a negative height;
 * rendering any border then fails with "unsupported number: -8.8e+21".
 *
 * A long card splitting across a page break is fine. A crashed export is not.
 * `AuditPdfDocument.test.tsx` renders the longest documents the question bank
 * can produce, which is what catches this.
 */
function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.sectionHead} wrap={false}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.h2}>{title}</Text>
    </View>
  );
}

function Meter({ label, score, sub }: { label: string; score: number; sub: string }) {
  const value = Math.round(score);
  return (
    <View style={{ marginBottom: 8 }} wrap={false}>
      <View style={styles.spread}>
        <Text style={{ fontSize: 9.5 }}>{label}</Text>
        <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold" }}>{value}/100</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.max(value, 1)}%`, backgroundColor: bandColor(value) },
          ]}
        />
      </View>
      <Text style={{ fontSize: 8, color: INK_MUTED, marginTop: 3 }}>{sub}</Text>
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item) => (
        <View key={item} style={styles.bullet}>
          <Text style={styles.dot}>•</Text>
          <Text style={[styles.body, { flex: 1 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function AuditPdfDocument({ assessment }: { assessment: Assessment }) {
  const proposal = buildProposal(assessment);
  const scores = assessment.scores;
  const phases = activePhases(assessment.roadmap);
  const issued = new Date(assessment.generatedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={`Growth Audit — ${assessment.profile.businessName || "Report"}`}
      author="RakeshProTech"
      subject="Adaptive Business Growth Audit"
    >
      {/* --------------------------------------------------- page 1: summary */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>RAKESHPROTECH · BUSINESS GROWTH AUDIT</Text>
        <Text style={styles.h1}>{assessment.profile.businessName || "Your business"}</Text>
        <Text style={styles.meta}>
          Prepared for {assessment.contact.fullName || "you"}
          {assessment.contact.role ? `, ${assessment.contact.role}` : ""}
          {assessment.contact.email ? ` · ${assessment.contact.email}` : ""}
        </Text>
        <Text style={[styles.meta, { marginTop: 2 }]}>
          {assessment.industry.label} ·{" "}
          {businessTypeLabel(assessment.profile.businessType || undefined)} ·{" "}
          {teamSizeLabel(assessment.profile.teamSize || undefined)} ·{" "}
          {businessAgeLabel(assessment.profile.businessAge || undefined)}
        </Text>
        <Text style={[styles.meta, { marginTop: 2 }]}>
          {issued} · Reference {proposal.reference} · {scores.answered} of {scores.asked}{" "}
          questions answered · {scores.confidence.label.toLowerCase()} confidence
        </Text>

        <View style={styles.scoreBlock}>
          <View style={styles.spread}>
            <View style={{ width: 150 }}>
              <Text style={[styles.bigScore, { color: bandColor(scores.overall) }]}>
                {Math.round(scores.overall)}
              </Text>
              <Text style={{ fontSize: 9, color: INK_MUTED }}>
                out of 100 · {bandLabel(scores.overall)}
              </Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 16 }}>
              <Text style={styles.h3}>
                {scores.maturity.title} — stage {scores.maturity.step} of 5
              </Text>
              <Text style={styles.body}>{scores.maturity.summary}</Text>
            </View>
          </View>

          <View style={[styles.row, { marginTop: 14, borderTopWidth: 1, borderTopColor: RULE, paddingTop: 12 }]}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.th}>BUSINESS RISK</Text>
              <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: bandColor(100 - scores.risk.index) }}>
                {scores.risk.label}
              </Text>
              <Text style={{ fontSize: 8, color: INK_MUTED }}>Index {scores.risk.index}/100</Text>
            </View>
            <View style={{ flex: 1, paddingHorizontal: 8 }}>
              <Text style={styles.th}>GROWTH OPPORTUNITY</Text>
              <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold" }}>
                {scores.opportunity.label}
              </Text>
              <Text style={{ fontSize: 8, color: INK_MUTED }}>
                Headroom {scores.opportunity.index}/100
              </Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 8 }}>
              <Text style={styles.th}>CONFIDENCE</Text>
              <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold" }}>
                {scores.confidence.label}
              </Text>
              <Text style={{ fontSize: 8, color: INK_MUTED }}>{scores.confidence.percent}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHead eyebrow="01" title="Capability scores" />
          {scores.domains.map((domain) => (
            <Meter
              key={domain.domainId}
              label={domain.name}
              score={domain.score}
              sub={
                domain.notAssessed
                  ? "Not assessed"
                  : `${bandLabel(domain.score)} · ${domain.answered} of ${domain.asked} answered · weight ×${domain.weight}`
              }
            />
          ))}
        </View>

        <View style={styles.section}>
          <SectionHead eyebrow="02" title="How this assessment was built" />
          <Text style={styles.body}>{assessment.industry.narrative}</Text>
          <View style={[styles.row, { flexWrap: "wrap", marginTop: 8 }]}>
            {assessment.industry.injectedTopics.map((topic) => (
              <Text key={topic} style={styles.chip}>
                {topic}
              </Text>
            ))}
          </View>
          <Text style={[styles.body, { marginTop: 6 }]}>
            {assessment.plan.baseCount} questions selected for this profile
            {assessment.plan.followUpCount > 0
              ? `, plus ${assessment.plan.followUpCount} unlocked by the answers given`
              : ""}
            . Stated priorities:{" "}
            {assessment.profile.priorities.map((goal) => goalLabel(goal)).join(", ") || "—"}.
          </Text>
        </View>

        <Footer reference={proposal.reference} />
      </Page>

      {/* -------------------------------------- page 2: findings & priorities */}
      <Page size="A4" style={styles.page}>
        <View>
          <SectionHead eyebrow="03" title="Strengths and weaknesses" />
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.h3}>Strengths</Text>
              {assessment.strengths.length > 0 ? (
                <Bullets
                  items={assessment.strengths.map((d) => `${d.name} — ${Math.round(d.score)}/100`)}
                />
              ) : (
                <Text style={styles.body}>
                  No capability scored 70 or above. The first roadmap phase is the fastest route
                  to one.
                </Text>
              )}
            </View>
            <View style={{ flex: 1, paddingLeft: 10 }}>
              <Text style={styles.h3}>Weaknesses</Text>
              {assessment.weaknesses.length > 0 ? (
                <Bullets
                  items={assessment.weaknesses.map((d) => `${d.name} — ${Math.round(d.score)}/100`)}
                />
              ) : (
                <Text style={styles.body}>
                  Nothing scored below 55 — no structural weakness to remediate.
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHead eyebrow="04" title="Investment priority" />
          {assessment.recommendations.length > 0 ? (
            <View>
              <View style={styles.tableHead}>
                <Text style={[styles.th, { flex: 3 }]}>ENGAGEMENT</Text>
                <Text style={[styles.th, { flex: 1.1 }]}>PRIORITY</Text>
                <Text style={[styles.th, { flex: 1.2 }]}>IMPACT</Text>
                <Text style={[styles.th, { flex: 0.8 }]}>EFFORT</Text>
                <Text style={[styles.th, { flex: 1.6, textAlign: "right" }]}>INVESTMENT</Text>
              </View>
              {assessment.recommendations.map((recommendation) => (
                <View key={recommendation.service.id} style={styles.tableRow}>
                  <Text style={[styles.td, { flex: 3 }]}>{recommendation.service.name}</Text>
                  <Text
                    style={[
                      styles.td,
                      { flex: 1.1, color: priorityColor(recommendation.priority) },
                    ]}
                  >
                    {recommendation.priority}
                  </Text>
                  <Text style={[styles.td, { flex: 1.2 }]}>{recommendation.service.impact}</Text>
                  <Text style={[styles.td, { flex: 0.8 }]}>
                    {recommendation.service.effortDays}d
                  </Text>
                  <Text style={[styles.td, { flex: 1.6, textAlign: "right" }]}>
                    {formatBudgetRange(
                      recommendation.service.costMin,
                      recommendation.service.costMax
                    )}
                  </Text>
                </View>
              ))}
              <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.td, { flex: 3, fontFamily: "Helvetica-Bold", color: INK }]}>
                  Total
                </Text>
                <Text style={[styles.td, { flex: 1.1 }]} />
                <Text style={[styles.td, { flex: 1.2 }]} />
                <Text style={[styles.td, { flex: 0.8, fontFamily: "Helvetica-Bold", color: INK }]}>
                  {assessment.effortDays}d
                </Text>
                <Text
                  style={[
                    styles.td,
                    { flex: 1.6, textAlign: "right", fontFamily: "Helvetica-Bold", color: INK },
                  ]}
                >
                  {formatBudgetRange(assessment.investment.min, assessment.investment.max)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.body}>
              No remediation work was triggered by these answers. The recommended next step is a
              maintenance and optimisation cadence.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <SectionHead eyebrow="05" title="Priority roadmap" />
          {phases.length > 0 ? (
            phases.map((phase) => (
              <View key={phase.id} style={styles.card}>
                <View style={styles.spread}>
                  <Text style={styles.h3}>{phase.label}</Text>
                  <Text style={{ fontSize: 9, color: INK_MUTED }}>
                    {phase.effortDays}d ·{" "}
                    {formatBudgetRange(phase.investmentMin, phase.investmentMax)}
                  </Text>
                </View>
                <Text style={[styles.body, { marginBottom: 6 }]}>{phase.objective}</Text>
                {phase.tasks.map((task) => (
                  <View key={task.serviceId} style={{ marginBottom: 5 }}>
                    <Text style={{ fontSize: 9.5 }}>
                      {task.title}
                      <Text style={{ color: priorityColor(task.priority) }}>
                        {"  "}
                        {task.priority}
                      </Text>
                    </Text>
                    <Text style={{ fontSize: 8, color: INK_MUTED }}>
                      {task.difficulty} · {task.impact} impact · {task.effortDays} days ·{" "}
                      {formatBudgetRange(task.costMin, task.costMax)}
                    </Text>
                    <Text style={{ fontSize: 8, color: INK_MUTED }}>ROI: {task.roi}</Text>
                  </View>
                ))}
              </View>
            ))
          ) : (
            <Text style={styles.body}>
              Nothing needs scheduling. Maintain and measure what is already in place.
            </Text>
          )}
        </View>

        <Footer reference={proposal.reference} />
      </Page>

      {/* ------------------------------------------------ page 3: the services */}
      {assessment.recommendations.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <SectionHead eyebrow="06" title="Recommended services" />
          {assessment.recommendations.map((recommendation) => (
            <View key={recommendation.service.id} style={styles.card}>
              <View style={styles.spread}>
                <Text style={styles.h3}>{recommendation.service.name}</Text>
                <Text style={{ fontSize: 8.5, color: priorityColor(recommendation.priority) }}>
                  {recommendation.priority} PRIORITY
                </Text>
              </View>
              <Text style={[styles.body, { marginBottom: 6 }]}>
                {recommendation.service.summary}
              </Text>
              <Text style={{ fontSize: 8.5, color: INK_MUTED, marginBottom: 6 }}>
                {recommendation.service.effortDays} consultant-days ·{" "}
                {recommendation.service.timeline} · {recommendation.service.difficulty} ·{" "}
                {formatBudgetRange(
                  recommendation.service.costMin,
                  recommendation.service.costMax
                )}
              </Text>
              <Text style={[styles.th, { marginBottom: 3 }]}>DELIVERABLES</Text>
              <Bullets items={recommendation.service.deliverables} />
              <Text style={[styles.th, { marginTop: 6, marginBottom: 3 }]}>BENEFITS</Text>
              <Bullets items={recommendation.service.benefits} />
              {recommendation.findings[0] ? (
                <Text style={[styles.body, { marginTop: 6, fontSize: 8.5 }]}>
                  Triggered by: “{recommendation.findings[0].answerLabel}” —{" "}
                  {recommendation.findings[0].question}
                </Text>
              ) : null}
            </View>
          ))}
          <Footer reference={proposal.reference} />
        </Page>
      ) : null}

      {/* --------------------------------------------------- page 4: proposal */}
      <Page size="A4" style={styles.page}>
        <SectionHead eyebrow="07" title="Proposal summary" />
        <Text style={styles.h3}>{proposal.headline}</Text>
        <Text style={[styles.body, { marginTop: 4 }]}>{proposal.executiveSummary}</Text>

        <View style={[styles.scoreBlock, { marginTop: 16 }]}>
          <View style={styles.spread}>
            <View>
              <Text style={styles.th}>TOTAL EFFORT</Text>
              <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold" }}>
                {proposal.totalEffortDays} days
              </Text>
            </View>
            <View>
              <Text style={styles.th}>ENGAGEMENT WINDOW</Text>
              <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold" }}>
                {proposal.engagementWindow}
              </Text>
            </View>
            <View>
              <Text style={styles.th}>INVESTMENT</Text>
              <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold" }}>
                {formatBudgetRange(proposal.investmentMin, proposal.investmentMax)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.h3, { marginBottom: 6 }]}>Expected outcomes</Text>
          <Bullets items={proposal.outcomes} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.h3, { marginBottom: 6 }]}>Assumptions</Text>
          <Bullets items={proposal.assumptions} />
        </View>

        <View style={styles.section}>
          <Text style={styles.body}>
            Valid until{" "}
            {new Date(proposal.validUntil).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            . Scores and investment bands are indicative and confirmed on a scoping call.
          </Text>
        </View>

        <Footer reference={proposal.reference} />
      </Page>
    </Document>
  );
}

/** Renders the document to a Blob. Browser-only — called from a click handler. */
export async function renderAuditPdf(assessment: Assessment): Promise<Blob> {
  return pdf(<AuditPdfDocument assessment={assessment} />).toBlob();
}
