import { NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api";

const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;
const QUESTION_TYPES = [
  "CHOICE", "CHECKBOX", "DROPDOWN", "YES_NO", "SCALE",
  "TEXT", "URL", "EMAIL", "PHONE", "NUMBER", "DATE", "UPLOAD",
] as const;

const optionSchema = z.object({
  label: z.string(),
  points: z.number().int(),
  order: z.number().int().optional(),
  recommendedService: z.string().nullable().optional(),
  priority: z.enum(PRIORITIES).nullable().optional(),
  businessImpact: z.string().nullable().optional(),
  revenueImpact: z.string().nullable().optional(),
  timeToFix: z.string().nullable().optional(),
  costRangeMin: z.number().int().nullable().optional(),
  costRangeMax: z.number().int().nullable().optional(),
});

const questionSchema = z.object({
  text: z.string(),
  purpose: z.string().nullable().optional(),
  type: z.enum(QUESTION_TYPES),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
  showIfJson: z.record(z.string(), z.unknown()).nullable().optional(),
  scaleMin: z.number().int().nullable().optional(),
  scaleMax: z.number().int().nullable().optional(),
  options: z.array(optionSchema).optional(),
});

const categorySchema = z.object({
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable().optional(),
  weight: z.number().positive().optional(),
  order: z.number().int().optional(),
  icon: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  questions: z.array(questionSchema).optional(),
});

const importSchema = z.object({
  services: z.array(z.object({ name: z.string(), description: z.string().nullable().optional(), category: z.string().nullable().optional() })).optional(),
  categories: z.array(categorySchema).optional(),
});

/**
 * POST /api/admin/import/json — bulk import in the shape produced by
 * /api/admin/export/json (ADMIN/STAFF only).
 *
 * Intentionally additive/upsert-only: services are upserted by name,
 * categories by slug. A category's questions, if included, are replaced
 * wholesale (existing questions for that category are deleted and
 * recreated) — but categories/services *not* present in the payload are
 * left untouched rather than deleted, so a partial import can't wipe out
 * unrelated content.
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { services = [], categories = [] } = importSchema.parse(await request.json());

    const result = await prisma.$transaction(async (tx) => {
      const serviceIdByName = new Map<string, string>();
      for (const svc of services) {
        const row = await tx.service.upsert({
          where: { name: svc.name },
          update: { description: svc.description, category: svc.category },
          create: { name: svc.name, description: svc.description, category: svc.category },
        });
        serviceIdByName.set(svc.name, row.id);
      }
      // Also resolve service names referenced by options against services
      // that already exist in the DB but weren't included in this payload.
      const referencedNames = new Set(
        categories.flatMap((c) => c.questions ?? []).flatMap((q) => q.options ?? []).map((o) => o.recommendedService).filter((n): n is string => !!n)
      );
      for (const name of Array.from(referencedNames)) {
        if (serviceIdByName.has(name)) continue;
        const existing = await tx.service.findUnique({ where: { name } });
        if (existing) serviceIdByName.set(name, existing.id);
      }

      let categoryCount = 0;
      let questionCount = 0;

      for (const cat of categories) {
        const category = await tx.category.upsert({
          where: { slug: cat.slug },
          update: {
            name: cat.name,
            description: cat.description,
            weight: cat.weight,
            order: cat.order,
            icon: cat.icon,
            isActive: cat.isActive,
          },
          create: {
            name: cat.name,
            slug: cat.slug,
            description: cat.description,
            weight: cat.weight,
            order: cat.order ?? 0,
            icon: cat.icon,
            isActive: cat.isActive,
          },
        });
        categoryCount += 1;

        if (cat.questions) {
          await tx.question.deleteMany({ where: { categoryId: category.id } });
          for (const q of cat.questions) {
            const created = await tx.question.create({
              data: {
                categoryId: category.id,
                text: q.text,
                purpose: q.purpose,
                type: q.type,
                order: q.order ?? 0,
                isActive: q.isActive,
                showIfJson: (q.showIfJson ?? undefined) as Prisma.InputJsonValue | undefined,
                scaleMin: q.scaleMin,
                scaleMax: q.scaleMax,
              },
            });
            questionCount += 1;

            if (q.options?.length) {
              await tx.option.createMany({
                data: q.options.map((opt) => ({
                  questionId: created.id,
                  label: opt.label,
                  points: opt.points,
                  order: opt.order ?? 0,
                  recommendedServiceId: opt.recommendedService
                    ? serviceIdByName.get(opt.recommendedService)
                    : undefined,
                  priority: opt.priority,
                  businessImpact: opt.businessImpact,
                  revenueImpact: opt.revenueImpact,
                  timeToFix: opt.timeToFix,
                  costRangeMin: opt.costRangeMin,
                  costRangeMax: opt.costRangeMax,
                })),
              });
            }
          }
        }
      }

      return { servicesImported: serviceIdByName.size, categoryCount, questionCount };
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
