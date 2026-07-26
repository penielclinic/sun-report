import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import SunReportForm from "@/components/forms/SunReportForm";
import SunReportView from "@/components/forms/SunReportView";

export default async function SunReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("sunbogo_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: report } = await supabase
    .from("sun_reports")
    .select("*")
    .eq("id", id)
    .single();
  if (!report) notFound();

  const { data: members } = await supabase
    .from("sun_report_members")
    .select("*")
    .eq("report_id", id)
    .order("member_name");

  // 순장 본인이고 draft인 경우에만 편집 가능
  const canEdit =
    profile.role === "sun_leader" &&
    report.created_by === user.id &&
    report.status === "draft";

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary">
        {canEdit ? "순보고서 수정" : "순보고서 상세"}
      </h2>
      {canEdit ? (
        <SunReportForm
          profile={profile}
          userId={user.id}
          reportDate={report.report_date}
          reportId={id}
          initialData={{ report, members: members ?? [] }}
        />
      ) : (
        <SunReportView report={report} members={members ?? []} profile={profile} />
      )}
    </div>
  );
}
