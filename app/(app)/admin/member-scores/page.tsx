import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { getThisSunday, formatDate } from "@/lib/utils/report-aggregator";
import { Trophy, ChevronLeft } from "lucide-react";
import MemberScoresTable from "./MemberScoresTable";
import DateRangePicker from "./DateRangePicker";

// ─── 점수 기준 ────────────────────────────────
const SCORE_ATTEND   = 1;    // 출석 항목당 1점 (삼일·금요·주낮·주밤·순모임)
const SCORE_EVANGEL  = 10;   // 전도 1회 10점
const SCORE_BIBLE    = 0.02; // 성경 1장 0.02점

// ─── 기간 범위 계산 ───────────────────────────
function getDateRange(period: string, from?: string, to?: string) {
  const now = new Date();
  if (period === "custom" && from && to) {
    return { startDate: from, endDate: to, label: `${from} ~ ${to}` };
  }
  if (period === "week") {
    const sun = formatDate(getThisSunday());
    return { startDate: sun, endDate: sun, label: "이번 주" };
  }
  if (period === "month") {
    const y = now.getFullYear(), m = now.getMonth();
    return {
      startDate: formatDate(new Date(y, m, 1)),
      endDate:   formatDate(new Date(y, m + 1, 0)),
      label: `${y}년 ${m + 1}월`,
    };
  }
  const y = now.getFullYear();
  return {
    startDate: `${y}-01-01`,
    endDate:   `${y}-12-31`,
    label:     `${y}년`,
  };
}

// ─── 집계 타입 ────────────────────────────────
type MemberAgg = {
  memberName: string;
  sunNumber: number;
  missionId: number;
  samil: number;
  friday: number;
  sunDay: number;
  sunEve: number;
  sun: number;
  evangelism: number;
  totalBible: number;
  totalScore: number;
  rank: number;
};

// ─── 동점 순위 부여 ───────────────────────────
function assignRanks(sorted: Omit<MemberAgg, "rank">[]): MemberAgg[] {
  let rank = 1;
  return sorted.map((m, i) => {
    if (i > 0 && m.totalScore < sorted[i - 1].totalScore) rank = i + 1;
    return { ...m, rank };
  });
}

const PERIODS = [
  { key: "week",  label: "이번 주" },
  { key: "month", label: "이번 달" },
  { key: "year",  label: "올해"   },
];

