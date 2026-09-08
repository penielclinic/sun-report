import Link from "next/link";
import Image from "next/image";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, TrendingUp, Megaphone, ArrowLeft } from "lucide-react";
import { StatisticsCharts } from "@/components/charts/StatisticsCharts";
import { MISSION_COUNT, BRIDGE_MISSION_ID } from "@/lib/constants/sun-directory";
import type { PeriodData } from "@/app/(app)/admin/statistics/page";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const PERIODS = [
  { key: "week", label: "주간", desc: "최근 8주" },
  { key: "month", label: "월간", desc: "최근 12개월" },
  { key: "year", label: "연간", desc: "최근 5년" },
];

function getSince(period: string) {
  const now = new Date();
  if (period === "month") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 11);
    d.setDate(1);
    return d.toISOString().split("T")[0];
  }
  if (period === "year") return `${now.getFullYear() - 4}-01-01`;
  const d = new Date(now);
  d.setDate(d.getDate() - 56);
  return d.toISOString().split("T")[0];
}

function getTimeKey(date: string, period: string) {
  if (period === "year") return date.slice(0, 4);
  if (period === "month") return date.slice(0, 7);
  return date;
}

function getLabel(key: string, period: string) {
  if (period === "year") return `${key}년`;
  if (period === "month") return `${parseInt(key.slice(5))}월`;
  return key.slice(5);
}

// 헌금은 공개 통계에서 제외 — 선교회장·담임목사만 열람 가능한 항목
type PublicPeriodData = Omit<PeriodData, "offering">;

export default async function PublicStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const admin = getAdminClient();
  const params = await searchParams;
  const period = ["week", "month", "year"].includes(params.period ?? "")
    ? (params.period ?? "week")
    : "week";

  const since = getSince(period);

  const { data: sunReports } = await admin
    .from("sun_reports")
    .select("id, report_date, attend_total, bible_chapters, mission_id, status")
    .gte("report_date", since)
    .eq("status", "submitted")
    .order("report_date", { ascending: true });

  const reportIds = (sunReports ?? []).map((r) => r.id);
  const reportMap = new Map((sunReports ?? []).map((r) => [r.id, r]));

  type MRow = {
    report_id: string;
    attend_samil: boolean; attend_friday: boolean;
    attend_sun_day: boolean; attend_sun_eve: boolean;
    attend_sun: boolean; evangelism: boolean;
  };
  let memberRows: MRow[] = [];
  if (reportIds.length > 0) {
    const { data } = await admin
      .from("sun_report_members")
      .select("report_id,attend_samil,attend_friday,attend_sun_day,attend_sun_eve,attend_sun,evangelism")
      .in("report_id", reportIds);
    memberRows = (data ?? []) as MRow[];
  }

  type Bucket = { samil: number; friday: number; sunDay: number; sunEve: number; sun: number; evangelism: number; attend: number; bible: number };
  const bucketMap = new Map<string, Bucket>();

  for (const r of sunReports ?? []) {
    const key = getTimeKey(r.report_date, period);
    const e = bucketMap.get(key) ?? { samil: 0, friday: 0, sunDay: 0, sunEve: 0, sun: 0, evangelism: 0, attend: 0, bible: 0 };
    e.attend += r.attend_total;
    e.bible += r.bible_chapters;
    bucketMap.set(key, e);
  }

  for (const m of memberRows) {
    const report = reportMap.get(m.report_id);
    if (!report) continue;
    const key = getTimeKey(report.report_date, period);
    const e = bucketMap.get(key) ?? { samil: 0, friday: 0, sunDay: 0, sunEve: 0, sun: 0, evangelism: 0, attend: 0, bible: 0 };
    e.samil += m.attend_samil ? 1 : 0;
    e.friday += m.attend_friday ? 1 : 0;
    e.sunDay += m.attend_sun_day ? 1 : 0;
    e.sunEve += m.attend_sun_eve ? 1 : 0;
    e.sun += m.attend_sun ? 1 : 0;
    e.evangelism += m.evangelism ? 1 : 0;
    bucketMap.set(key, e);
  }

  const allPeriodData: PublicPeriodData[] = Array.from(bucketMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(period === "week" ? -8 : period === "month" ? -12 : -5)
    .map(([key, v]) => ({ date: key, label: getLabel(key, period), ...v }));

  const latestBucket = allPeriodData[allPeriodData.length - 1];
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground shadow-sm">
        <div className="container mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="로고" width={26} height={26} />
            <span className="font-bold">순보고 · 전체 통계</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-primary-foreground hover:bg-primary-foreground/10 gap-1"
          >
            <Link href="/login">
              <ArrowLeft className="w-4 h-4" />
              로그인으로
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-6 space-y-4">
        <div className="rounded-xl border border-[#C9A84C]/40 bg-[#C9A84C]/10 px-4 py-3 text-center">
          <p className="text-sm text-primary font-semibold">
            누구나 로그인 없이 볼 수 있는 공개 통계입니다
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            출석 · 성경읽기 · 전도 현황만 제공되며, 헌금 등 민감한 정보는 포함되지 않습니다
          </p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-primary">전체 통계 현황</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{periodMeta.desc}</p>
        </div>

        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={`/public-stats?period=${p.key}`}
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
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-orange-500" />
                <p className="text-xs text-muted-foreground">기간 전도 합계</p>
              </div>
              <p className="text-2xl font-bold text-primary mt-1">{totalEvangelism}건</p>
            </CardContent>
          </Card>
        </div>

        <StatisticsCharts
          periodData={allPeriodData as PeriodData[]}
          missionChartData={missionChartData}
          latestDate={latestDate}
          period={period}
          periodLabel={periodMeta.label}
        />

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

        <p className="text-center text-[11px] text-muted-foreground pb-4">
          해운대순복음교회 순보고 시스템
        </p>
      </main>
    </div>
  );
}
