import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, ChevronRight, ClipboardList, Users, Download, BarChart2, Trophy } from "lucide-react";
import AdminDeleteButton from "@/components/dashboard/AdminDeleteButton";
import { getThisSunday, formatDate } from "@/lib/utils/report-aggregator";
import { MISSION_COUNT, SUN_COUNT, MISSION_REPORT_COUNT, BRIDGE_MISSION_ID, getMissionName } from "@/lib/constants/sun-directory";
import { AdminPdfDownload } from "@/components/admin/AdminPdfDownload";

export default async function AdminDashboard() {
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
  if (!profile || profile.role !== "pastor") redirect("/dashboard");

  const thisSunday = formatDate(getThisSunday());

  // 이번 주 순보고서 현황
  const { data: sunReports } = await supabase
    .from("sun_reports")
    .select("sun_number, mission_id, status, attend_total, bible_chapters")
    .eq("report_date", thisSunday);

  // 이번 주 선교회보고서 현황
  const { data: missionReports } = await supabase
    .from("sunbogo_mission_reports")
    .select("id, mission_id, status, total_attend, total_bible, total_offering")
    .eq("report_date", thisSunday);

  const submittedSuns = sunReports?.filter((r) => r.status === "submitted") ?? [];
  const submittedMissions = missionReports?.filter((r) => r.status === "submitted") ?? [];

  const totalAttend = submittedSuns.reduce((s, r) => s + r.attend_total, 0);
  const totalBible = submittedSuns.reduce((s, r) => s + r.bible_chapters, 0);
  const totalOffering = submittedMissions.reduce(
    (s, r) => s + r.total_offering,
    0
  );

  // 선교회별 현황
  const missionMap = new Map(missionReports?.map((r) => [r.mission_id, r]) ?? []);
  const sunMapByMission = new Map<number, typeof sunReports>();
  for (let m = 1; m <= MISSION_COUNT; m++) {
    sunMapByMission.set(m, sunReports?.filter((r) => r.mission_id === m) ?? []);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-primary">
            유진성 목사님, 안녕하세요
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {thisSunday} 주일 전체 보고 현황
          </p>
        </div>
        <AdminPdfDownload />
      </div>

      {/* 전체 통계 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">순보고서 제출</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {submittedSuns.length}
              <span className="text-sm font-normal text-muted-foreground">
                /{SUN_COUNT}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">선교회 제출</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {submittedMissions.length}
              <span className="text-sm font-normal text-muted-foreground">
                /{MISSION_REPORT_COUNT}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">총 참석인원</p>
            <p className="text-2xl font-bold text-primary mt-1">{totalAttend}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">헌금 총액</p>
            <p className="text-2xl font-bold text-primary mt-1">
              {totalOffering.toLocaleString()}원
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 성경읽기 */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">이번 주 성경읽기</p>
              <p className="text-xl font-bold text-primary mt-1">
                총 {totalBible}장
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통계 현황 */}
      <Link href="/admin/statistics">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart2 className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">통계 현황</p>
                  <p className="text-xs text-muted-foreground">출석·성경·헌금·전도 차트 및 8주 추이</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 주간 보고 다운로드 */}
      <Link href="/admin/weekly-report">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-[#C9A84C]/40 bg-[#C9A84C]/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-[#C9A84C]" />
                <div>
                  <p className="font-medium text-sm">주간 보고 다운로드</p>
                  <p className="text-xs text-muted-foreground">선교회별 예배 보고 현황 PDF·엑셀 저장</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 사용자 관리 바로가기 */}
      <Link href="/admin/users">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">사용자 관리</p>
                  <p className="text-xs text-muted-foreground">회원가입 승인 · 계정 생성 · 비밀번호 초기화</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 순원 점수 순위 바로가기 */}
      <Link href="/admin/member-scores">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-[#C9A84C]/40 bg-[#C9A84C]/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-[#C9A84C]" />
                <div>
                  <p className="font-medium text-sm">순원 점수 순위</p>
                  <p className="text-xs text-muted-foreground">출석·전도·성경 점수 집계 — 주/월/년 등수</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 순원 현황 바로가기 */}
      <Link href="/admin/members">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">순원 현황</p>
                  <p className="text-xs text-muted-foreground">전체 순원 명단 조회 및 검색</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 특별보고 관리 바로가기 */}
      <Link href="/admin/special-reports">
        <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">특별보고 관리</p>
                  <p className="text-xs text-muted-foreground">질병·재정·인간관계 등 항목별 진행상황 관리</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* 12개 선교회 현황 그리드 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">선교회별 현황</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/overview" className="text-xs text-muted-foreground">
                상세보기 <ChevronRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {Array.from({ length: MISSION_COUNT }, (_, i) => i + 1).map(
              (mId) => {
                const missionReport = missionMap.get(mId);
                const suns = sunMapByMission.get(mId) ?? [];
                const submitted = suns.filter((s) => s.status === "submitted").length;
                // 브릿지선교회: 선교회장 없이 목자가 순보고서를 직접 제출 → 순보고 제출이 곧 완료
                const isBridge = mId === BRIDGE_MISSION_ID;
                const isDone = isBridge ? submitted > 0 : missionReport?.status === "submitted";

                return (
                  <li key={mId} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                      {isDone ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : submitted > 0 ? (
                        <Clock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{getMissionName(mId)}</p>
                        <p className="text-xs text-muted-foreground">
                          {isBridge
                            ? `목자 직접보고 ${submitted}/1`
                            : `순보고 ${submitted}/${suns.length > 0 ? suns.length : "?"}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          isDone
                            ? "bg-green-100 text-green-800 text-xs"
                            : "text-xs"
                        }
                      >
                        {isDone
                          ? "제출완료"
                          : missionReport?.status === "draft"
                            ? "임시저장"
                            : "미제출"}
                      </Badge>
                      {missionReport && (
                        <AdminDeleteButton date={thisSunday} missionId={mId} />
                      )}
                      {missionReport && (
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/report/mission/${missionReport.id}`}>
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              }
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
