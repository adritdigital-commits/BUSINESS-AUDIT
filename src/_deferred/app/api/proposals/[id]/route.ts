import { NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthError, requireProfile, requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** GET /api/proposals/[id] — ADMIN/STAFF see any proposal; a CLIENT sees only their own. */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const profile = await requireProfile();

    const proposal = await prisma.proposal.findUniqueOrThrow({
      where: { id },
      include: { client: true },
    });

    const isStaff = profile.role === "ADMIN" || profile.role === "STAFF";
    if (!isStaff && profile.clientId !== proposal.clientId) {
      throw new AuthError("Not authorized to access this proposal", 403);
    }

    return Response.json({ proposal });
  } catch (error) {
    return handleApiError(error);
  }
}

const lineItemSchema = z.object({
  service: z.string(),
  serviceId: z.string().optional(),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  timeToFix: z.string().nullable().optional(),
  costRangeMin: z.number().int().nullable().optional(),
  costRangeMax: z.number().int().nullable().optional(),
});

const updateProposalSchema = z.object({
  items: z.array(lineItemSchema).optional(),
  totalMin: z.number().int().optional(),
  totalMax: z.number().int().optional(),
  status: z.enum(["DRAFT", "SENT", "ACCEPTED", "DECLINED"]).optional(),
  sentAt: z.coerce.date().nullable().optional(),
});

/** PATCH /api/proposals/[id] — edit line items / status (ADMIN/STAFF only). */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireRole("ADMIN", "STAFF");
    const { id } = await params;
    const { items, ...rest } = updateProposalSchema.parse(await request.json());

    const proposal = await prisma.proposal.update({
      where: { id },
      data: {
        ...rest,
        itemsJson: items as unknown as Prisma.InputJsonValue | undefined,
      },
    });

    return Response.json({ proposal });
  } catch (error) {
    return handleApiError(error);
  }
}
