import React from "react";
import type { Priority } from "@prisma/client";
import type { Report } from "@/lib/report";
import { formatBudgetRange } from "@/lib/format";
import { colors, fonts, scoreColor } from "@/components/ui/theme";

const priorityMeta: Record<Priority, { color: string; label: string }> = {
  HIGH: { color: colors.red, label: "High priority" },
  MEDIUM: { color: colors.gold, label: "Medium priority" },
  LOW: { color: colors.green, label: "Low priority" },
};

/**
 * Presentational report, shared by the standalone report page and the PDF
 * renderer. AuditApp keeps its own inline copy for now — consolidating the
 * two is tracked as technical debt rather than risked mid-release.
 */
export function ReportView({ report, businessName }: { report: Report; businessName?: string | null }) {
  return (
    <>
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center", marginBottom: 44 }}>
        <ScoreDial score={report.overall} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ color: colors.mutedAlt, fontSize: 15, lineHeight: 1.65, margin: 0 }}>
            {businessName ? <strong style={{ color: colors.text }}>{businessName}</strong> : "Your business"} scored{" "}
            <strong style={{ color: scoreColor(report.overall) }}>{Math.round(report.overall)} / 100</strong> across{" "}
            {report.categoryScores.length} categories.{" "}
            {report.weaknesses.length > 0
              ? `The fastest wins are in ${report.weaknesses.slice(0, 2).map((w) => w.name).join(" and ")}.`
              : "No critical gaps were found."}
          </p>
        </div>
      </div>

      <SectionTitle>Category scores</SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
          marginBottom: 40,
        }}
      >
        {report.categoryScores.map((c) => (
          <div key={c.categoryId} style={{ background: colors.surface, border: `1px solid ${colors.surfaceAlt}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
              <span style={{ color: colors.text, fontSize: 14 }}>{c.name}</span>
              <span style={{ color: scoreColor(c.score), fontWeight: 700 }}>{Math.round(c.score)}</span>
            </div>
            <div style={{ height: 6, background: colors.surfaceAlt, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${c.score}%`, background: scoreColor(c.score) }} />
            </div>
          </div>
        ))}
      </div>

      {report.strengths.length > 0 && (
        <>
          <SectionTitle>Strengths</SectionTitle>
          <p style={{ color: colors.mutedAlt, marginBottom: 32, lineHeight: 1.6 }}>
            {report.strengths.map((s) => s.name).join(", ")} — already ahead of most businesses we audit.
          </p>
        </>
      )}

      {report.weaknesses.length > 0 && (
        <>
          <SectionTitle>Biggest gaps</SectionTitle>
          <p style={{ color: colors.mutedAlt, marginBottom: 32, lineHeight: 1.6 }}>
            {report.weaknesses.map((s) => s.name).join(", ")} — where you&apos;re most exposed, and where the fastest wins usually live.
          </p>
        </>
      )}

      <SectionTitle>Recommended next steps</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {report.recommendations.map((r) => (
          <div
            key={r.serviceId}
            style={{
              background: colors.surface,
              border: `1px solid ${colors.surfaceAlt}`,
              borderRadius: 10,
              padding: "16px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div style={{ color: colors.text, fontSize: 15, marginBottom: 4 }}>{r.service}</div>
              <div style={{ color: colors.muted, fontSize: 12.5 }}>
                {r.timeToFix ? <>Timeline: {r.timeToFix} &nbsp;·&nbsp; </> : null}
                Budget: {formatBudgetRange(r.costRangeMin ?? 0, r.costRangeMax ?? 0)}
              </div>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0.5,
                padding: "5px 10px",
                borderRadius: 20,
                color: priorityMeta[r.priority].color,
                border: `1px solid ${priorityMeta[r.priority].color}55`,
                background: `${priorityMeta[r.priority].color}14`,
              }}
            >
              {priorityMeta[r.priority].label.toUpperCase()}
            </span>
          </div>
        ))}
        {report.recommendations.length === 0 && (
          <p style={{ color: colors.mutedAlt }}>No urgent gaps found — strong foundation across the board.</p>
        )}
      </div>

      {report.budget.max > 0 && (
        <p style={{ color: colors.muted, fontSize: 13.5, marginBottom: 44 }}>
          Estimated investment across all recommendations:{" "}
          <span style={{ color: colors.gold, fontWeight: 600 }}>
            {formatBudgetRange(report.budget.min, report.budget.max)}
          </span>
        </p>
      )}

      <SectionTitle>90-day roadmap</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", marginBottom: 32 }}>
        {(
          [
            ["Days 1–30 · Fix critical gaps", report.roadmap.days1to30],
            ["Days 31–60 · Build growth systems", report.roadmap.days31to60],
            ["Days 61–90 · Scale & automate", report.roadmap.days61to90],
          ] as const
        ).map(([phase, items], i) => (
          <div key={phase} style={{ display: "flex", gap: 18, paddingBottom: 22 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: colors.gold, marginTop: 4 }} />
              {i < 2 && <div style={{ width: 1, flex: 1, background: colors.border, marginTop: 4 }} />}
            </div>
            <div>
              <div style={{ color: colors.text, fontWeight: 600, marginBottom: 6 }}>{phase}</div>
              <div style={{ color: colors.muted, fontSize: 13.5 }}>
                {items.length ? items.map((b) => b.service).join(", ") : "Maintain & monitor current performance"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function ScoreDial({ score, size = 150 }: { score: number; size?: number }) {
  const r = (size - 18) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${Math.round(score)} of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.surfaceAlt} strokeWidth={12} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={scoreColor(score)}
        strokeWidth={12}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="47%" textAnchor="middle" fontSize={size * 0.26} fontWeight={700} fill={colors.text} fontFamily={fonts.serif}>
        {Math.round(score)}
      </text>
      <text x="50%" y="63%" textAnchor="middle" fontSize={size * 0.08} letterSpacing={2} fill={colors.muted} fontFamily={fonts.sans}>
        MATURITY
      </text>
    </svg>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: fonts.serif, fontSize: 17, color: colors.text, margin: "0 0 14px" }}>{children}</h2>
  );
}
