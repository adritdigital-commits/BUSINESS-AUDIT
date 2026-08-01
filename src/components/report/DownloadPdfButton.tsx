"use client";

import { useState } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import type { Assessment } from "@/engine";
import { downloadAuditPdf } from "@/lib/pdf/download";

export function DownloadPdfButton({
  assessment,
  variant = "primary",
  label = "Download PDF",
}: {
  assessment: Assessment;
  variant?: ButtonVariant;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");

  async function handleClick() {
    setStatus("working");
    try {
      await downloadAuditPdf(assessment);
      setStatus("idle");
    } catch (error) {
      // Generation happens locally, so a failure here is a bug or an
      // environment limit, never a network problem. Log the cause — a
      // swallowed exception here is undiagnosable — then leave the page usable.
      console.error("[pdf] generation failed", error);
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant={variant}
        size="md"
        onClick={handleClick}
        disabled={status === "working"}
        aria-busy={status === "working"}
      >
        {status === "working" ? (
          <>
            <span
              aria-hidden
              className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
            />
            Building your PDF…
          </>
        ) : (
          <>
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden fill="none">
              <path
                d="M8 2.5v8m0 0L4.75 7.25M8 10.5l3.25-3.25M2.5 13h11"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {label}
          </>
        )}
      </Button>
      {status === "error" ? (
        <p role="alert" className="text-[13px] text-critical">
          The PDF could not be generated in this browser. Use your browser&apos;s print dialog
          to save this page instead.
        </p>
      ) : null}
    </div>
  );
}
