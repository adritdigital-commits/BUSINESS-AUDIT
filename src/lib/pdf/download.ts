import type { Report } from "@/lib/audit/report";

/**
 * Generates and downloads the report PDF entirely in the browser.
 *
 * The renderer is pulled in with a dynamic import at click time, which keeps
 * `@react-pdf/renderer` out of the server bundle and out of the initial client
 * chunk — the audit stays fast for the many visitors who never export.
 */
export async function downloadAuditPdf(report: Report): Promise<void> {
  const { renderAuditPdf } = await import("@/lib/pdf/AuditPdfDocument");
  const blob = await renderAuditPdf(report);

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = pdfFilename(report);
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Revoked on the next tick: revoking synchronously can cancel the download
  // in some browsers before it has read the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pdfFilename(report: Report): string {
  const slug =
    slugify(report.business.businessName) || "business";
  const date = report.generatedAt.slice(0, 10);
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
