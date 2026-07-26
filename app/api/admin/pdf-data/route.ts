import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { getThisSunday, formatDate } from "@/lib/utils/report-aggregator";

function getDateRange(period: string) {
  const now = new Date();
  if (period === "week") {
    const sun = formatDate(getThisSunday());
    return { startDate: sun, endDate: sun, label: `${sun} 주일` };
  }
  if (period === "month") {
    const y = now.getFullYear(), m = now.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const end = `${y}-${String(m + 1).padStart(2, "0")}-${new Date(y, m + 1, 0).getDate()}`;
    return { startDate: start, endDate: end, label: `${y}년 ${m + 1}월` };
  }
  const y = now.getFullYear();
  return { startDate: `${y}-01-01`, endDate: `${y}-12-31`, label: `${y}년` };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("sunbogo_profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "pastor")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const period = req.nextUrl.searchParams.get("period") ?? "week";
  const { startDate, endDate, label } = getDateRange(period);

  // ① 순보고서
  const { data: sunReports } = await supabase
    .from("sun_reports")
    .select("id, sun_number, sun_leader, mission_id, attend_total, bible_chapters, report_date, status")
    .eq("status", "submitted")
    .gte("report_date", startDate)
    .lte("report_date", endDate)
    .order("report_date");

  const reportIds = (sunReports ?? []).map((r) => r.id);

  // ② 순원 출석 (6가지 항목)
  type MemberRow = {
    attend_samil: boolean;
    attend_friday: boolean;
    attend_sun_day: boolean;
    attend_sun_eve: boolean;
    attend_sun: boolean;
    evangelism: boolean;
    bible_read: number;
    report_id: string;
  };

  let memberRows: MemberRow[] = [];
  if (reportIds.length > 0) {
    const { data } = await supabase
      .from("sun_report_members")
      .select("attend_samil,attend_friday,attend_sun_day,attend_sun_eve,attend_sun,evangelism,bible_read,report_id")
      .in("report_id", reportIds);
    memberRows = (data ?? []) as MemberRow[];
  }

  // ③ 선교회보고서 (헌금)
  const { data: missionReports } = await supabase
    .from("sunbogo_mission_reports")
    .select("mission_id, total_offering, report_date")
    .eq("status", "submitted")
    .gte("report_date", startDate)
    .lte("report_date", endDate);

  // ④ 6가지 항목 집계
  const attend6 = {
    samil:  memberRows.filter((m) => m.attend_samil).length,
    friday: memberRows.filter((m) => m.attend_friday).length,
    sunDay: memberRows.filter((m) => m.attend_sun_day).length,
    sunEve: memberRows.filter((m) => m.attend_sun_eve).length,
    sun:    memberRows.filter((m) => m.attend_sun).length,
    evangelism: memberRows.filter((m) => m.evangelism).length,
  };

  const totalBible   = (sunReports ?? []).reduce((s, r) => s + r.bible_chapters, 0);
  const totalOffering = (missionReports ?? []).reduce((s, r) => s + r.total_offering, 0);

  // ⑤ 선교회별 집계
  const missionMap = new Map<number, { attend: number; bible: number; offering: number; sunCount: number }>();
  for (let i = 1; i <= 12; i++) missionMap.set(i, { attend: 0, bible: 0, offering: 0, sunCount: 0 });
  (sunReports ?? []).forEach((r) => {
    const e = missionMap.get(r.mission_id)!;
    e.attend += r.attend_total;
    e.bible  += r.bible_chapters;
    e.sunCount++;
  });
  (missionReports ?? []).forEach((r) => {
    const e = missionMap.get(r.mission_id)!;
    e.offering += r.total_offering;
  });

  const missionTable = Array.from(missionMap.entries()).map(([id, v]) => ({ id, ...v }));

  // ⑥ 기간별 주차/월별 집계 (월간·연간 트렌드)
  const trendMap = new Map<string, { attend: number; bible: number; offering: number }>();
  (sunReports ?? []).forEach((r) => {
    const key = period === "year" ? r.report_date.slice(0, 7) : r.report_date;
    const e = trendMap.get(key) ?? { attend: 0, bible: 0, offering: 0 };
    trendMap.set(key, { ...e, attend: e.attend + r.attend_total, bible: e.bible + r.bible_chapters });
  });
  (missionReports ?? []).forEach((r) => {
    const key = period === "year" ? r.report_date.slice(0, 7) : r.report_date;
    const e = trendMap.get(key) ?? { attend: 0, bible: 0, offering: 0 };
    trendMap.set(key, { ...e, offering: e.offering + r.total_offering });
  });
  const trend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  return NextResponse.json({
    period, label, startDate, endDate,
    attend6,
    totalBible,
    totalOffering,
    sunCount: sunReports?.length ?? 0,
    missionTable,
    trend,
    generatedAt: new Date().toLocaleDateString("ko-KR"),
  });
}
