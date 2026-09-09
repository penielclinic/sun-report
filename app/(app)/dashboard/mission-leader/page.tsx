import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, PlusCircle, ChevronRight } from "lucide-react";
import MissionDeleteButtons from "@/components/dashboard/MissionDeleteButtons";
import DeleteReportButton from "@/components/dashboard/DeleteReportButton";
import { getSunsByMission } from "@/lib/constants/sun-directory";
import { getThisSunday, formatDate } from "@/lib/utils/report-aggregator";
import MissionCalendar from "@/components/dashboard/MissionCalendar";
import PastorMessageCard from "@/components/dashboard/PastorMessageCard";

export default async function MissionLeaderDashboard({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
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

  const params = await searchParams;
  const thisSunday = formatDate(getThisSunday());
  const selectedDate = params.date ?? thisSunday;

  const missionId = profile.mission_id!;
  const sunEntries = getSunsByMission(missionId);

  // 선택 날짜의 순보고서 현황
  const { data: sunReports } = await supabase
    .from("sun_reports")
    .select("id, sun_number, sun_leader, status, attend_total, submitted_at, report_date")
    .eq("mission_id", missionId)
    .eq("report_date", selectedDate);

  const reportMap = new Map(sunReports?.map((r) => [r.sun_number, r]) ?? []);
  const submittedCount = sunReports?.filter((r) => r.status === "submitted").length ?? 0;
  const totalCount = sunEntries.length;

  // 보고서가 존재하는 모든 날짜 (달력 표시용 — 최근 6개월)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const { data: allDates } = await supabase
    .from("sun_reports")
    .select("report_date")
    .eq("mission_id", missionId)
    .gte("report_date", formatDate(sixMonthsAgo));

  const reportDates = [...new Set(allDates?.map((r) => r.report_date) ?? [])];

  // 선택 날짜의 선교회보고서 현황
  const { data: missionReport } = await supabase
    .from("sunbogo_mission_reports")
    .select("id, status")
    .eq("mission_id", missionId)
    .eq("report_date", selectedDate)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">
          선교회 {missionId} — {profile.name} 선교회장
        </h2>
      </div>

      {/* 달력 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">보고서 달력</CardTitle>
          <p className="text-xs text-muted-foreground">
            보고서가 있는 날짜에 점이 표시됩니다
          </p>
        </CardHeader>
        <CardContent>
          <MissionCalendar
            reportDates={reportDates}
            selectedDate={selectedDate}
          />
        </CardContent>
      </Card>

      {/* 선택 날짜 제출 현황 요약 */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="pt-6">
          <p className="text-xs opacity-70 mb-1">{selectedDate}</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">순보고서 제출 현황</p>
              <p className="text-3xl font-bold mt-1">
                {submittedCount}{" "}
                <span className="text-lg font-normal opacity-80">
                  / {totalCount} 순
                </span>
              </p>
            </div>
            <div className="text-4xl font-bold">
              {Math.round((submittedCount / totalCount) * 100)}%
            </div>
          </div>
          <div className="mt-4 h-2 bg-primary-foreground/20 rounded-full">
            <div
              className="h-full bg-yellow-400 rounded-full transition-all"
              style={{ width: `${(submittedCount / totalCount) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 선교회보고서 작성 버튼 */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-base">선교회보고서</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {missionReport
                  ? missionReport.status === "submitted"
                    ? "제출완료"
                    : "임시저장 중"
                  : "미작성"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <MissionDeleteButtons
                missionReportId={missionReport?.id}
                missionReportStatus={missionReport?.status}
                selectedDate={selectedDate}
              />
              <Button asChild size="sm" className="bg-primary">
                <Link
                  href={
                    missionReport
                      ? `/report/mission/${missionReport.id}`
                      : `/report/mission/new?date=${selectedDate}`
                  }
                >
                  {missionReport ? (
                    missionReport.status === "submitted" ? "수정" : "이어서 작성"
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 mr-1" />
                      작성하기
                    </>
                  )}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 목사님 메시지 */}
      <PastorMessageCard userId={user.id} />

      {/* 소속 순 목록 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            소속 순 현황
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {selectedDate}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {sunEntries.map((entry) => {
              const report = reportMap.get(entry.sunNumber);
              return (
                <li key={entry.sunNumber}>
                  <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      {report?.status === "submitted" ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : report?.status === "draft" ? (
                        <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-base font-medium">
                          {entry.sunNumber}순 — {entry.sunLeader}
                        </p>
                        {report?.status === "submitted" && (
                          <p className="text-sm text-muted-foreground">
                            참석 {report.attend_total}명
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          report?.status === "submitted"
                            ? "bg-green-100 text-green-800 text-xs"
                            : report?.status === "draft"
                            ? "bg-amber-100 text-amber-800 text-xs"
                            : "text-xs"
                        }
                      >
                        {report?.status === "submitted"
                          ? "제출완료"
                          : report?.status === "draft"
                          ? "임시저장"
                          : "미제출"}
                      </Badge>
                      {report && missionReport?.status !== "submitted" && (
                        <DeleteReportButton
                          apiUrl={`/api/reports/sun/${report.id}`}
                          confirmMessage={`${entry.sunNumber}순 보고서를 삭제하시겠습니까?`}
                        />
                      )}
                      {report && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/report/sun/${report.id}`}>
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
