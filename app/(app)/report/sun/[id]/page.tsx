import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import SunReportForm from "@/components/forms/SunReportForm";
import SunReportView from "@/components/forms/SunReportView";
import SunReportComments from "@/components/forms/SunReportComments";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

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

  // 순장 본인 보고서는 제출 후에도 수정·재제출 가능.
  // 단, 소속 선교회보고서가 이미 제출됐다면(집계가 확정됨) 수정 불가 —
  // sunbogo_mission_reports는 순장에게 RLS 조회 권한이 없어 관리자 클라이언트로 확인.
  const admin = getAdminClient();
  const { data: missionReport } = await admin
    .from("sunbogo_mission_reports")
    .select("status")
    .eq("mission_id", report.mission_id)
    .eq("report_date", report.report_date)
    .maybeSingle();
  const missionLocked = missionReport?.status === "submitted";

  const canEdit =
    profile.role === "sun_leader" &&
    report.created_by === user.id &&
    !missionLocked;

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
          {missionLocked && profile.role === "sun_leader" && report.created_by === user.id && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              선교회보고서가 이미 제출되어 이 순보고서는 더 이상 수정할 수 없습니다. 수정이 필요하면 선교회장님께 말씀해주세요.
            </div>
          )}
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
