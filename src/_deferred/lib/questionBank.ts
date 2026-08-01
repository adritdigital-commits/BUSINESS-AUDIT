import { prisma } from "@/lib/prisma";
import type { CategoryWithQuestions } from "@/lib/scoring";

/** The active question bank, in the exact shape computeScore/generateReport expect. */
export async function loadActiveCategories(): Promise<CategoryWithQuestions[]> {
  return prisma.category.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: {
      questions: {
        where: { isActive: true },
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
}
