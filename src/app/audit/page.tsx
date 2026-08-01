"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FlowShell, FlowSkeleton } from "@/components/audit/FlowShell";
import { useAudit } from "@/lib/audit/AuditProvider";
import { hasErrors, validateContact, validateProfile } from "@/lib/audit/validation";

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
    if (hasErrors(validateContact(state.contact))) {
      router.replace("/audit/client");
      return;
    }
    if (hasErrors(validateProfile(state.profile))) {
      router.replace("/audit/business");
      return;
    }
    router.replace("/audit/questions");
  }, [ready, isComplete, state.contact, state.profile, router, answeredCount, skippedCount]);

  return (
    <FlowShell>
      <FlowSkeleton label="Opening your assessment" />
    </FlowShell>
  );
}
