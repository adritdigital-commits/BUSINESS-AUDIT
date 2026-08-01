import { describe, expect, it } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { ReportDocument } from "@/lib/pdf/ReportDocument";
import { pdfFilename } from "@/lib/pdf/filename";
import type { Report } from "@/lib/report";

const baseReport: Report = {
  overall: 42.5,
  categoryScores: [
    { categoryId: "c1", name: "Website & Digital Presence", weight: 1, score: 40 },
    { categoryId: "c2", name: "Brand Identity", weight: 1, score: 85 },
  ],
  strengths: [{ categoryId: "c2", name: "Brand Identity", weight: 1, score: 85 }],
  weaknesses: [{ categoryId: "c1", name: "Website & Digital Presence", weight: 1, score: 40 }],
  recommendations: [
    {
      service: "Professional Website Development",
      serviceId: "svc1",
      priority: "HIGH",
      businessImpact: null,
      revenueImpact: null,
      timeToFix: "3–5 weeks",
      costRangeMin: 40000,
      costRangeMax: 150000,
    },
  ],
  roadmap: {
    days1to30: [
      {
        service: "Professional Website Development",
        serviceId: "svc1",
        priority: "HIGH",
        businessImpact: null,
        revenueImpact: null,
        timeToFix: "3–5 weeks",
        costRangeMin: 40000,
        costRangeMax: 150000,
      },
    ],
    days31to60: [],
    days61to90: [],
  },
  budget: { min: 40000, max: 150000 },
  generatedAt: "2026-07-31T00:00:00.000Z",
};

async function render(report: Report, businessName?: string | null) {
  return renderToBuffer(
    createElement(ReportDocument, { report, businessName, completedAt: new Date("2026-07-31") }) as Parameters<typeof renderToBuffer>[0]
  );
}

describe("ReportDocument", () => {
  it("renders a valid PDF", async () => {
    const buffer = await render(baseReport, "Acme Co");
    // Every PDF starts with the %PDF- magic bytes.
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buffer.length).toBeGreaterThan(1000);
  }, 30_000);

  it("renders an empty report without throwing", async () => {
    const empty: Report = {
      overall: 0,
      categoryScores: [],
      strengths: [],
      weaknesses: [],
      recommendations: [],
      roadmap: { days1to30: [], days31to60: [], days61to90: [] },
      budget: { min: 0, max: 0 },
      generatedAt: "2026-07-31T00:00:00.000Z",
    };
    const buffer = await render(empty, null);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 30_000);

  it("renders a perfect score with no recommendations", async () => {
    const perfect: Report = {
      ...baseReport,
      overall: 100,
      weaknesses: [],
      recommendations: [],
      roadmap: { days1to30: [], days31to60: [], days61to90: [] },
      budget: { min: 0, max: 0 },
    };
    const buffer = await render(perfect, "Perfect Co");
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  }, 30_000);
});

describe("pdfFilename", () => {
  it("slugifies the business name", () => {
    expect(pdfFilename("Acme Co", "abc")).toBe("growth-audit-acme-co.pdf");
  });

  it("strips characters that would break a filename", () => {
    expect(pdfFilename('Bad/Name:"*?<>|', "abc")).toBe("growth-audit-badname.pdf");
  });

  it("falls back to the assessment id when there is no usable name", () => {
    expect(pdfFilename(null, "abc123")).toBe("growth-audit-abc123.pdf");
    expect(pdfFilename("!!!", "abc123")).toBe("growth-audit-abc123.pdf");
  });

  it("truncates very long names", () => {
    const name = pdfFilename("x".repeat(200), "abc");
    expect(name.length).toBeLessThanOrEqual(`growth-audit-${"x".repeat(60)}.pdf`.length);
  });
});
