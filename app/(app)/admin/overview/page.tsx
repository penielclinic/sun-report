import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { SUN_DIRECTORY, MISSION_COUNT, SUN_COUNT, getMissionName } from "@/lib/constants/sun-directory";
import { getThisSunday, formatDate, fetchAllByReportIds } from "@/lib/utils/report-aggregator";
import { OverviewDatePicker } from "@/components/admin/OverviewDatePicker";
import { OverviewTrendChart } from "@/components/admin/OverviewTrendChart";
import { OverviewMissionPdf } from "@/components/admin/OverviewMissionPdf";
import type { MissionStat } from "@/components/admin/OverviewMissionPdf";
import type { TrendPoint } from "@/components/admin/OverviewTrendChart";

export default async function OverviewPage({
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
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "pastor") redirect("/dashboard");

  const params = await searchParams;
  const selectedDate = params.date ?? formatDate(getThisSunday());

  // ── 선택된 날짜의 순보고서
  const { data: sunReports } = await supabase
    .from("sun_reports")
    .select("id, sun_number, status, attend_total")
    .eq("report_date", selectedDate);

  const reportMap = new Map(sunReports?.map((r) => [r.sun_number, r]) ?? []);

  // ── 순원 출석 (report_id 포함 — 전체 및 순별 집계 모두 사용)
  const allReportIds = (sunReports ?? []).map((r) => r.id);

  type MRow = {
    report_id: string;
    attend_samil: boolean; attend_friday: boolean;
    attend_sun_day: boolean; attend_sun_eve: boolean;
    attend_sun: boolean; evangelism: boolean;
  };
  const memberRows = await fetchAllByReportIds<MRow>(
    supabase,
    "sun_report_members",
    "report_id,attend_samil,attend_friday,attend_sun_day,attend_sun_eve,attend_sun,evangelism",
    allReportIds
  );

  // 전체 합계 (상단 카드)
  const attend6 = [
    { label: "삼일",   val: memberRows.filter((m) => m.attend_samil).length },
    { label: "금요",   val: memberRows.filter((m) => m.attend_friday).length },
    { label: "주낮",   val: memberRows.filter((m) => m.attend_sun_day).length },
    { label: "주밤",   val: memberRows.filter((m) => m.attend_sun_eve).length },
    { label: "순모임", val: memberRows.filter((m) => m.attend_sun).length },
    { label: "전도",   val: memberRows.filter((m) => m.evangelism).length },
  ];

  // 순별 6가지 집계 map (sunNumber → counts)
  type Sun6 = { samil: number; friday: number; sunDay: number; sunEve: number; sun: number; evangelism: number };
  const sun6Map = new Map<number, Sun6>();
  const reportIdToSunNumber = new Map((sunReports ?? []).map((r) => [r.id, r.sun_number]));
  for (const m of memberRows) {
    const sunNum = reportIdToSunNumber.get(m.report_id);
    if (!sunNum) continue;
    const e = sun6Map.get(sunNum) ?? { samil: 0, friday: 0, sunDay: 0, sunEve: 0, sun: 0, evangelism: 0 };
    if (m.attend_samil)   e.samil++;
    if (m.attend_friday)  e.friday++;
    if (m.attend_sun_day) e.sunDay++;
    if (m.attend_sun_eve) e.sunEve++;
    if (m.attend_sun)     e.sun++;
    if (m.evangelism)     e.evangelism++;
    sun6Map.set(sunNum, e);
  }

  // ── 선교회별 집계 (브릿지선교회 포함)
  const missionStats: MissionStat[] = Array.from({ length: MISSION_COUNT }, (_, i) => {
    const missionNum = i + 1;
    const missionSuns = SUN_DIRECTORY.filter((s) => s.missionId === missionNum);
    const submitted = missionSuns.filter((s) => reportMap.get(s.sunNumber)?.status === "submitted").length;
    const attend = missionSuns.reduce((sum, s) => sum + (reportMap.get(s.sunNumber)?.attend_total ?? 0), 0);
    return { missionNum, total: missionSuns.length, submitted, attend };
  });

  // ── 주간 추이 (최근 8주)
  const eightWeeksAgo = new Date(selectedDate);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const since = formatDate(eightWeeksAgo);

  const { data: trendReports } = await supabase
    .from("sun_reports")
    .select("report_date, attend_total, status")
    .gte("report_date", since)
    .lte("report_date", selectedDate)
    .eq("status", "submitted");

  const trendBucket = new Map<string, { attend: number; count: number }>();
  for (const r of trendReports ?? []) {
    const e = trendBucket.get(r.report_date) ?? { attend: 0, count: 0 };
    trendBucket.set(r.report_date, { attend: e.attend + r.attend_total, count: e.count + 1 });
  }

  const trendData: TrendPoint[] = Array.from(trendBucket.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([date, v]) => ({
      label: date.slice(5),
      attend: v.attend,
      reportedSuns: v.count,
    }));

  // ── PDF용 44순 row
  const sunRows = SUN_DIRECTORY.map((entry) => {
    const r = reportMap.get(entry.sunNumber);
    return {
      sunNumber: entry.sunNumber,
      sunLeader: entry.sunLeader,
      missionId: entry.missionId,
      status: (r?.status ?? "none") as "submitted" | "draft" | "none",
      attendTotal: r?.attend_total ?? 0,
    };
  });

  const submittedCount = (sunReports ?? []).filter((r) => r.status === "submitted").length;
  const isToday = selectedDate === formatDate(getThisSunday());

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-primary">전체 보고 현황</h2>
          <p className="text-sm text-muted-foreground">
            {selectedDate}{isToday ? " (이번 주)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <OverviewDatePicker currentDate={selectedDate} />
          <OverviewMissionPdf
            selectedDate={selectedDate}
            missionStats={missionStats}
            sunRows={sunRows}
            trendData={trendData}
          />
        </div>
      </div>

      {/* 6가지 항목별 참석 현황 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            항목별 참석 현황 — {submittedCount}순 제출
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="grid grid-cols-3 gap-2">
            {attend6.map(({ label, val }) => (
              <div
                key={label}
                className="text-center rounded-lg border bg-muted/30 py-2.5 px-1"
              >
                <p className="text-xl font-bold text-primary leading-tight">{val}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 선교회별 현황 그리드 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">선교회 현황</CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="grid grid-cols-3 gap-2">
            {missionStats.map((m) => {
              const pct = Math.round((m.submitted / m.total) * 100);
              const color =
                pct === 100
                  ? "border-green-300 bg-green-50"
                  : pct >= 50
                  ? "border-amber-300 bg-amber-50"
                  : "border-gray-200 bg-gray-50";
              return (
                <div key={m.missionNum} className={`rounded-lg border p-2 ${color}`}>
                  <p className="text-[11px] font-semibold text-primary">{getMissionName(m.missionNum)}</p>
                  <p className="text-base font-bold text-primary leading-tight mt-0.5">
                    {m.submitted}
                    <span className="text-xs font-normal text-muted-foreground">/{m.total}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">{m.attend}명</p>
                  <div className="mt-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-[#1B3A6B] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 순별 상세 테이블 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">순별 제출 현황</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium whitespace-nowrap">순</th>
                  <th className="text-left px-2 py-2 font-medium whitespace-nowrap">순장</th>
                  <th className="text-center px-1 py-2 font-medium text-indigo-600">삼일</th>
                  <th className="text-center px-1 py-2 font-medium text-purple-600">금요</th>
                  <th className="text-center px-1 py-2 font-medium text-amber-600">주낮</th>
                  <th className="text-center px-1 py-2 font-medium text-red-500">주밤</th>
                  <th className="text-center px-1 py-2 font-medium text-green-600">순모임</th>
                  <th className="text-center px-1 py-2 font-medium text-orange-500">전도</th>
                  <th className="text-center px-2 py-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody>
                {SUN_DIRECTORY.map((entry) => {
                  const report = reportMap.get(entry.sunNumber);
                  const s6 = sun6Map.get(entry.sunNumber);
                  const hasData = report?.status === "submitted" && s6;
                  return (
                    <tr key={entry.sunNumber} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium whitespace-nowrap">
                        {report ? (
                          <Link href={`/report/sun/${report.id}`} className="text-primary underline underline-offset-2">
                            {entry.sunNumber}순
                          </Link>
                        ) : (
                          `${entry.sunNumber}순`
                        )}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{entry.sunLeader}</td>
                      <td className="px-1 py-2 text-center text-indigo-600 font-medium">{hasData ? s6.samil : "−"}</td>
                      <td className="px-1 py-2 text-center text-purple-600 font-medium">{hasData ? s6.friday : "−"}</td>
                      <td className="px-1 py-2 text-center text-amber-600 font-medium">{hasData ? s6.sunDay : "−"}</td>
                      <td className="px-1 py-2 text-center text-red-500 font-medium">{hasData ? s6.sunEve : "−"}</td>
                      <td className="px-1 py-2 text-center text-green-600 font-semibold">{hasData ? s6.sun : "−"}</td>
                      <td className="px-1 py-2 text-center text-orange-500 font-medium">{hasData ? s6.evangelism : "−"}</td>
                      <td className="px-2 py-2 text-center">
                        {report?.status === "submitted" ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mx-auto" />
                        ) : report?.status === "draft" ? (
                          <Clock className="w-3.5 h-3.5 text-amber-400 mx-auto" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-gray-300 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-primary/20 bg-primary/5 font-bold">
                  <td className="px-3 py-2 text-xs whitespace-nowrap text-primary">합계</td>
                  <td className="px-2 py-2 text-xs text-muted-foreground">
                    {submittedCount}순 제출
                  </td>
                  <td className="px-1 py-2 text-center text-xs text-indigo-600">{attend6[0].val}</td>
                  <td className="px-1 py-2 text-center text-xs text-purple-600">{attend6[1].val}</td>
                  <td className="px-1 py-2 text-center text-xs text-amber-600">{attend6[2].val}</td>
                  <td className="px-1 py-2 text-center text-xs text-red-500">{attend6[3].val}</td>
                  <td className="px-1 py-2 text-center text-xs text-green-600">{attend6[4].val}</td>
                  <td className="px-1 py-2 text-center text-xs text-orange-500">{attend6[5].val}</td>
                  <td className="px-2 py-2 text-center text-xs text-muted-foreground">
                    {submittedCount}/{SUN_COUNT}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
