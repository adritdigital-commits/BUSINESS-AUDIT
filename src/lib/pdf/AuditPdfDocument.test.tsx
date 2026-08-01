import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { ORDERED_QUESTIONS } from "@/data/questionBank";
import { AuditPdfDocument } from "@/lib/pdf/AuditPdfDocument";
import { buildReport, type Report } from "@/lib/audit/report";
import type { AnswersMap } from "@/lib/audit/types";

/**
 * The export renders in the browser, but the document is the same tree here.
 * These cases exist because the layout engine fails on *shapes of data*, not
 * on bad values: a report with 23 recommendations produced valid numbers
 * everywhere and still crashed the renderer with
 * "unsupported number: -8.8e+21", because a non-wrapping box grew past a
 * page. Every profile below is a different document length.
 */

function reportForOptionIndex(index: number): Report {
  const answers: AnswersMap = {};
  for (const question of ORDERED_QUESTIONS) {
    if (question.type === "SCALE") {
      const min = question.scaleMin ?? 1;
      const max = question.scaleMax ?? 10;
      answers[question.id] = { value: Math.min(min + index, max) };
    } else {
      const option = question.options[Math.min(index, question.options.length - 1)];
      answers[question.id] = { optionId: option.id };
    }
  }

  return buildReport({
    answers,
    client: {
      fullName: "Priya Sharma",
      email: "priya@northline.co.in",
      phone: "+91 98765 43210",
      role: "Founder / Owner",
    },
    business: {
      businessName: "Northline Interiors",
      website: "northline.co.in",
      industry: "Real estate & construction",
      teamSize: "11–50 people",
      annualRevenue: "₹1 – 5 crore",
      primaryGoal: "Generate more qualified leads",
    },
    generatedAt: "2026-08-01T09:20:00.000Z",
  });
}

const PDF_MAGIC = "%PDF-";

async function render(report: Report): Promise<Buffer> {
  return renderToBuffer(<AuditPdfDocument report={report} />);
}

describe("AuditPdfDocument", () => {
  // The worst case is not the worst score: mid-range answers trigger the most
  // engagements, because a top answer triggers nothing and a bottom answer
  // often triggers the same service twice.
  it.each([0, 1, 2, 3])(
    "renders a valid PDF when every question is answered at option index %i",
    async (index) => {
      const report = reportForOptionIndex(index);
      const buffer = await render(report);

      expect(buffer.length).toBeGreaterThan(5000);
      expect(buffer.subarray(0, 5).toString("latin1")).toBe(PDF_MAGIC);
    },
    60_000
  );

  it("renders the longest document the question bank can produce", async () => {
    // Find the answer profile with the most recommendations and prove that
    // one renders — that is the case that broke.
    const profiles = [0, 1, 2, 3].map((index) => reportForOptionIndex(index));
    const worst = profiles.reduce((a, b) =>
      b.recommendations.length > a.recommendations.length ? b : a
    );

    expect(worst.recommendations.length).toBeGreaterThan(15);
    const buffer = await render(worst);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe(PDF_MAGIC);
  }, 60_000);

  it("renders when nothing was recommended", async () => {
    const answers: AnswersMap = {};
    for (const question of ORDERED_QUESTIONS) {
      if (question.type === "SCALE") answers[question.id] = { value: question.scaleMax ?? 10 };
      else answers[question.id] = { optionId: question.options[question.options.length - 1].id };
    }
    const report = buildReport({
      answers,
      client: { fullName: "Priya Sharma", email: "p@n.in", phone: "", role: "Founder / Owner" },
      business: {
        businessName: "Northline Interiors",
        website: "",
        industry: "Technology & SaaS",
        teamSize: "Just me",
        annualRevenue: "Prefer not to say",
        primaryGoal: "Prepare the business to scale or be sold",
      },
      generatedAt: "2026-08-01T09:20:00.000Z",
    });

    expect(report.recommendations).toEqual([]);
    const buffer = await render(report);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe(PDF_MAGIC);
  }, 60_000);

  it("renders a mostly-skipped audit", async () => {
    const answers: AnswersMap = {};
    ORDERED_QUESTIONS.forEach((question, index) => {
      if (index === 0) {
        answers[question.id] = { optionId: question.options[0].id };
        return;
      }
      answers[question.id] = { skipped: true };
    });

    const report = buildReport({
      answers,
      client: { fullName: "", email: "", phone: "", role: "" },
      business: {
        businessName: "",
        website: "",
        industry: "",
        teamSize: "",
        annualRevenue: "",
        primaryGoal: "",
      },
      generatedAt: "2026-08-01T09:20:00.000Z",
    });

    // Empty client and business strings must not break the cover page either.
    const buffer = await render(report);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe(PDF_MAGIC);
  }, 60_000);
});
