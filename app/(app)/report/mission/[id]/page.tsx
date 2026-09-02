import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import MissionReportForm from "@/components/forms/MissionReportForm";
import { aggregateSunReports } from "@/lib/utils/report-aggregator";
import type { SunReportWithMembers, SpecialReportItem } from "@/types/database";

export default async function MissionReportDetailPage({
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
    .from("sunbogo_mission_reports")
    .select("*")
    .eq("id", id)
    .single();
  if (!report) notFound();

  // 선교회장이 본인 선교회 보고서이고 draft인 경우만 편집
  const canEdit =
    profile.role === "mission_leader" &&
    report.created_by === user.id &&
    report.status === "draft";

  // 집계 재계산 (순원 포함)
  const { data: sunReports } = await supabase
    .from("sun_reports")
    .select("*, sun_report_members(*)")
    .eq("mission_id", report.mission_id)
    .eq("report_date", report.report_date)
    .order("sun_number");

  const aggregated = aggregateSunReports((sunReports ?? []) as SunReportWithMembers[]);

  const { data: specialItems } = await supabase
    .from("special_report_items")
    .select("*")
    .eq("mission_report_id", id)
    .order("created_at");

  const { data: comments } = await supabase
    .from("mission_report_comments")
    .select("*")
    .eq("report_id", id)
    .order("created_at");

  // 답글 작성 가능: 보고서 작성자 본인(선교회장), 담임목사
  const canComment = report.created_by === user.id || profile.role === "pastor";

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary">
        {canEdit ? "선교회보고서 수정" : "선교회보고서 상세"}
      </h2>
      <MissionReportForm
        profile={profile}
        reportDate={report.report_date}
        reportId={id}
        initialData={report}
        aggregated={aggregated}
        sunReports={(sunReports ?? []) as SunReportWithMembers[]}
        initialSpecialItems={(specialItems ?? []) as SpecialReportItem[]}
        readonly={!canEdit}
        comments={comments ?? []}
        currentUserId={user.id}
        canComment={canComment}
      />
    </div>
  );
}
