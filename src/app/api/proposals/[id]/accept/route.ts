import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { AuthError, requireProfile } from "@/lib/auth";
import { handleApiError } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** POST /api/proposals/[id]/accept — the owning client accepts (staff may also do this on their behalf). */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const profile = await requireProfile();

    const proposal = await prisma.proposal.findUniqueOrThrow({ where: { id } });
    const isStaff = profile.role === "ADMIN" || profile.role === "STAFF";
    if (!isStaff && profile.clientId !== proposal.clientId) {
      throw new AuthError("Not authorized to accept this proposal", 403);
    }

    const updated = await prisma.proposal.update({
      where: { id },
      data: { status: "ACCEPTED" },
    });

    return Response.json({ proposal: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
