import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Vercel Cron: 매주 일요일 오후 2시 KST (05:00 UTC)
// 미제출 순장에게 알림 생성
export async function GET(request: Request) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = adminClient();

  // 이번 주 일요일 날짜 계산 (KST 기준)
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const todayStr = kstNow.toISOString().split("T")[0]; // YYYY-MM-DD

  // 오늘 날짜로 이미 제출된 순보고서 목록 조회
  const { data: submittedReports } = await admin
    .from("sun_reports")
    .select("sun_number")
    .eq("report_date", todayStr)
    .eq("status", "submitted");

  const submittedSunNumbers = new Set(
    (submittedReports ?? []).map((r: { sun_number: number }) => r.sun_number)
  );

  // 미제출 순장 프로필 조회 (1~44순)
  const { data: allSunLeaders } = await admin
    .from("sunbogo_profiles")
    .select("id, name, sun_number")
    .eq("role", "sun_leader")
    .eq("status", "approved");

  if (!allSunLeaders || allSunLeaders.length === 0) {
    return NextResponse.json({ ok: true, notified: 0 });
  }

  // 미제출 순장 필터링
  const unsubmitted = allSunLeaders.filter(
    (p: { sun_number: number | null }) =>
      p.sun_number && !submittedSunNumbers.has(p.sun_number)
  );

  if (unsubmitted.length === 0) {
    return NextResponse.json({ ok: true, notified: 0, message: "전원 제출 완료" });
  }

  // 미제출 순장에게 알림 생성
  const { error } = await admin.from("notifications").insert(
    unsubmitted.map((p: { id: string; name: string; sun_number: number }) => ({
      user_id: p.id,
      title: "순보고서 미제출 알림",
      body: `${p.name} 순장님, 아직 오늘 순보고서를 제출하지 않으셨습니다. 예배 후 보고서를 작성해 주세요.`,
    }))
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, notified: unsubmitted.length });
}
