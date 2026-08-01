"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FlowShell, FlowSkeleton } from "@/components/audit/FlowShell";
import { useAudit } from "@/lib/audit/AuditProvider";
import { hasErrors, validateBusiness, validateClient } from "@/lib/audit/validation";

/**
 * Entry point for the journey. Sends the visitor to the furthest step their
 * saved progress supports, so "Start the audit" resumes rather than restarts.
 */
export default function AuditEntryPage() {
  const router = useRouter();
  const { ready, state, isComplete, answeredCount, skippedCount } = useAudit();

  useEffect(() => {
    if (!ready) return;

    if (isComplete) {
      router.replace("/report");
      return;
    }
    if (hasErrors(validateClient(state.client))) {
      router.replace("/audit/client");
      return;
    }
    if (hasErrors(validateBusiness(state.business))) {
      router.replace("/audit/business");
      return;
    }
    router.replace("/audit/questions");
  }, [ready, isComplete, state.client, state.business, router, answeredCount, skippedCount]);

  return (
    <FlowShell>
      <FlowSkeleton label="Opening your audit" />
    </FlowShell>
  );
}
