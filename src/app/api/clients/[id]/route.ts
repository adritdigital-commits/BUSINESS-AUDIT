import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AuthError, requireProfile } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** GET /api/clients/[id] — ADMIN/STAFF see any client; a CLIENT sees only their own. */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const profile = await requireProfile();
    const isStaff = profile.role === "ADMIN" || profile.role === "STAFF";
    if (!isStaff && profile.clientId !== id) {
      throw new AuthError("Not authorized to access this client", 403);
    }

    const client = await prisma.client.findUniqueOrThrow({
      where: { id },
      include: {
        assessments: { orderBy: { startedAt: "desc" } },
        proposals: { orderBy: { createdAt: "desc" } },
      },
    });

    return Response.json({ client });
  } catch (error) {
    return handleApiError(error);
  }
}

const staffUpdateSchema = z.object({
  businessName: z.string().min(1).optional(),
  contactName: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  accountManagerId: z.string().uuid().nullable().optional(),
});

const selfUpdateSchema = z.object({
  contactName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
});

/** PATCH /api/clients/[id] — ADMIN/STAFF may edit any field; a CLIENT may edit only their own contact details. */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const profile = await requireProfile();
    const isStaff = profile.role === "ADMIN" || profile.role === "STAFF";

    if (isStaff) {
      const data = staffUpdateSchema.parse(await request.json());
      const client = await prisma.client.update({ where: { id }, data });
      return Response.json({ client });
    }

    if (profile.clientId !== id) {
      throw new AuthError("Not authorized to edit this client", 403);
    }
    const data = selfUpdateSchema.parse(await request.json());
    const client = await prisma.client.update({ where: { id }, data });
    return Response.json({ client });
  } catch (error) {
    return handleApiError(error);
  }
}
