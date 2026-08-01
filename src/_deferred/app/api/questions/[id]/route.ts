import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

const QUESTION_TYPES = [
  "CHOICE",
  "CHECKBOX",
  "DROPDOWN",
  "YES_NO",
  "SCALE",
  "TEXT",
  "URL",
  "EMAIL",
  "PHONE",
  "NUMBER",
  "DATE",
  "UPLOAD",
] as const;
const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;

const optionInputSchema = z.object({
  label: z.string().min(1),
  points: z.number().int().min(0).max(100),
  order: z.number().int().optional(),
  recommendedServiceId: z.string().optional(),
  priority: z.enum(PRIORITIES).optional(),
  businessImpact: z.string().optional(),
  revenueImpact: z.string().optional(),
  timeToFix: z.string().optional(),
  costRangeMin: z.number().int().optional(),
  costRangeMax: z.number().int().optional(),
});

const updateQuestionSchema = z.object({
  categoryId: z.string().optional(),
  text: z.string().min(1).optional(),
  purpose: z.string().nullable().optional(),
  type: z.enum(QUESTION_TYPES).optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
  showIfJson: z.record(z.string(), z.unknown()).nullable().optional(),
  scaleMin: z.number().int().nullable().optional(),
  scaleMax: z.number().int().nullable().optional(),
  /** When provided, wholesale-replaces this question's options. */
  options: z.array(optionInputSchema).optional(),
});

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/questions/[id] — partial update; `options` fully replaces existing ones (ADMIN/STAFF only). */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { id } = await params;
    const { options, ...data } = updateQuestionSchema.parse(await request.json());

    const question = await prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id },
        data: {
          ...data,
          showIfJson:
            data.showIfJson === null
              ? Prisma.JsonNull
              : (data.showIfJson as Prisma.InputJsonValue | undefined),
        },
      });

      if (options) {
        await tx.option.deleteMany({ where: { questionId: id } });
        if (options.length) {
          await tx.option.createMany({ data: options.map((opt) => ({ ...opt, questionId: id })) });
        }
      }

      return tx.question.findUniqueOrThrow({
        where: { id },
        include: { options: { orderBy: { order: "asc" } } },
      });
    });

    return Response.json({ question });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/questions/[id] — cascades to its options (ADMIN/STAFF only). */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { id } = await params;

    await prisma.question.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
