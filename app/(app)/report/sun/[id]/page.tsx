import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import SunReportForm from "@/components/forms/SunReportForm";
import SunReportView from "@/components/forms/SunReportView";
import SunReportComments from "@/components/forms/SunReportComments";

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

  const { data: comments } = await supabase
    .from("sun_report_comments")
    .select("*")
    .eq("report_id", id)
    .order("created_at");

  // 순장 본인이고 draft인 경우에만 편집 가능
  const canEdit =
    profile.role === "sun_leader" &&
    report.created_by === user.id &&
    report.status === "draft";

  // 답글 작성 가능: 보고서 작성자 본인(순장), 소속 선교회장, 담임목사
  const canComment =
    report.created_by === user.id ||
    profile.role === "pastor" ||
    (profile.role === "mission_leader" && profile.mission_id === report.mission_id);

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
        <>
          <SunReportView report={report} members={members ?? []} profile={profile} />
          <SunReportComments
            reportId={id}
            initialComments={comments ?? []}
            currentUserId={user.id}
            canComment={canComment}
          />
        </>
      )}
    </div>
  );
}
