import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import type { Report } from "@/lib/audit/report";
import { buildProposal } from "@/lib/audit/proposal";
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
  scoreBlock: {
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 6,
    padding: 16,
    marginTop: 14,
  },
  bigScore: { fontSize: 44, fontFamily: "Helvetica-Bold", lineHeight: 1.1 },
  track: {
    height: 5,
    backgroundColor: "#eef0f4",
    borderRadius: 3,
    marginTop: 5,
  },
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
  card: {
    borderWidth: 1,
    borderColor: RULE,
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
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
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

// `wrap={false}` keeps the number and the title on the same page — without it
// a section head that lands near a page break splits into a widow.
//
// It is only ever used on boxes of a small, fixed size, like this one and the
// category meters. Never put it on a box whose height grows with the data: an
// unwrappable box that outgrows the space left on the page makes the layout
// engine compute a negative height, and rendering its border then fails with
// "unsupported number: -8.8e+21". Use `minPresenceAhead` on those instead —
// it asks for a page break rather than forbidding one. See
// AuditPdfDocument.test.tsx, which renders the longest document the question
// bank can produce.
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

export function AuditPdfDocument({ report }: { report: Report }) {
  const proposal = buildProposal(report);
  const issued = new Date(report.generatedAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Document
      title={`Growth Audit — ${report.business.businessName || "Report"}`}
      author="RakeshProTech"
      subject="Business Growth Audit"
    >
      {/* --------------------------------------------------- page 1: summary */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>RAKESHPROTECH · BUSINESS GROWTH AUDIT</Text>
        <Text style={styles.h1}>{report.business.businessName || "Your business"}</Text>
        <Text style={styles.meta}>
          Prepared for {report.client.fullName || "you"}
          {report.client.role ? `, ${report.client.role}` : ""}
          {report.client.email ? ` · ${report.client.email}` : ""}
        </Text>
        <Text style={[styles.meta, { marginTop: 2 }]}>
          {issued} · Reference {proposal.reference}
          {report.completeness < 100 ? ` · ${report.completeness}% of questions answered` : ""}
        </Text>

        <View style={styles.scoreBlock}>
          <View style={styles.spread}>
            <View style={{ width: 150 }}>
              <Text style={[styles.bigScore, { color: bandColor(report.overall) }]}>
                {Math.round(report.overall)}
              </Text>
              <Text style={{ fontSize: 9, color: INK_MUTED }}>
                out of 100 · {bandLabel(report.overall)}
              </Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 16 }}>
              <Text style={styles.h3}>
                {report.maturity.title} — stage {report.maturity.step} of 5
              </Text>
              <Text style={styles.body}>{report.maturity.summary}</Text>
              <Text style={[styles.h3, { marginTop: 10 }]}>
                Risk level: {report.risk.label}
              </Text>
              <Text style={styles.body}>{report.risk.summary}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionHead eyebrow="01" title="Category scores" />
          {report.scores.categoryScores.map((category) => (
            <Meter
              key={category.categoryId}
              label={category.name}
              score={category.score}
              sub={`${bandLabel(category.score)} · ${category.answered} of ${category.total} answered · weight ×${category.weight}`}
            />
          ))}
        </View>

        <Footer reference={proposal.reference} />
      </Page>

      {/* ------------------------------------------ page 2: priorities & plan */}
      <Page size="A4" style={styles.page}>
        <View minPresenceAhead={96}>
          <SectionHead eyebrow="02" title="Strengths and weaknesses" />
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.h3}>Strengths</Text>
              {report.strengths.length > 0 ? (
                <Bullets
                  items={report.strengths.map(
                    (c) => `${c.name} — ${Math.round(c.score)}/100`
                  )}
                />
              ) : (
                <Text style={styles.body}>
                  No category scored 70 or above. The first roadmap phase is the fastest
                  route to one.
                </Text>
              )}
            </View>
            <View style={{ flex: 1, paddingLeft: 10 }}>
              <Text style={styles.h3}>Weaknesses</Text>
              {report.weaknesses.length > 0 ? (
                <Bullets
                  items={report.weaknesses.map(
                    (c) => `${c.name} — ${Math.round(c.score)}/100`
                  )}
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
          <SectionHead eyebrow="03" title="Investment priority" />
          {report.recommendations.length > 0 ? (
            <View>
              <View style={styles.tableHead}>
                <Text style={[styles.th, { flex: 3 }]}>ENGAGEMENT</Text>
                <Text style={[styles.th, { flex: 1 }]}>PRIORITY</Text>
                <Text style={[styles.th, { flex: 1 }]}>EFFORT</Text>
                <Text style={[styles.th, { flex: 1.6, textAlign: "right" }]}>INVESTMENT</Text>
              </View>
              {report.recommendations.map((recommendation) => (
                <View key={recommendation.service.id} style={styles.tableRow}>
                  <Text style={[styles.td, { flex: 3 }]}>{recommendation.service.name}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>{recommendation.priority}</Text>
                  <Text style={[styles.td, { flex: 1 }]}>
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
                <Text style={[styles.td, { flex: 1 }]} />
                <Text style={[styles.td, { flex: 1, fontFamily: "Helvetica-Bold", color: INK }]}>
                  {report.effortDays}d
                </Text>
                <Text
                  style={[
                    styles.td,
                    { flex: 1.6, textAlign: "right", fontFamily: "Helvetica-Bold", color: INK },
                  ]}
                >
                  {formatBudgetRange(report.investment.min, report.investment.max)}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.body}>
              No remediation work was triggered by your answers. The recommended next
              step is a maintenance and optimisation cadence.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <SectionHead eyebrow="04" title="90-day priority roadmap" />
          {report.roadmap.map((phase) => (
            <View key={phase.key} style={styles.card} minPresenceAhead={72}>
              <View style={styles.spread}>
                <Text style={styles.h3}>
                  {phase.window} — {phase.title}
                </Text>
                {phase.recommendations.length > 0 ? (
                  <Text style={{ fontSize: 9, color: INK_MUTED }}>
                    {phase.effortDays}d ·{" "}
                    {formatBudgetRange(phase.investmentMin, phase.investmentMax)}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.body, { marginBottom: 6 }]}>{phase.objective}</Text>
              {phase.recommendations.length > 0 ? (
                <Bullets
                  items={phase.recommendations.map(
                    (r) => `${r.service.name} — ${r.service.timeline}`
                  )}
                />
              ) : (
                <Text style={styles.body}>
                  Nothing scheduled — maintain and measure what the earlier phases put in
                  place.
                </Text>
              )}
            </View>
          ))}
        </View>

        <Footer reference={proposal.reference} />
      </Page>

      {/* ------------------------------------------------ page 3: the services */}
      {report.recommendations.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <SectionHead eyebrow="05" title="Recommended services" />
          {report.recommendations.map((recommendation) => (
            <View key={recommendation.service.id} style={styles.card} minPresenceAhead={72}>
              <View style={styles.spread}>
                <Text style={styles.h3}>{recommendation.service.name}</Text>
                <Text style={{ fontSize: 8.5, color: bandColorForPriority(recommendation.priority) }}>
                  {recommendation.priority} PRIORITY
                </Text>
              </View>
              <Text style={[styles.body, { marginBottom: 6 }]}>
                {recommendation.service.summary}
              </Text>
              <Text style={{ fontSize: 8.5, color: INK_MUTED, marginBottom: 6 }}>
                {recommendation.service.effortDays} consultant-days ·{" "}
                {recommendation.service.timeline} ·{" "}
                {formatBudgetRange(
                  recommendation.service.costMin,
                  recommendation.service.costMax
                )}
              </Text>
              <Text style={[styles.th, { marginBottom: 3 }]}>DELIVERABLES</Text>
              <Bullets items={recommendation.service.deliverables} />
              <Text style={[styles.th, { marginTop: 6, marginBottom: 3 }]}>BENEFITS</Text>
              <Bullets items={recommendation.service.benefits} />
            </View>
          ))}
          <Footer reference={proposal.reference} />
        </Page>
      ) : null}

      {/* --------------------------------------------------- page 4: proposal */}
      <Page size="A4" style={styles.page}>
        <SectionHead eyebrow="06" title="Proposal summary" />
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

function bandColorForPriority(priority: string): string {
  if (priority === "HIGH") return CRITICAL;
  if (priority === "MEDIUM") return WARNING;
  return GOOD;
}

/** Renders the document to a Blob. Browser-only — called from a click handler. */
export async function renderAuditPdf(report: Report): Promise<Blob> {
  return pdf(<AuditPdfDocument report={report} />).toBlob();
}
