import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api";

/**
 * GET /api/admin/export/json — full question bank export (ADMIN/STAFF
 * only), in the same human-editable shape as architecture doc §6:
 * `recommendedService` is the service *name*, not an internal id, so the
 * file is portable across environments and easy to hand-edit.
 */
export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");

    const [categories, services] = await Promise.all([
      prisma.category.findMany({
        orderBy: { order: "asc" },
        include: {
          questions: {
            orderBy: { order: "asc" },
            include: {
              options: { orderBy: { order: "asc" }, include: { recommendedService: true } },
            },
          },
        },
      }),
      prisma.service.findMany({ orderBy: { name: "asc" } }),
    ]);

    const exported = {
      exportedAt: new Date().toISOString(),
      services: services.map((s) => ({
        name: s.name,
        description: s.description,
        category: s.category,
      })),
      categories: categories.map((cat) => ({
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        weight: cat.weight,
        order: cat.order,
        icon: cat.icon,
        isActive: cat.isActive,
        questions: cat.questions.map((q) => ({
          text: q.text,
          purpose: q.purpose,
          type: q.type,
          order: q.order,
          isActive: q.isActive,
          showIfJson: q.showIfJson,
          scaleMin: q.scaleMin,
          scaleMax: q.scaleMax,
          options: q.options.map((opt) => ({
            label: opt.label,
            points: opt.points,
            order: opt.order,
            recommendedService: opt.recommendedService?.name ?? null,
            priority: opt.priority,
            businessImpact: opt.businessImpact,
            revenueImpact: opt.revenueImpact,
            timeToFix: opt.timeToFix,
            costRangeMin: opt.costRangeMin,
            costRangeMax: opt.costRangeMax,
          })),
        })),
      })),
    };

    return Response.json(exported, {
      headers: {
        "Content-Disposition": `attachment; filename="question-bank-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
