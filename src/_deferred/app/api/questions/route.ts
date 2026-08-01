import { NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
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

const createQuestionSchema = z.object({
  categoryId: z.string(),
  text: z.string().min(1),
  purpose: z.string().optional(),
  type: z.enum(QUESTION_TYPES),
  order: z.number().int().optional(),
  showIfJson: z.record(z.string(), z.unknown()).optional(),
  scaleMin: z.number().int().optional(),
  scaleMax: z.number().int().optional(),
  options: z.array(optionInputSchema).optional(),
});

/** GET /api/questions?categoryId=... — admin listing (ADMIN/STAFF only). */
export async function GET(request: NextRequest) {
  try {
    await requireRole("ADMIN", "STAFF");
    const categoryId = request.nextUrl.searchParams.get("categoryId") ?? undefined;

    const questions = await prisma.question.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: [{ categoryId: "asc" }, { order: "asc" }],
      include: { options: { orderBy: { order: "asc" }, include: { recommendedService: true } } },
    });

    return Response.json({ questions });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/questions — create a question, optionally with nested options (ADMIN/STAFF only). */
export async function POST(request: NextRequest) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { options, ...data } = createQuestionSchema.parse(await request.json());

    const question = await prisma.$transaction(async (tx) => {
      const created = await tx.question.create({
        data: { ...data, showIfJson: data.showIfJson as Prisma.InputJsonValue | undefined },
      });
      if (options?.length) {
        await tx.option.createMany({
          data: options.map((opt) => ({ ...opt, questionId: created.id })),
        });
      }
      return tx.question.findUniqueOrThrow({
        where: { id: created.id },
        include: { options: { orderBy: { order: "asc" } } },
      });
    });

    return Response.json({ question }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
