import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import SunReportForm from "@/components/forms/SunReportForm";
import { getThisSunday, formatDate } from "@/lib/utils/report-aggregator";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export default async function NewSunReportPage() {
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
  if (!profile || profile.role !== "sun_leader") redirect("/dashboard");

  const thisSunday = formatDate(getThisSunday());

  // 우리 순의 가장 최근 보고서 순원 명단 (새가족 등록 등 최신 편성 유지용)
  // 정적 편성표(sun-directory.ts)가 아니라 지난 주 실제 제출 명단을 기준으로 삼아,
  // 순장이 새가족을 추가하면 다음 주에도 계속 명단에 남도록 한다.
  let previousMembers: string[] | null = null;
  if (profile.sun_number) {
    // 관리자 클라이언트 사용: 순장 교체 등으로 지난 보고서 작성자(created_by)가
    // 현재 로그인한 순장과 달라도 같은 순의 최신 명단을 안정적으로 읽기 위함
    const admin = getAdminClient();
    const { data: lastReport } = await admin
      .from("sun_reports")
      .select("id")
      .eq("sun_number", profile.sun_number)
      .order("report_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastReport) {
      const { data: lastMembers } = await admin
        .from("sun_report_members")
        .select("member_name, attend_sun_day")
        .eq("report_id", lastReport.id)
        .order("member_name");
      // 지난주 주일낮예배 참석자를 목록 위쪽에 먼저 보여줘 순장이 빠르게 체크할 수 있도록 함.
      // 이번 주 체크 상태는 모두 초기화된 채로 시작하며, 실제로 체크하면 그 결과에 따라 다시 정렬된다.
      previousMembers = (lastMembers ?? [])
        .sort((a, b) => (a.attend_sun_day ? 0 : 1) - (b.attend_sun_day ? 0 : 1))
        .map((m) => m.member_name);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary">순보고서 작성</h2>
      <SunReportForm
        profile={profile}
        userId={user.id}
        reportDate={thisSunday}
        reportId={null}
        initialData={null}
        previousMembers={previousMembers}
      />
    </div>
  );
}
