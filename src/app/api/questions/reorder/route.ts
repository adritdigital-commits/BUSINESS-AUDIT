import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string(), order: z.number().int() })).min(1),
});

/** POST /api/questions/reorder — bulk drag-to-reorder within a category (ADMIN/STAFF only). */
export async function POST(request: NextRequest) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { items } = reorderSchema.parse(await request.json());

    await prisma.$transaction(
      items.map(({ id, order }) => prisma.question.update({ where: { id }, data: { order } }))
    );

    return Response.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
