import React from "react";
import Link from "next/link";
import type { DashboardAssessment } from "@/lib/dashboardData";
import { colors, fonts, scoreColor } from "@/components/ui/theme";

const STATUS_LABEL: Record<DashboardAssessment["status"], string> = {
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  ABANDONED: "Abandoned",
};

const STATUS_COLOR: Record<DashboardAssessment["status"], string> = {
  IN_PROGRESS: colors.gold,
  COMPLETED: colors.green,
  ABANDONED: colors.muted,
};

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function AssessmentCard({ assessment }: { assessment: DashboardAssessment }) {
  const isComplete = assessment.status === "COMPLETED";
  const href = isComplete ? `/report/${assessment.id}` : `/audit/${assessment.id}`;
  const actionLabel = isComplete ? "View report" : "Resume audit";

  return (
    <div
      style={{
        background: colors.surface,
        border: `1px solid ${colors.surfaceAlt}`,
        borderRadius: 10,
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              padding: "4px 9px",
              borderRadius: 20,
              color: STATUS_COLOR[assessment.status],
              border: `1px solid ${STATUS_COLOR[assessment.status]}55`,
              background: `${STATUS_COLOR[assessment.status]}14`,
            }}
          >
            {STATUS_LABEL[assessment.status].toUpperCase()}
          </span>
          <span style={{ color: colors.muted, fontSize: 13 }}>
            {isComplete && assessment.completedAt
              ? `Completed ${formatDate(assessment.completedAt)}`
              : `Started ${formatDate(assessment.startedAt)}`}
          </span>
        </div>
        <div style={{ color: colors.mutedAlt, fontSize: 13.5 }}>
          {isComplete
            ? `${assessment.answeredCount} questions answered`
            : `${assessment.answeredCount} answered so far`}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {isComplete && assessment.overallScore !== null && (
          <div style={{ textAlign: "right" }}>
            <div style={{ color: colors.muted, fontSize: 11, letterSpacing: 1 }}>SCORE</div>
            <div
              style={{
                fontFamily: fonts.serif,
                fontSize: 24,
                fontWeight: 700,
                color: scoreColor(assessment.overallScore),
                lineHeight: 1.1,
              }}
            >
              {Math.round(assessment.overallScore)}
            </div>
          </div>
        )}
        <Link
          href={href}
          style={{
            color: colors.gold,
            fontSize: 13.5,
            textDecoration: "none",
            border: `1px solid ${colors.border}`,
            borderRadius: 8,
            padding: "9px 14px",
            whiteSpace: "nowrap",
          }}
        >
          {actionLabel} →
        </Link>
      </div>
    </div>
  );
}
