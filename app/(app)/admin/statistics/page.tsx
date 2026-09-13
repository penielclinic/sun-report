import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Heart, TrendingUp, Megaphone } from "lucide-react";
import { StatisticsCharts } from "@/components/charts/StatisticsCharts";
import { StatisticsDownloadButtons } from "@/components/charts/StatisticsDownloadButtons";
import { AdminPdfDownload } from "@/components/admin/AdminPdfDownload";
import { MISSION_COUNT, BRIDGE_MISSION_ID } from "@/lib/constants/sun-directory";
import { fetchAllByReportIds } from "@/lib/utils/report-aggregator";

export type PeriodData = {
  date: string;
  label: string;
  samil: number;
  friday: number;
  sunDay: number;
  sunEve: number;
  sun: number;
  evangelism: number;
  attend: number;   // = sun (순모임 참석 기준 대표)
  bible: number;
  offering: number;
};

const PERIODS = [
  { key: "week",  label: "주간", desc: "최근 8주" },
  { key: "month", label: "월간", desc: "최근 12개월" },
  { key: "year",  label: "연간", desc: "최근 5년" },
];

function getSince(period: string) {
  const now = new Date();
  if (period === "month") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 11);
    d.setDate(1);
    return d.toISOString().split("T")[0];
  }
  if (period === "year") {
    return `${now.getFullYear() - 4}-01-01`;
  }
  // week: 8주 = 56일
  const d = new Date(now);
  d.setDate(d.getDate() - 56);
  return d.toISOString().split("T")[0];
}

function getTimeKey(date: string, period: string) {
  if (period === "year")  return date.slice(0, 4);
  if (period === "month") return date.slice(0, 7);
  return date;
}

function getLabel(key: string, period: string) {
  if (period === "year")  return `${key}년`;
  if (period === "month") return `${parseInt(key.slice(5))}월`;
  return key.slice(5); // MM-DD
}

