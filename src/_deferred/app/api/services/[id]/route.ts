import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/services/[id] (ADMIN/STAFF only). */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { id } = await params;
    const data = updateServiceSchema.parse(await request.json());
    const service = await prisma.service.update({ where: { id }, data });
    return Response.json({ service });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/services/[id] — any Option referencing this service has recommendedServiceId set to NULL (ADMIN/STAFF only). */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { id } = await params;
    await prisma.service.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
