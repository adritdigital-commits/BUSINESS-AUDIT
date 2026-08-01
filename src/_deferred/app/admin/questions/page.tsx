import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { DashboardChrome, PageTitle } from "@/components/dashboard/DashboardChrome";
import QuestionManager from "@/components/admin/QuestionManager";
import { colors } from "@/components/ui/theme";

export const metadata: Metadata = { title: "Question management — RakeshProTech" };
export const dynamic = "force-dynamic";

export default async function QuestionsAdminPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin/questions");
  if (profile.role !== "ADMIN" && profile.role !== "STAFF") redirect("/dashboard");

  return (
    <DashboardChrome email={profile.email} isStaff>
      <PageTitle eyebrow="QUESTION BANK" title="Categories and questions." />

      <p style={{ color: colors.mutedAlt, fontSize: 14.5, lineHeight: 1.6, marginBottom: 24 }}>
        Changes take effect on the next audit started. Completed reports keep their frozen snapshot, so
        past results are unaffected. Bulk edits are available via{" "}
        <Link href="/api/admin/export/json" style={{ color: colors.gold }}>JSON export</Link>.
      </p>

      <QuestionManager />
    </DashboardChrome>
  );
}
