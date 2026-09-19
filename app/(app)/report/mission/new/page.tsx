import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MissionReportForm from "@/components/forms/MissionReportForm";
import { getThisSunday, formatDate, aggregateSunReports } from "@/lib/utils/report-aggregator";
import type { SunReportWithMembers } from "@/types/database";
import { buildBibleCompletions } from "@/lib/utils/bible-completion";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export default async function NewMissionReportPage() {
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
  if (!profile || profile.role !== "mission_leader") redirect("/dashboard");

  const missionId = profile.mission_id!;
  const thisSunday = formatDate(getThisSunday());

  // 이미 있으면 리다이렉트
  const { data: existing } = await supabase
    .from("sunbogo_mission_reports")
    .select("id")
    .eq("mission_id", missionId)
    .eq("report_date", thisSunday)
    .single();

  if (existing) redirect(`/report/mission/${existing.id}`);

  // 소속 순보고서 + 순원 집계
  const { data: sunReports } = await supabase
    .from("sun_reports")
    .select("*, sun_report_members(*)")
    .eq("mission_id", missionId)
    .eq("report_date", thisSunday)
    .order("sun_number");

  const aggregated = aggregateSunReports((sunReports ?? []) as SunReportWithMembers[]);

  // 성경통독·필사 완료자 — 직분은 교적부(members)에서 조회 (서비스 롤로만 접근 가능)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const bibleCompletions = await buildBibleCompletions(
    admin,
    ((sunReports ?? []) as SunReportWithMembers[])
      .filter((r) => r.status === "submitted")
      .map((r) => ({ mission_id: r.mission_id, report_date: r.report_date, members: r.sun_report_members }))
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary">선교회보고서 작성</h2>
      <MissionReportForm
        profile={profile}
        reportDate={thisSunday}
        reportId={null}
        initialData={null}
        aggregated={aggregated}
        sunReports={(sunReports ?? []) as SunReportWithMembers[]}
        bibleCompletions={bibleCompletions}
      />
    </div>
  );
}
