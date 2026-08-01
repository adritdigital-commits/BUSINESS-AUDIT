import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { loadDashboardData, summarizeProgress, type DashboardAssessment } from "@/lib/dashboardData";
import { DashboardChrome, EmptyState, PageTitle } from "@/components/dashboard/DashboardChrome";
import { AssessmentCard } from "@/components/dashboard/AssessmentCard";
import { btnPrimary, colors, fonts, scoreColor } from "@/components/ui/theme";

export const metadata: Metadata = { title: "Assessment history — RakeshProTech" };
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/dashboard/history");

  const data = await loadDashboardData(profile);
  const isStaff = profile.role === "ADMIN" || profile.role === "STAFF";
  const progress = summarizeProgress(data.assessments);

  return (
    <DashboardChrome email={profile.email} isStaff={isStaff}>
      <PageTitle eyebrow="ASSESSMENT HISTORY" title="Every audit you've run." />

      {data.assessments.length === 0 ? (
        <EmptyState
          title="No audits yet"
          body="Once you complete an audit it will appear here, so you can track how your score moves over time."
          action={
            <Link href="/" style={{ ...btnPrimary, textDecoration: "none", display: "inline-block" }}>
              Start your first audit
            </Link>
          }
        />
      ) : (
        <>
          {progress && (
            <div
              style={{
                background: colors.surface,
                border: `1px solid ${colors.surfaceAlt}`,
                borderRadius: 10,
                padding: "20px 22px",
                marginBottom: 28,
                display: "flex",
                gap: 32,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Stat label="COMPLETED AUDITS" value={String(progress.completedCount)} />
              <Stat
                label="LATEST SCORE"
                value={String(Math.round(progress.latestScore))}
                color={scoreColor(progress.latestScore)}
              />
              {progress.delta !== null && (
                <Stat
                  label="SINCE FIRST AUDIT"
                  value={`${progress.delta > 0 ? "+" : ""}${Math.round(progress.delta)}`}
                  color={progress.delta >= 0 ? colors.green : colors.red}
                />
              )}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.assessments.map((assessment: DashboardAssessment) => (
              <AssessmentCard key={assessment.id} assessment={assessment} />
            ))}
          </div>
        </>
      )}
    </DashboardChrome>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ color: colors.muted, fontSize: 11, letterSpacing: 1, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: fonts.serif, fontSize: 28, fontWeight: 700, color: color ?? colors.text, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
