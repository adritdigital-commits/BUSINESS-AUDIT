import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

const createClientSchema = z.object({
  businessName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  accountManagerId: z.string().uuid().optional(),
});

/** GET /api/clients?search=... — admin listing (ADMIN/STAFF only). */
export async function GET(request: NextRequest) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") ?? undefined;
    const take = Math.min(Number(searchParams.get("take") ?? 25), 100);
    const skip = Number(searchParams.get("skip") ?? 0);

    const where = search
      ? {
          OR: [
            { businessName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : undefined;

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip,
        include: { _count: { select: { assessments: true, proposals: true } } },
      }),
      prisma.client.count({ where }),
    ]);

    return Response.json({ clients, total });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/clients — manually add a client (ADMIN/STAFF only). */
export async function POST(request: NextRequest) {
  try {
    await requireRole("ADMIN", "STAFF");
    const body = createClientSchema.parse(await request.json());

    const client = await prisma.client.create({ data: body });
    return Response.json({ client }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
