import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
});

/** GET /api/services — the service library (ADMIN/STAFF only). */
export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");
    const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
    return Response.json({ services });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/services — create a recommendable service (ADMIN/STAFF only). */
export async function POST(request: NextRequest) {
  try {
    await requireRole("ADMIN", "STAFF");
    const body = createServiceSchema.parse(await request.json());
    const service = await prisma.service.create({ data: body });
    return Response.json({ service }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
