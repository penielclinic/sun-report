import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateBriefingText } from "@/lib/claude";
import {
  PASTORAL_BRIEFING_SYSTEM_PROMPT,
} from "@/lib/prompts/pastoral-briefing";
import { buildBriefingUserPrompt } from "@/lib/prompts/briefing-formatter";
import { fetchAllByReportIds } from "@/lib/utils/report-aggregator";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { data: profile } = await supabase
    .from("sunbogo_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "pastor") {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await req.json();
  const weekOf: string = body.week_of ?? new Date().toISOString().slice(0, 10);
  const dryRun: boolean = body.dry_run ?? false;

  const weekDate = new Date(weekOf);
  const year = weekDate.getFullYear();
  const month = weekDate.getMonth() + 1;
  const weekNum = Math.ceil(weekDate.getDate() / 7);

  // 이번 주 순보고 집계
  const weekEnd = new Date(weekDate.getTime() + 7 * 86400000).toISOString().slice(0, 10);

  const { data: reports } = await supabase
    .from("sun_reports")
    .select("id, sun_number, sun_leader, mission_id, attend_total, special_note")
    .gte("report_date", weekOf)
    .lt("report_date", weekEnd)
    .eq("status", "submitted");

  const reportIds = (reports ?? []).map((r) => r.id);
  const memberRows = await fetchAllByReportIds<{ bible_read: number }>(
    supabase,
    "sun_report_members",
    "bible_read",
    reportIds
  );

  // 이번 주 선교회 특별보고 항목 (새로 접수된 것)
  const { data: weekSpecialItems } = await supabase
    .from("special_report_items")
    .select("mission_id, mission_leader, category, content, status, pastor_memo, report_date")
    .gte("report_date", weekOf)
    .lt("report_date", weekEnd);

  // 진행 중인 목양 케이스 (기도중·진행중 상태의 모든 항목 — 이전 주 포함)
  const { data: activeItems } = await supabase
    .from("special_report_items")
    .select("mission_id, mission_leader, category, content, status, pastor_memo, report_date")
    .in("status", ["기도중", "진행중"])
    .lt("report_date", weekOf); // 이번 주 이전 항목만 (이번 주는 weekSpecialItems에 포함)

  const rawStats = {
    week_of: weekOf,
    total_suns: 44,
    reported_suns: (reports ?? []).length,
    total_attend: (reports ?? []).reduce((s, r) => s + (r.attend_total ?? 0), 0),
    total_bible_chapters: memberRows.reduce((s, m) => s + (m.bible_read ?? 0), 0),
    // 순보고서 특별보고 (순장이 작성)
    special_notes: (reports ?? [])
      .filter((r) => r.special_note)
      .map((r) => ({ source: `${r.sun_number}순`, note: r.special_note })),
    // 이번 주 선교회 특별보고 항목
    mission_special_items: (weekSpecialItems ?? []).map((i) => ({
      source: `선교회${i.mission_id}(${i.mission_leader})`,
      category: i.category,
      content: i.content,
      status: i.status,
      pastor_memo: i.pastor_memo ?? null,
    })),
    // 진행 중인 목양 케이스 (기도중·진행중, 이전 주 포함)
    ongoing_care_items: (activeItems ?? []).map((i) => ({
      source: `선교회${i.mission_id}(${i.mission_leader})`,
      category: i.category,
      content: i.content,
      status: i.status,
      pastor_memo: i.pastor_memo ?? null,
      report_date: i.report_date,
    })),
  };

  const userPrompt = buildBriefingUserPrompt(
    year,
    month,
    weekNum,
    JSON.stringify(rawStats, null, 2)
  );

  let briefingText = "";
  let error: string | null = null;

  try {
    briefingText = await generateBriefingText(
      PASTORAL_BRIEFING_SYSTEM_PROMPT,
      userPrompt
    );
  } catch (err) {
    error = String(err);
    console.error("Claude API 오류:", err);
  }

  const summaryMatch = briefingText.match(/\*\*이번 주 한 줄 요약\*\*\n+([^\n*]+)/);
  const briefingSummary = summaryMatch?.[1]?.trim() ?? "";

  if (!dryRun && briefingText) {
    await supabase.from("pastoral_briefings").upsert(
      {
        week_of: weekOf,
        raw_stats: rawStats,
        briefing_text: briefingText,
        briefing_summary: briefingSummary,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "week_of" }
    );
  }

  return NextResponse.json({
    ok: !error,
    week_of: weekOf,
    dry_run: dryRun,
    briefing_text: briefingText || null,
    briefing_summary: briefingSummary || null,
    error,
  });
}
