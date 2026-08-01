import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().nullable().optional(),
  weight: z.number().positive().optional(),
  order: z.number().int().optional(),
  icon: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/categories/[id] — partial update (ADMIN/STAFF only). */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { id } = await params;
    const body = updateCategorySchema.parse(await request.json());

    const category = await prisma.category.update({ where: { id }, data: body });
    return Response.json({ category });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/categories/[id] — cascades to its questions/options (ADMIN/STAFF only). */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { id } = await params;

    await prisma.category.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
