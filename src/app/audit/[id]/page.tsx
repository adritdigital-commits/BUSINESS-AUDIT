import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { canAccessAssessment } from "@/lib/assessmentAccess";
import { prisma } from "@/lib/prisma";
import AuditApp from "@/components/AuditApp";

export const metadata: Metadata = { title: "Resume your audit — RakeshProTech" };
export const dynamic = "force-dynamic";

/**
 * Resume an in-progress audit. Reachable by the owning client, by staff,
 * or anonymously with the resume token emailed at the start.
 */
export default async function ResumeAuditPage({
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
    if (!profile) redirect(`/login?next=/audit/${id}`);
    notFound();
  }

  // A finished audit has a report, not more questions.
  if (assessment.status === "COMPLETED") {
    redirect(`/report/${id}${token ? `?token=${encodeURIComponent(token)}` : ""}`);
  }

  return (
    <AuditApp
      resumeAssessmentId={id}
      resumeToken={token ?? null}
      resumeBusinessName={assessment.client?.businessName ?? null}
    />
  );
}
