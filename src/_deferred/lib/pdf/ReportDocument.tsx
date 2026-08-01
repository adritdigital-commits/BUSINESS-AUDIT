import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Report } from "@/lib/report";
import { formatBudgetRange } from "@/lib/format";

/**
 * PDF rendering of the audit report. Driven by the same `Report` object as
 * the on-screen view, so the two cannot disagree.
 *
 * Deliberately uses the built-in Helvetica family rather than the web UI's
 * Fraunces/Inter: registering remote fonts would make PDF generation depend
 * on a network fetch at request time.
 */

const C = {
  ink: "#151A20",
  body: "#3F4854",
  muted: "#6B7480",
  rule: "#DDE1E6",
  gold: "#9A7B12",
  red: "#B33A28",
  green: "#2F6349",
};

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontSize: 10, color: C.body, fontFamily: "Helvetica" },
  eyebrow: { fontSize: 8, letterSpacing: 2, color: C.gold, marginBottom: 8, fontFamily: "Helvetica-Bold" },
  h1: { fontSize: 22, color: C.ink, marginBottom: 6, fontFamily: "Helvetica-Bold" },
  meta: { fontSize: 9, color: C.muted, marginBottom: 22 },
  scoreRow: { flexDirection: "row", alignItems: "center", marginBottom: 24, borderBottom: `1pt solid ${C.rule}`, paddingBottom: 20 },
  scoreNumber: { fontSize: 44, fontFamily: "Helvetica-Bold" },
  scoreCaption: { fontSize: 8, letterSpacing: 1.5, color: C.muted, marginTop: 2 },
  summary: { flex: 1, marginLeft: 24, fontSize: 10.5, lineHeight: 1.5 },
  h2: { fontSize: 12, color: C.ink, marginTop: 18, marginBottom: 10, fontFamily: "Helvetica-Bold" },
  catRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottom: `0.5pt solid ${C.rule}` },
  catName: { fontSize: 10 },
  catScore: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  para: { fontSize: 10, lineHeight: 1.55, marginBottom: 10 },
  rec: { marginBottom: 10, paddingBottom: 9, borderBottom: `0.5pt solid ${C.rule}` },
  recHead: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  recName: { fontSize: 10.5, color: C.ink, fontFamily: "Helvetica-Bold", flex: 1, paddingRight: 10 },
  badge: { fontSize: 7.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  recMeta: { fontSize: 9, color: C.muted },
  phase: { marginBottom: 12 },
  phaseTitle: { fontSize: 10, color: C.ink, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  phaseBody: { fontSize: 9.5, color: C.muted, lineHeight: 1.45 },
  budgetBox: { marginTop: 6, marginBottom: 8, padding: 10, backgroundColor: "#F6F3E8" },
  footer: { position: "absolute", bottom: 26, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: C.muted, borderTop: `0.5pt solid ${C.rule}`, paddingTop: 8 },
});

function scoreColor(score: number) {
  if (score >= 70) return C.green;
  if (score >= 40) return C.gold;
  return C.red;
}

const PRIORITY_COLOR = { HIGH: C.red, MEDIUM: C.gold, LOW: C.green } as const;

export function ReportDocument({
  report,
  businessName,
  completedAt,
}: {
  report: Report;
  businessName?: string | null;
  completedAt?: Date | null;
}) {
  const generated = completedAt ?? new Date(report.generatedAt);

  return (
    <Document
      title={`Business Growth Audit${businessName ? ` — ${businessName}` : ""}`}
      author="RakeshProTech"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>RAKESHPROTECH · BUSINESS GROWTH AUDIT</Text>
        <Text style={styles.h1}>{businessName || "Your business"}</Text>
        <Text style={styles.meta}>
          Report generated {generated.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </Text>

        <View style={styles.scoreRow}>
          <View>
            <Text style={[styles.scoreNumber, { color: scoreColor(report.overall) }]}>
              {Math.round(report.overall)}
            </Text>
            <Text style={styles.scoreCaption}>MATURITY SCORE</Text>
          </View>
          <Text style={styles.summary}>
            Scored across {report.categoryScores.length} categories.
            {report.weaknesses.length > 0
              ? ` The fastest wins are in ${report.weaknesses.slice(0, 2).map((w) => w.name).join(" and ")}.`
              : " No critical gaps were found."}
          </Text>
        </View>

        <Text style={styles.h2}>Category scores</Text>
        {report.categoryScores.map((c) => (
          <View key={c.categoryId} style={styles.catRow}>
            <Text style={styles.catName}>{c.name}</Text>
            <Text style={[styles.catScore, { color: scoreColor(c.score) }]}>{Math.round(c.score)}</Text>
          </View>
        ))}

        {report.strengths.length > 0 && (
          <>
            <Text style={styles.h2}>Strengths</Text>
            <Text style={styles.para}>
              {report.strengths.map((s) => s.name).join(", ")} — already ahead of most businesses we audit.
            </Text>
          </>
        )}

        {report.weaknesses.length > 0 && (
          <>
            <Text style={styles.h2}>Biggest gaps</Text>
            <Text style={styles.para}>
              {report.weaknesses.map((s) => s.name).join(", ")} — where you are most exposed, and where the
              fastest wins usually live.
            </Text>
          </>
        )}

        <Footer />
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.h2}>Recommended next steps</Text>
        {report.recommendations.length === 0 && (
          <Text style={styles.para}>No urgent gaps found — a strong foundation across the board.</Text>
        )}
        {report.recommendations.map((r) => (
          <View key={r.serviceId} style={styles.rec} wrap={false}>
            <View style={styles.recHead}>
              <Text style={styles.recName}>{r.service}</Text>
              <Text style={[styles.badge, { color: PRIORITY_COLOR[r.priority] }]}>
                {r.priority} PRIORITY
              </Text>
            </View>
            <Text style={styles.recMeta}>
              {r.timeToFix ? `Timeline: ${r.timeToFix}   ·   ` : ""}
              Budget: {formatBudgetRange(r.costRangeMin ?? 0, r.costRangeMax ?? 0)}
            </Text>
          </View>
        ))}

        {report.budget.max > 0 && (
          <View style={styles.budgetBox}>
            <Text style={{ fontSize: 10 }}>
              Estimated investment across all recommendations:{" "}
              <Text style={{ fontFamily: "Helvetica-Bold", color: C.ink }}>
                {formatBudgetRange(report.budget.min, report.budget.max)}
              </Text>
            </Text>
          </View>
        )}

        <Text style={styles.h2}>90-day roadmap</Text>
        {(
          [
            ["Days 1–30 · Fix critical gaps", report.roadmap.days1to30],
            ["Days 31–60 · Build growth systems", report.roadmap.days31to60],
            ["Days 61–90 · Scale & automate", report.roadmap.days61to90],
          ] as const
        ).map(([phase, items]) => (
          <View key={phase} style={styles.phase} wrap={false}>
            <Text style={styles.phaseTitle}>{phase}</Text>
            <Text style={styles.phaseBody}>
              {items.length ? items.map((i) => i.service).join(", ") : "Maintain & monitor current performance"}
            </Text>
          </View>
        ))}

        <Footer />
      </Page>
    </Document>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text>RakeshProTech · Business Growth Audit</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}
