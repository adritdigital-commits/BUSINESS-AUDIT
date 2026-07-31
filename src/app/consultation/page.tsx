import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ConsultationForm from "@/components/consultation/ConsultationForm";
import { CenteredPanel, Shell } from "@/components/ui/Shell";
import { colors, eyebrow, fonts } from "@/components/ui/theme";

export const metadata: Metadata = { title: "Book a consultation — RakeshProTech" };
export const dynamic = "force-dynamic";

export default async function ConsultationPage({
  searchParams,
}: {
  searchParams: Promise<{ assessment?: string; token?: string }>;
}) {
  const { assessment: assessmentId, token } = await searchParams;
  const profile = await getCurrentProfile();

  // Prefill from the signed-in client's record where we can.
  let defaultName = profile?.fullName ?? null;
  let defaultEmail = profile?.email ?? null;
  if (profile?.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: profile.clientId },
      select: { contactName: true, email: true },
    });
    defaultName = defaultName ?? client?.contactName ?? null;
    defaultEmail = defaultEmail ?? client?.email ?? null;
  }

  return (
    <Shell>
      <CenteredPanel maxWidth={560}>
        <div style={eyebrow}>RAKESHPROTECH &nbsp;·&nbsp; CONSULTATION</div>
        <h1
          style={{
            fontFamily: fonts.serif,
            fontSize: "clamp(26px, 5vw, 34px)",
            color: colors.text,
            margin: "0 0 12px",
            lineHeight: 1.2,
          }}
        >
          Let&apos;s turn your roadmap into work.
        </h1>
        <p style={{ color: colors.mutedAlt, fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          A 30-minute call to walk through your audit results, prioritise the highest-impact fixes, and
          scope what we&apos;d do first. No obligation.
        </p>

        <Suspense>
          <ConsultationForm
            assessmentId={assessmentId ?? null}
            token={token ?? null}
            defaultName={defaultName}
            defaultEmail={defaultEmail}
          />
        </Suspense>
      </CenteredPanel>
    </Shell>
  );
}
