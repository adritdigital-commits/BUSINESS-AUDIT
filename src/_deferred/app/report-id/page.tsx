import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { canAccessAssessment } from "@/lib/assessmentAccess";
import { prisma } from "@/lib/prisma";
import { loadActiveCategories } from "@/lib/questionBank";
import { generateReport, type Report } from "@/lib/report";
import type { AnswersMap } from "@/lib/scoring";
import { ReportView } from "@/components/report/ReportView";
import { Shell } from "@/components/ui/Shell";
import { btnGhost, btnPrimary, colors, fonts } from "@/components/ui/theme";

export const metadata: Metadata = { title: "Your growth audit report — RakeshProTech" };
export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: { client: { select: { businessName: true } } },
  });
  if (!assessment) notFound();

  const profile = await getCurrentProfile();
  if (!canAccessAssessment(assessment, profile, token ?? null)) {
    // An anonymous visitor without a token may just need to sign in.
    if (!profile) redirect(`/login?next=/report/${id}`);
    notFound();
  }

  const report: Report =
    assessment.status === "COMPLETED" && assessment.reportJson
      ? (assessment.reportJson as unknown as Report)
      : generateReport(await loadActiveCategories(), assessment.answersJson as AnswersMap);

  const tokenSuffix = token ? `?token=${encodeURIComponent(token)}` : "";

  return (
    <Shell>
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "clamp(24px, 6vw, 48px) 24px 80px" }}>
        <div style={{ fontFamily: fonts.sans, fontSize: 12, letterSpacing: 3, color: colors.gold, marginBottom: 10 }}>
          GROWTH AUDIT REPORT
          {assessment.client?.businessName ? ` — ${assessment.client.businessName.toUpperCase()}` : ""}
        </div>
        <h1
          style={{
            fontFamily: fonts.serif,
            fontSize: "clamp(24px, 5vw, 32px)",
            color: colors.text,
            margin: "0 0 8px",
            lineHeight: 1.2,
          }}
        >
          Here&apos;s where things stand.
        </h1>
        {assessment.status !== "COMPLETED" && (
          <p style={{ color: colors.gold, fontSize: 13.5, marginBottom: 28 }}>
            This audit isn&apos;t finished — the figures below are a live preview and will change as you answer more.
          </p>
        )}
        {assessment.status === "COMPLETED" && (
          <p style={{ color: colors.muted, fontSize: 13.5, marginBottom: 28 }}>
            Completed {assessment.completedAt?.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}

        <ReportView report={report} businessName={assessment.client?.businessName} />

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
          <a
            href={`/api/assessments/${id}/pdf${tokenSuffix}`}
            style={{ ...btnPrimary, textDecoration: "none", display: "inline-block" }}
          >
            Download PDF
          </a>
          <Link href="/consultation" style={{ ...btnGhost, textDecoration: "none", display: "inline-block" }}>
            Book a consultation
          </Link>
          {profile && (
            <Link href="/dashboard" style={{ ...btnGhost, textDecoration: "none", display: "inline-block" }}>
              Back to dashboard
            </Link>
          )}
        </div>
      </main>
    </Shell>
  );
}
