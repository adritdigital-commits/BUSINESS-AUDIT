import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { loadDashboardData } from "@/lib/dashboardData";
import { DashboardChrome, EmptyState, PageTitle } from "@/components/dashboard/DashboardChrome";
import { AssessmentCard } from "@/components/dashboard/AssessmentCard";
import { btnGhost, btnPrimary, colors, fonts, scoreColor } from "@/components/ui/theme";

export const metadata: Metadata = { title: "Dashboard — RakeshProTech" };

// Always reflects the latest assessment state.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/dashboard");

  const data = await loadDashboardData(profile);
  const isStaff = profile.role === "ADMIN" || profile.role === "STAFF";
  const displayName = profile.fullName?.split(" ")[0] ?? data.businessName ?? "there";

  return (
    <DashboardChrome email={profile.email} isStaff={isStaff}>
      <PageTitle
        eyebrow={data.businessName ? data.businessName.toUpperCase() : "YOUR ACCOUNT"}
        title={`Welcome back, ${displayName}.`}
      />

      {data.assessments.length === 0 ? (
        <EmptyState
          title="You haven't run an audit yet"
          body="The Business Growth Audit takes about six minutes and gives you a Digital Maturity Score plus a prioritized 90-day roadmap."
          action={
            <Link href="/" style={{ ...btnPrimary, textDecoration: "none", display: "inline-block" }}>
              Start your first audit
            </Link>
          }
        />
      ) : (
        <>
          {data.latestCompleted && (
            <section
              style={{
                background: colors.surface,
                border: `1px solid ${colors.surfaceAlt}`,
                borderRadius: 10,
                padding: "24px 22px",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 24,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ color: colors.muted, fontSize: 12.5, marginBottom: 6 }}>
                  CURRENT MATURITY SCORE
                </div>
                <div
                  style={{
                    fontFamily: fonts.serif,
                    fontSize: 48,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: scoreColor(data.latestCompleted.overallScore ?? 0),
                  }}
                >
                  {Math.round(data.latestCompleted.overallScore ?? 0)}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ color: colors.mutedAlt, fontSize: 14, lineHeight: 1.6, margin: "0 0 14px" }}>
                  Based on your most recent completed audit. Re-run it any time to track progress.
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Link
                    href={`/report/${data.latestCompleted.id}`}
                    style={{ ...btnPrimary, textDecoration: "none", display: "inline-block", padding: "11px 20px", fontSize: 14 }}
                  >
                    View full report
                  </Link>
                  <Link href="/" style={{ ...btnGhost, textDecoration: "none", display: "inline-block" }}>
                    Run a new audit
                  </Link>
                </div>
              </div>
            </section>
          )}

          {data.inProgress && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={sectionHeading}>Pick up where you left off</h2>
              <AssessmentCard assessment={data.inProgress} />
            </section>
          )}

          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <h2 style={sectionHeading}>Recent audits</h2>
              <Link href="/dashboard/history" style={{ color: colors.gold, fontSize: 13.5 }}>
                View all ({data.assessments.length})
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.assessments.slice(0, 3).map((assessment) => (
                <AssessmentCard key={assessment.id} assessment={assessment} />
              ))}
            </div>
          </section>

          {!data.latestCompleted && (
            <p style={{ color: colors.muted, fontSize: 13.5, marginTop: 24 }}>
              Finish an audit to unlock your Digital Maturity Score and roadmap.
            </p>
          )}
        </>
      )}
    </DashboardChrome>
  );
}

const sectionHeading: React.CSSProperties = {
  fontFamily: fonts.serif,
  fontSize: 17,
  color: colors.text,
  margin: "0 0 14px",
};
