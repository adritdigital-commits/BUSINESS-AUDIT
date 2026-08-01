import type { Assessment } from "@/engine";

/**
 * Generates and downloads the report PDF entirely in the browser.
 *
 * The renderer is pulled in with a dynamic import at click time, which keeps
 * `@react-pdf/renderer` out of the server bundle and out of the initial client
 * chunk — the audit stays fast for the many visitors who never export.
 */
export async function downloadAuditPdf(assessment: Assessment): Promise<void> {
  const { renderAuditPdf } = await import("@/lib/pdf/AuditPdfDocument");
  const blob = await renderAuditPdf(assessment);

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = pdfFilename(assessment);
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Revoked on the next tick: revoking synchronously can cancel the download
  // in some browsers before it has read the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pdfFilename(assessment: Assessment): string {
  const slug = slugify(assessment.profile.businessName) || "business";
  const date = assessment.generatedAt.slice(0, 10);
  return `growth-audit-${slug}-${date}.pdf`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
    .replace(/^-|-$/g, "");
}