export default async function MemberScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("sunbogo_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "pastor") redirect("/dashboard");

  const params = await searchParams;
  const period = ["week", "month", "year", "custom"].includes(params.period ?? "")
    ? (params.period ?? "week")
    : "week";
  const { startDate, endDate, label } = getDateRange(period, params.from, params.to);

  // ① 기간 내 제출된 순보고서 조회
  const { data: reports } = await supabase
    .from("sun_reports")
    .select("id, sun_number, sun_leader, mission_id")
    .eq("status", "submitted")
    .gte("report_date", startDate)
    .lte("report_date", endDate);

  const reportIds = (reports ?? []).map((r) => r.id);
  const reportMap = new Map((reports ?? []).map((r) => [r.id, r]));

  // ② 해당 보고서의 순원 출석 데이터 조회
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

  let rawMembers: RawMember[] = [];
  if (reportIds.length > 0) {
    const { data } = await supabase
      .from("sun_report_members")
      .select(
        "member_name, attend_samil, attend_friday, attend_sun_day, attend_sun_eve, attend_sun, evangelism, bible_read, report_id"
      )
      .in("report_id", reportIds);
    rawMembers = (data ?? []) as RawMember[];
  }

  // ③ 멤버별 집계 (member_name + sun_number 기준)
  const aggMap = new Map<string, Omit<MemberAgg, "rank" | "totalScore">>();

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
        memberName:  m.member_name,
        sunNumber:   report.sun_number,
        missionId:   report.mission_id,
        samil:       m.attend_samil   ? 1 : 0,
        friday:      m.attend_friday  ? 1 : 0,
        sunDay:      m.attend_sun_day ? 1 : 0,
        sunEve:      m.attend_sun_eve ? 1 : 0,
        sun:         m.attend_sun     ? 1 : 0,
        evangelism:  m.evangelism     ? 1 : 0,
        totalBible:  m.bible_read || 0,
      });
    }
  }

  // ④ 점수 계산 + 정렬 + 순위 부여
  const sortedWithScore = Array.from(aggMap.values())
    .map((m) => ({
      ...m,
      totalScore: parseFloat(
        (
          (m.samil + m.friday + m.sunDay + m.sunEve + m.sun) * SCORE_ATTEND +
          m.evangelism * SCORE_EVANGEL +
          m.totalBible * SCORE_BIBLE
        ).toFixed(2)
      ),
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  const ranked = assignRanks(sortedWithScore);

  const isWeek = period === "week";

  return (
    <div className="space-y-4 pb-8">
      {/* 뒤로가기 + 헤더 */}
      <div>
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-3"
        >
          <ChevronLeft className="w-4 h-4" />
          대시보드
        </Link>
        <h2 className="text-xl font-bold text-primary flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#C9A84C]" />
          순원 점수 순위
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          출석 1점 · 전도 10점 · 성경 1장 0.02점
        </p>
      </div>

      {/* 기간 탭 */}
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/member-scores?period=${p.key}`}
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

      {/* 달력 (커스텀 날짜 범위) */}
      <DateRangePicker
        activePeriod={period}
        defaultFrom={params.from}
        defaultTo={params.to}
      />

      {/* 기간 요약 */}
      <div className="flex items-center justify-between px-1">
        <span className="font-semibold text-base text-primary">{label}</span>
        <span className="text-sm text-muted-foreground">
          {ranked.length}명 집계 · {reportIds.length}개 순보고서
        </span>
      </div>

      {/* TOP 3 하이라이트 */}
      {ranked.length >= 1 && (
        <div className="grid grid-cols-3 gap-2">
          {(["🥇", "🥈", "🥉"] as const).map((medal, idx) => {
            const m = ranked[idx];
            if (!m) return <div key={idx} />;
            return (
              <Card
                key={`${m.memberName}-${m.sunNumber}`}
                className={`text-center ${
                  idx === 0 ? "border-yellow-400 bg-yellow-50/50" :
                  idx === 1 ? "border-gray-400 bg-gray-50/50" :
                              "border-amber-700/40 bg-amber-50/30"
                }`}
              >
                <CardContent className="pt-3 pb-3">
                  <div className="text-2xl mb-1">{medal}</div>
                  <p className="font-bold text-sm truncate">{m.memberName}</p>
                  <p className="text-xs text-muted-foreground">{m.sunNumber}순</p>
                  <p className="text-lg font-bold text-primary mt-1">{m.totalScore}점</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 전체 순위 테이블 */}
      {ranked.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            이 기간에 제출된 보고서가 없습니다
          </CardContent>
        </Card>
      ) : (
        <MemberScoresTable
          ranked={ranked}
          isWeek={isWeek}
          period={period}
          label={label}
          customFrom={params.from}
          customTo={params.to}
        />
      )}

      {/* 점수 기준 안내 */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-3 pb-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">📌 점수 계산 기준</p>
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div className="bg-white rounded-lg p-2 border">
              <p className="text-lg font-bold text-primary">1점</p>
              <p className="text-muted-foreground mt-0.5">출석 (항목당)</p>
              <p className="text-[10px] text-muted-foreground">삼일·금요·주낮·주밤·순모임</p>
            </div>
            <div className="bg-white rounded-lg p-2 border">
              <p className="text-lg font-bold text-amber-600">10점</p>
              <p className="text-muted-foreground mt-0.5">전도 1회</p>
              <p className="text-[10px] text-muted-foreground">전도 시마다 적용</p>
            </div>
            <div className="bg-white rounded-lg p-2 border">
              <p className="text-lg font-bold text-blue-600">0.02점</p>
              <p className="text-muted-foreground mt-0.5">성경 1장</p>
              <p className="text-[10px] text-muted-foreground">읽은 장수 × 0.02</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
