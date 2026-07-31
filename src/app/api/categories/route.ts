import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentProfile, requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase, hyphen-separated"),
  description: z.string().optional(),
  weight: z.number().positive().optional(),
  order: z.number().int().optional(),
  icon: z.string().optional(),
});

/**
 * GET /api/categories — the question bank, nested down to options.
 * Public (the audit flow is takeable anonymously), but only ADMIN/STAFF see
 * inactive rows and the internal `purpose` field.
 */
export async function GET() {
  try {
    const profile = await getCurrentProfile();
    const isStaff = profile?.role === "ADMIN" || profile?.role === "STAFF";

    const categories = await prisma.category.findMany({
      where: isStaff ? undefined : { isActive: true },
      orderBy: { order: "asc" },
      include: {
        questions: {
          where: isStaff ? undefined : { isActive: true },
          orderBy: { order: "asc" },
          include: {
            options: {
              orderBy: { order: "asc" },
              include: { recommendedService: true },
            },
          },
        },
      },
    });

    const shaped = isStaff
      ? categories
      : categories.map((cat) => ({
          ...cat,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          questions: cat.questions.map(({ purpose, ...q }) => q),
        }));

    return Response.json({ categories: shaped });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/categories — create a category (ADMIN/STAFF only). */
export async function POST(request: NextRequest) {
  try {
    await requireRole("ADMIN", "STAFF");
    const body = createCategorySchema.parse(await request.json());

    const category = await prisma.category.create({ data: body });
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
