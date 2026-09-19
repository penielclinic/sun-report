import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import SunReportList from "@/components/dashboard/SunReportList";
import PastorMessageCard from "@/components/dashboard/PastorMessageCard";
import { getThisSunday, formatDate } from "@/lib/utils/report-aggregator";
import UpdateNotice from "@/components/UpdateNotice";
import BibleCompletionList from "@/components/BibleCompletionList";
import { buildBibleCompletions } from "@/lib/utils/bible-completion";
import { BRIDGE_MISSION_ID, getSunEntry } from "@/lib/constants/sun-directory";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export default async function SunLeaderDashboard() {
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

  // 최근 보고서 5개
  const { data: reports } = await supabase
    .from("sun_reports")
    .select("id, report_date, status, attend_total, submitted_at")
    .eq("created_by", user.id)
    .order("report_date", { ascending: false })
    .limit(5);

  const thisSunday = formatDate(getThisSunday());
  const thisWeekReport = reports?.find((r) => r.report_date === thisSunday);
  const latestReport = thisWeekReport ?? reports?.[0];
  const hasThisWeek = !!thisWeekReport;

  // 이번 주 내 보고서의 성경통독·필사 체크 현황 + 보고 단계 (순장 → 선교회장 → 목사님)
  // 선교회보고서 제출 여부는 순장 권한(RLS)으로 조회되지 않으므로 서비스 롤 사용
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const missionId = profile.mission_id ?? getSunEntry(profile.sun_number ?? 0)?.missionId ?? null;
  let bibleCompletions: Awaited<ReturnType<typeof buildBibleCompletions>> = [];
  let missionSubmitted = false;
  if (thisWeekReport && missionId) {
    const [{ data: flagged }, { data: missionReport }] = await Promise.all([
      admin
        .from("sun_report_members")
        .select("member_name, bible_tongdok, bible_pilsa")
        .eq("report_id", thisWeekReport.id)
        .or("bible_tongdok.eq.true,bible_pilsa.eq.true"),
      admin
        .from("sunbogo_mission_reports")
        .select("status")
        .eq("mission_id", missionId)
        .eq("report_date", thisSunday)
        .maybeSingle(),
    ]);
    missionSubmitted = missionReport?.status === "submitted";
    bibleCompletions = await buildBibleCompletions(admin, [
      { mission_id: missionId, report_date: thisSunday, members: flagged ?? [] },
    ]);
  }
  const isBridge = missionId === BRIDGE_MISSION_ID;
  const bibleStatus = !thisWeekReport
    ? null
    : thisWeekReport.status !== "submitted"
      ? "보고서를 제출하면 선교회장님께 보고됩니다."
      : isBridge
        ? "✓ 목사님께 보고되었습니다. (브릿지선교회 — 목자 직접보고)"
        : missionSubmitted
          ? "✓ 선교회장님을 거쳐 목사님께 보고되었습니다."
          : "✓ 선교회장님께 보고되었습니다. 선교회장님이 선교회보고서를 제출하면 목사님께 보고됩니다.";

  return (
    <div className="space-y-6">
      {/* 새 기능 공지 (로그인 화면과 동일) */}
      <UpdateNotice />

      {/* 인사 & 현재 상태 */}
      <div>
        <h2 className="text-2xl font-bold text-primary" style={{ wordBreak: "keep-all" }}>
          {profile.name} 순장님, 안녕하세요!
        </h2>
        <p className="text-base text-muted-foreground mt-1">
          {profile.sun_number}순 보고 현황
        </p>
      </div>

      {/* 이번 주 보고 상태 카드 */}
      <Card
        className={`border-2 ${hasThisWeek && latestReport?.status === "submitted" ? "border-green-500" : "border-amber-400"}`}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {hasThisWeek && latestReport?.status === "submitted" ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold text-green-700">이번 주 제출 완료!</p>
                  <p className="text-base text-muted-foreground">
                    참석인원 {latestReport?.attend_total}명
                  </p>
                </div>
              </>
            ) : (
              <>
                <Clock className="w-10 h-10 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold text-amber-700">
                    {hasThisWeek ? "임시저장 중" : "이번 주 보고서 미제출"}
                  </p>
                  <p className="text-base text-muted-foreground">
                    예배 후 순보고서를 작성해 주세요
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 보고서 작성/수정 버튼 — 제출 후에도 수정·재제출 가능 */}
      <Button
        asChild
        size="lg"
        variant={hasThisWeek && latestReport?.status === "submitted" ? "outline" : "default"}
        className={`w-full h-16 text-lg font-semibold ${
          hasThisWeek && latestReport?.status === "submitted"
            ? "border-primary/40 text-primary"
            : "bg-primary hover:bg-primary/90"
        }`}
      >
        <Link href={hasThisWeek ? `/report/sun/${latestReport!.id}` : "/report/sun/new"}>
          <PlusCircle className="w-5 h-5 mr-2" />
          {!hasThisWeek
            ? "이번 주 순보고서 작성"
            : latestReport?.status === "draft"
              ? "작성 중인 보고서 이어서 작성"
              : "제출한 보고서 수정하기"}
        </Link>
      </Button>

      {/* 이번 주 성경통독·필사 보고 현황 */}
      {thisWeekReport && (
        <div className="space-y-2">
          <BibleCompletionList
            completions={bibleCompletions}
            title="이번 주 성경통독 · 필사 보고"
            emptyText="이번 주 보고서에 체크된 통독·필사 완료자가 없습니다."
          />
          {bibleCompletions.length > 0 && bibleStatus && (
            <p className="text-sm text-muted-foreground px-1" style={{ wordBreak: "keep-all" }}>
              {bibleStatus}
            </p>
          )}
        </div>
      )}

      {/* 목사님 메시지 */}
      <PastorMessageCard userId={user.id} />

      {/* 지난 보고서 목록 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">최근 보고서</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/report/sun/history" className="text-xs text-muted-foreground">
                전체보기 <ChevronRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <SunReportList reports={reports ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
