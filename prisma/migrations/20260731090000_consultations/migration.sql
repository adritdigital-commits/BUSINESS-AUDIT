-- Consultation requests raised from a report or the dashboard.

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('REQUESTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT,
    "preferredTime" TEXT,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'REQUESTED',
    "scheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consultations_clientId_idx" ON "consultations"("clientId");

-- CreateIndex
CREATE INDEX "consultations_status_idx" ON "consultations"("status");

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Row Level Security, matching the policy shape used by the other tables.
-- Anonymous insert is permitted because a consultation can be requested
-- straight from an anonymous audit report; reads are owner/staff only.
-- ---------------------------------------------------------------------------

ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consultations_staff_all" ON public.consultations
  FOR ALL USING (public.current_role_name() IN ('ADMIN', 'STAFF'))
  WITH CHECK (public.current_role_name() IN ('ADMIN', 'STAFF'));

CREATE POLICY "consultations_public_insert" ON public.consultations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "consultations_owner_select" ON public.consultations
  FOR SELECT USING ("clientId" = public.current_client_id());
