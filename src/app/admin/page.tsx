import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { loadAdminStats, loadRecentAssessments } from "@/lib/adminStats";
import { DashboardChrome, EmptyState, PageTitle } from "@/components/dashboard/DashboardChrome";
import { formatDate } from "@/components/dashboard/AssessmentCard";
import { colors, fonts, scoreColor } from "@/components/ui/theme";

export const metadata: Metadata = { title: "Admin — RakeshProTech" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin");
  if (profile.role !== "ADMIN" && profile.role !== "STAFF") redirect("/dashboard");

  const [stats, recent] = await Promise.all([loadAdminStats(), loadRecentAssessments()]);

  return (
    <DashboardChrome email={profile.email} isStaff>
      <PageTitle eyebrow={`${profile.role} DASHBOARD`} title="How the audit is performing." />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <StatCard label="CLIENTS" value={String(stats.clientCount)} />
        <StatCard label="AUDITS STARTED" value={String(stats.assessmentCount)} />
        <StatCard label="COMPLETED" value={String(stats.completedCount)} />
        <StatCard
          label="COMPLETION RATE"
          value={`${stats.completionRate}%`}
          color={stats.completionRate >= 50 ? colors.green : colors.gold}
        />
        <StatCard
          label="AVERAGE SCORE"
          value={stats.averageScore === null ? "—" : String(Math.round(stats.averageScore))}
          color={stats.averageScore === null ? undefined : scoreColor(stats.averageScore)}
        />
        <StatCard
          label="OPEN CONSULTATIONS"
          value={String(stats.openConsultations)}
          color={stats.openConsultations > 0 ? colors.gold : undefined}
        />
      </div>

      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionHeading}>Question bank</h2>
        <div
          style={{
            background: colors.surface,
            border: `1px solid ${colors.surfaceAlt}`,
            borderRadius: 10,
            padding: "18px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <p style={{ color: colors.mutedAlt, fontSize: 14, margin: 0 }}>
            {stats.categoryCount} active categories · {stats.questionCount} active questions
          </p>
          <Link
            href="/admin/questions"
            style={{
              color: colors.gold,
              fontSize: 13.5,
              textDecoration: "none",
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: "9px 14px",
            }}
          >
            Manage questions →
          </Link>
        </div>
      </section>

      <section>
        <h2 style={sectionHeading}>Recent audits</h2>
        {recent.length === 0 ? (
          <EmptyState title="No audits yet" body="Assessments will appear here as visitors start them." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.map((a) => (
              <div
                key={a.id}
                style={{
                  background: colors.surface,
                  border: `1px solid ${colors.surfaceAlt}`,
                  borderRadius: 10,
                  padding: "13px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: colors.text, fontSize: 14.5 }}>{a.businessName}</div>
                  <div style={{ color: colors.muted, fontSize: 12.5 }}>
                    {a.status.replace("_", " ").toLowerCase()} · started {formatDate(a.startedAt)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  {a.overallScore !== null && (
                    <span style={{ color: scoreColor(a.overallScore), fontWeight: 700, fontFamily: fonts.serif, fontSize: 18 }}>
                      {Math.round(a.overallScore)}
                    </span>
                  )}
                  <Link href={`/report/${a.id}`} style={{ color: colors.gold, fontSize: 13, textDecoration: "none" }}>
                    View →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </DashboardChrome>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.surfaceAlt}`, borderRadius: 10, padding: "16px 18px" }}>
      <div style={{ color: colors.muted, fontSize: 10.5, letterSpacing: 1, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: fonts.serif, fontSize: 26, fontWeight: 700, color: color ?? colors.text, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

const sectionHeading: React.CSSProperties = {
  fontFamily: fonts.serif,
  fontSize: 17,
  color: colors.text,
  margin: "0 0 14px",
};
