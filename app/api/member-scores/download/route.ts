import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getThisSunday, formatDate, fetchAllByReportIds } from "@/lib/utils/report-aggregator";
import * as XLSX from "xlsx";
import { NextRequest, NextResponse } from "next/server";

const SCORE_ATTEND  = 1;
const SCORE_EVANGEL = 10;
const SCORE_BIBLE   = 0.02;

function getDateRange(period: string, from?: string | null, to?: string | null) {
  const now = new Date();
  if (period === "custom" && from && to) {
    return { startDate: from, endDate: to, label: `${from}~${to}` };
  }
  if (period === "week") {
    const sun = formatDate(getThisSunday());
    return { startDate: sun, endDate: sun, label: "이번주" };
  }
  if (period === "month") {
    const y = now.getFullYear(), m = now.getMonth();
    return {
      startDate: formatDate(new Date(y, m, 1)),
      endDate:   formatDate(new Date(y, m + 1, 0)),
      label: `${y}년${m + 1}월`,
    };
  }
  const y = now.getFullYear();
  return { startDate: `${y}-01-01`, endDate: `${y}-12-31`, label: `${y}년` };
}

type MemberWithScore = {
  memberName: string; sunNumber: number; missionId: number;
  samil: number; friday: number; sunDay: number; sunEve: number;
  sun: number; evangelism: number; totalBible: number; totalScore: number;
};

function assignRanks(sorted: MemberWithScore[]) {
  let rank = 1;
  return sorted.map((m, i) => {
    if (i > 0 && m.totalScore < sorted[i - 1].totalScore) rank = i + 1;
    return { ...m, rank };
  });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("sunbogo_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "pastor")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const period = req.nextUrl.searchParams.get("period") ?? "week";
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const { startDate, endDate, label } = getDateRange(
    ["week", "month", "year", "custom"].includes(period) ? period : "week",
    from,
    to
  );

  const { data: reports } = await supabase
    .from("sun_reports")
    .select("id, sun_number, sun_leader, mission_id")
    .eq("status", "submitted")
    .gte("report_date", startDate)
    .lte("report_date", endDate);

  const reportIds = (reports ?? []).map((r) => r.id);
  const reportMap = new Map((reports ?? []).map((r) => [r.id, r]));

  type RawMember = {
    member_name: string;
    attend_samil: boolean;
    attend_friday: boolean;
    attend_sun_day: boolean;
    attend_sun_eve: boolean;
    attend_sun: boolean;
    evangelism: boolean;
    bible_read: number;
    report_id: string;
  };

  const rawMembers = await fetchAllByReportIds<RawMember>(
    supabase,
    "sun_report_members",
    "member_name, attend_samil, attend_friday, attend_sun_day, attend_sun_eve, attend_sun, evangelism, bible_read, report_id",
    reportIds
  );

  const aggMap = new Map<string, {
    memberName: string; sunNumber: number; missionId: number;
    samil: number; friday: number; sunDay: number; sunEve: number;
    sun: number; evangelism: number; totalBible: number;
  }>();

  for (const m of rawMembers) {
    const report = reportMap.get(m.report_id);
    if (!report) continue;
    const key = `${m.member_name}__${report.sun_number}`;
    const ex = aggMap.get(key);
    if (ex) {
      ex.samil      += m.attend_samil   ? 1 : 0;
      ex.friday     += m.attend_friday  ? 1 : 0;
      ex.sunDay     += m.attend_sun_day ? 1 : 0;
      ex.sunEve     += m.attend_sun_eve ? 1 : 0;
      ex.sun        += m.attend_sun     ? 1 : 0;
      ex.evangelism += m.evangelism     ? 1 : 0;
      ex.totalBible += m.bible_read || 0;
    } else {
      aggMap.set(key, {
        memberName: m.member_name, sunNumber: report.sun_number, missionId: report.mission_id,
        samil: m.attend_samil ? 1 : 0, friday: m.attend_friday ? 1 : 0,
        sunDay: m.attend_sun_day ? 1 : 0, sunEve: m.attend_sun_eve ? 1 : 0,
        sun: m.attend_sun ? 1 : 0, evangelism: m.evangelism ? 1 : 0,
        totalBible: m.bible_read || 0,
      });
    }
  }

  const sorted = Array.from(aggMap.values())
    .map((m) => ({
      ...m,
      totalScore: parseFloat(
        ((m.samil + m.friday + m.sunDay + m.sunEve + m.sun) * SCORE_ATTEND +
         m.evangelism * SCORE_EVANGEL + m.totalBible * SCORE_BIBLE).toFixed(2)
      ),
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  const ranked = assignRanks(sorted);

  // Excel 시트 데이터 구성
  const rows = ranked.map((m) => ({
    "순위":       m.rank,
    "이름":       m.memberName,
    "순":         m.sunNumber,
    "선교회":     m.missionId,
    "삼일예배":   m.samil,
    "금요예배":   m.friday,
    "주일낮예배": m.sunDay,
    "주일밤예배": m.sunEve,
    "순모임":     m.sun,
    "전도":       m.evangelism,
    "성경(장)":   m.totalBible,
    "총점":       m.totalScore,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // 열 너비 설정
  ws["!cols"] = [
    { wch: 6 }, { wch: 10 }, { wch: 5 }, { wch: 7 },
    { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 },
    { wch: 8 }, { wch: 6 }, { wch: 9 }, { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "순원점수순위");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const filename = encodeURIComponent(`순원점수순위_${label}.xlsx`);

  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}
