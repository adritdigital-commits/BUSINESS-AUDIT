"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FlowShell, FlowSkeleton } from "@/components/audit/FlowShell";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { AuditReport } from "@/components/report/AuditReport";
import { DownloadPdfButton } from "@/components/report/DownloadPdfButton";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAudit } from "@/lib/audit/AuditProvider";

export default function ReportPage() {
  const router = useRouter();
  const { ready, isComplete, assessment, reset } = useAudit();

  // Nothing to show without a finished assessment — send them to the flow,
  // which resumes wherever they got to.
  const missing = ready && (!isComplete || !assessment);
  useEffect(() => {
    if (missing) router.replace("/audit");
  }, [missing, router]);

  if (!ready || missing || !assessment) {
    return (
      <FlowShell>
        <FlowSkeleton label="Preparing your report" />
      </FlowShell>
    );
  }

  return (
    <>
      <FlowShell width="wide">
        {/* Action bar stays with the report on screen and is dropped in print. */}
        <Card className="no-print mb-10 flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Your report is ready</p>
            <p className="mt-0.5 text-[13px] text-ink-secondary">
              Download it, or move on to the proposal built from these numbers.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DownloadPdfButton assessment={assessment} variant="secondary" />
            <ButtonLink href="/proposal" size="md">
              View proposal
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden fill="none">
                <path
                  d="M3 8h9m0 0-3.5-3.5M12 8l-3.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </ButtonLink>
          </div>
        </Card>

        <AuditReport assessment={assessment} />

        <div className="no-print mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-8">
          <p className="text-[13px] text-ink-muted">
            Answers are stored on this device only. Clearing them cannot be undone.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              prefetch={false}
              href="/audit/questions"
              className="rounded-full px-4 py-2 text-[13px] text-ink-secondary transition-colors hover:bg-white/[0.06] hover:text-ink"
            >
              Review my answers
            </Link>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                reset();
                router.push("/");
              }}
            >
              Start a new assessment
            </Button>
          </div>
        </div>
      </FlowShell>
      <SiteFooter />
    </>
  );
}
