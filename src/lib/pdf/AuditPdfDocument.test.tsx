import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { runAssessment, type Assessment } from "@/engine";
import {
  CLINIC,
  CONTACT,
  MANUFACTURER_NO_SITE,
  NEW_RESTAURANT,
  answerAll,
  answerBest,
  answerWorst,
} from "@/engine/fixtures";
import { planAssessment } from "@/engine/questionEngine";
import { AuditPdfDocument } from "@/lib/pdf/AuditPdfDocument";
import type { AnswersMap, BusinessProfile } from "@/engine/types";

/**
 * The export renders in the browser, but the document is the same tree here.
 *
 * These cases exist because the layout engine fails on *shapes of data*, not
 * on bad values: an assessment with twenty-odd recommendations produced valid
 * numbers everywhere and still crashed the renderer with
 * "unsupported number: -8.8e+21", because a non-wrapping box grew past a page.
 * Every profile below produces a different document length.
 */

const PDF_MAGIC = "%PDF-";
const AT = "2026-08-01T09:20:00.000Z";

function assessmentFor(profile: BusinessProfile, answers: AnswersMap): Assessment {
  return runAssessment({ contact: CONTACT, profile, answers, generatedAt: AT });
}

async function render(assessment: Assessment): Promise<Buffer> {
  return renderToBuffer(<AuditPdfDocument assessment={assessment} />);
}

describe("AuditPdfDocument", () => {
  it.each([
    ["healthcare clinic", CLINIC],
    ["manufacturer with no website", MANUFACTURER_NO_SITE],
    ["pre-revenue restaurant", NEW_RESTAURANT],
  ] as const)(
    "renders a valid PDF for a %s at its worst",
    async (_label, profile) => {
      const assessment = assessmentFor(profile, answerWorst(profile));
      expect(assessment.recommendations.length).toBeGreaterThan(5);

      const buffer = await render(assessment);
      expect(buffer.length).toBeGreaterThan(5000);
      expect(buffer.subarray(0, 5).toString("latin1")).toBe(PDF_MAGIC);
    },
    60_000
  );

  it.each([0, 1, 2, 3])(
    "renders a valid PDF when every question is answered at option index %i",
    async (index) => {
      const assessment = assessmentFor(CLINIC, answerAll(CLINIC, index));
      const buffer = await render(assessment);
      expect(buffer.subarray(0, 5).toString("latin1")).toBe(PDF_MAGIC);
    },
    60_000
  );

  it("renders the longest document the question bank can produce", async () => {
    // Find the answer profile with the most recommendations and prove that one
    // renders — that is the case that broke.
    const candidates = [CLINIC, MANUFACTURER_NO_SITE, NEW_RESTAURANT].map((profile) =>
      assessmentFor(profile, answerWorst(profile))
    );
    const worst = candidates.reduce((a, b) =>
      b.recommendations.length > a.recommendations.length ? b : a
    );

    expect(worst.recommendations.length).toBeGreaterThan(10);
    const buffer = await render(worst);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe(PDF_MAGIC);
  }, 60_000);

  it("renders when almost nothing was recommended", async () => {
    const assessment = assessmentFor(CLINIC, answerBest(CLINIC));
    expect(assessment.recommendations.length).toBeLessThanOrEqual(3);

    const buffer = await render(assessment);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe(PDF_MAGIC);
  }, 60_000);

  it("renders a mostly-skipped assessment with an empty contact and profile", async () => {
    const plan = planAssessment(CLINIC);
    const answers: AnswersMap = {};
    plan.questions.forEach((item, index) => {
      answers[item.question.id] =
        index === 0 ? { optionId: item.question.options[0].id } : { skipped: true };
    });

    const assessment = runAssessment({
      contact: { fullName: "", email: "", phone: "", role: "" },
      profile: { ...CLINIC, businessName: "", website: "" },
      answers,
      generatedAt: AT,
    });

    // Empty strings must not break the cover page either.
    const buffer = await render(assessment);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe(PDF_MAGIC);
  }, 60_000);
});
