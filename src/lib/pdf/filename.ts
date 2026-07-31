/**
 * Turns a business name into a safe, readable PDF filename.
 * Lives outside the route file because Next.js only permits a fixed set of
 * exports from a route module.
 */
export function pdfFilename(businessName: string | null | undefined, id: string): string {
  const stem = (businessName ?? "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .slice(0, 60);
  return `growth-audit-${stem || id}.pdf`;
}