export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("sunbogo_profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "pastor") redirect("/dashboard");

  const params = await searchParams;
  const period = ["week", "month", "year"].includes(params.period ?? "")
    ? (params.period ?? "week")
    : "week";

  const since = getSince(period);

  // ── 순보고서 (id 포함)
  const { data: sunReports } = await supabase
    .from("sun_reports")
    .select("id, report_date, attend_total, bible_chapters, mission_id, status")
    .gte("report_date", since)
    .eq("status", "submitted")
    .order("report_date", { ascending: true });

  const reportIds = (sunReports ?? []).map((r) => r.id);
  const reportMap = new Map((sunReports ?? []).map((r) => [r.id, r]));

  // ── 순원 출석 (6가지 항목)
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
    reportIds
  );

  // ── 선교회보고서 (헌금)
  const { data: missionReports } = await supabase
    .from("sunbogo_mission_reports")
    .select("report_date, total_offering")
    .gte("report_date", since)
    .eq("status", "submitted");

  // ── 시간 버킷별 집계
  type Bucket = { samil:number; friday:number; sunDay:number; sunEve:number; sun:number; evangelism:number; attend:number; bible:number; offering:number };
  const bucketMap = new Map<string, Bucket>();

  // sun_reports 집계
  for (const r of sunReports ?? []) {
    const key = getTimeKey(r.report_date, period);
    const e = bucketMap.get(key) ?? { samil:0, friday:0, sunDay:0, sunEve:0, sun:0, evangelism:0, attend:0, bible:0, offering:0 };
    e.attend += r.attend_total;
    e.bible  += r.bible_chapters;
    bucketMap.set(key, e);
  }

  // sun_report_members 6가지 집계
  for (const m of memberRows) {
    const report = reportMap.get(m.report_id);
    if (!report) continue;
    const key = getTimeKey(report.report_date, period);
    const e = bucketMap.get(key) ?? { samil:0, friday:0, sunDay:0, sunEve:0, sun:0, evangelism:0, attend:0, bible:0, offering:0 };
    e.samil      += m.attend_samil   ? 1 : 0;
    e.friday     += m.attend_friday  ? 1 : 0;
    e.sunDay     += m.attend_sun_day ? 1 : 0;
    e.sunEve     += m.attend_sun_eve ? 1 : 0;
    e.sun        += m.attend_sun     ? 1 : 0;
    e.evangelism += m.evangelism     ? 1 : 0;
    bucketMap.set(key, e);
  }

  // 헌금 집계
  for (const r of missionReports ?? []) {
    const key = getTimeKey(r.report_date, period);
    const e = bucketMap.get(key) ?? { samil:0, friday:0, sunDay:0, sunEve:0, sun:0, evangelism:0, attend:0, bible:0, offering:0 };
    e.offering += r.total_offering;
    bucketMap.set(key, e);
  }

  // 정렬 + 기간별 슬라이스
  const allPeriodData: PeriodData[] = Array.from(bucketMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(period === "week" ? -8 : period === "month" ? -12 : -5)
    .map(([key, v]) => ({ date: key, label: getLabel(key, period), ...v }));

  const latestBucket = allPeriodData[allPeriodData.length - 1];

  // 선교회별 차트 (최신 기간 기준)
  const latestDate = latestBucket?.date;
  const missionMap = new Map<number, number>();
  (sunReports ?? [])
    .filter((r) => getTimeKey(r.report_date, period) === latestDate)
    .forEach((r) => {
      missionMap.set(r.mission_id, (missionMap.get(r.mission_id) ?? 0) + r.attend_total);
    });
  const missionChartData = Array.from({ length: MISSION_COUNT }, (_, i) => ({
    mission: i + 1 === BRIDGE_MISSION_ID ? "브릿지" : `${i + 1}선`,
    attend: missionMap.get(i + 1) ?? 0,
  }));

  const avgAttend = allPeriodData.length > 0
    ? Math.round(allPeriodData.reduce((s, d) => s + d.attend, 0) / allPeriodData.length)
    : 0;

  const totalEvangelism = allPeriodData.reduce((s, d) => s + d.evangelism, 0);

  const periodMeta = PERIODS.find((p) => p.key === period)!;

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-primary">통계 현황</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{periodMeta.desc}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AdminPdfDownload />
          <StatisticsDownloadButtons
            periodData={allPeriodData}
            missionChartData={missionChartData}
            latestDate={latestDate}
            period={period}
            summary={{
              latestAttend: latestBucket?.attend ?? 0,
              latestOffering: latestBucket?.offering ?? 0,
              latestBible: latestBucket?.bible ?? 0,
              avgAttend,
              evangelismCount: totalEvangelism,
            }}
          />
        </div>
      </div>

      {/* 기간 탭 */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/statistics?period=${p.key}`}
            className={`flex-1 text-center py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
              period === p.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">최근 {periodMeta.label} 참석</p>
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{latestBucket?.attend ?? 0}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500" />
              <p className="text-xs text-muted-foreground">최근 {periodMeta.label} 헌금</p>
            </div>
            <p className="text-2xl font-bold text-primary mt-1">
              {(latestBucket?.offering ?? 0).toLocaleString()}원
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-green-500" />
              <p className="text-xs text-muted-foreground">최근 {periodMeta.label} 성경</p>
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{latestBucket?.bible ?? 0}장</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <p className="text-xs text-muted-foreground">평균 참석</p>
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{avgAttend}명</p>
          </CardContent>
        </Card>
        <Card className="col-span-2">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-orange-500" />
              <p className="text-xs text-muted-foreground">기간 전도 합계</p>
            </div>
            <p className="text-2xl font-bold text-primary mt-1">{totalEvangelism}건</p>
          </CardContent>
        </Card>
      </div>

      {/* 차트 */}
      <StatisticsCharts
        periodData={allPeriodData}
        missionChartData={missionChartData}
        latestDate={latestDate}
        period={period}
        periodLabel={periodMeta.label}
      />

      {/* 기간별 추이 테이블 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{periodMeta.label} 추이</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium">기간</th>
                  <th className="text-right px-2 py-2 font-medium text-[11px]">삼일</th>
                  <th className="text-right px-2 py-2 font-medium text-[11px]">금요</th>
                  <th className="text-right px-2 py-2 font-medium text-[11px]">주낮</th>
                  <th className="text-right px-2 py-2 font-medium text-[11px]">주밤</th>
                  <th className="text-right px-2 py-2 font-medium text-[11px]">순모임</th>
                  <th className="text-right px-2 py-2 font-medium text-[11px] text-amber-600">전도</th>
                  <th className="text-right px-3 py-2 font-medium text-[11px]">성경</th>
                </tr>
              </thead>
              <tbody>
                {allPeriodData.length > 0 ? (
                  [...allPeriodData].reverse().map((d) => (
                    <tr key={d.date} className="border-b last:border-0">
                      <td className="px-3 py-2">{d.label}</td>
                      <td className="px-2 py-2 text-right text-xs">{d.samil}</td>
                      <td className="px-2 py-2 text-right text-xs">{d.friday}</td>
                      <td className="px-2 py-2 text-right text-xs">{d.sunDay}</td>
                      <td className="px-2 py-2 text-right text-xs">{d.sunEve}</td>
                      <td className="px-2 py-2 text-right text-xs font-semibold text-primary">{d.sun}</td>
                      <td className="px-2 py-2 text-right text-xs text-amber-600 font-semibold">{d.evangelism}</td>
                      <td className="px-3 py-2 text-right text-xs">{d.bible}장</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center text-muted-foreground py-8">
                      데이터 없음
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
