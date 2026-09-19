import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSunEntry } from "@/lib/constants/sun-directory";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  // 1. 사용자 인증 확인 (일반 클라이언트)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { reportId, reportPayload, members } = body;

  // 2. created_by 강제 고정 (서버에서 검증된 user.id)
  reportPayload.created_by = user.id;

  // mission_id가 null이면 sun_number로 자동 파생 (프로필 미설정 계정 대응)
  if (!reportPayload.mission_id && reportPayload.sun_number) {
    reportPayload.mission_id = getSunEntry(reportPayload.sun_number)?.missionId ?? null;
  }

  // 3. 서비스 롤로 RLS 우회하여 저장
  const admin = getAdminClient();
  let currentReportId = reportId;

  if (currentReportId) {
    const { error } = await admin
      .from("sun_reports")
      .update(reportPayload)
      .eq("id", currentReportId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { data, error } = await admin
      .from("sun_reports")
      .insert(reportPayload)
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    currentReportId = data.id;
  }

  // 4. 순원 데이터 저장
  await admin.from("sun_report_members").delete().eq("report_id", currentReportId);

  const validMembers = (members as Record<string, unknown>[]).filter(
    (m) => (m.member_name as string).trim()
  );
  if (validMembers.length > 0) {
    const { error } = await admin.from("sun_report_members").insert(
      validMembers.map((m) => {
        // id는 DB에서 자동 생성 — 클라이언트에서 온 id 제외
        const { id: _, ...rest } = m as Record<string, unknown> & { id?: unknown };
        return { ...rest, report_id: currentReportId };
      })
    );
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 5. 제출(submitted) 시 → 해당 선교회장에게 알림 생성
  if (reportPayload.status === "submitted") {
    const missionId = reportPayload.mission_id;
    if (missionId) {
      const { data: leaders } = await admin
        .from("sunbogo_profiles")
        .select("id")
        .eq("role", "mission_leader")
        .eq("mission_id", missionId);
      if (leaders && leaders.length > 0) {
        // 성경통독·필사 완료자가 있으면 알림에 함께 표시 (순장 → 선교회장 보고)
        const pilsa = validMembers.filter((m) => m.bible_pilsa).length;
        const tongdok = validMembers.filter((m) => m.bible_tongdok).length;
        const bibleNote =
          pilsa || tongdok
            ? ` (성경${[pilsa && `필사 ${pilsa}명`, tongdok && `통독 ${tongdok}명`].filter(Boolean).join("·")} 보고 포함)`
            : "";
        await admin.from("notifications").insert(
          leaders.map((l: { id: string }) => ({
            user_id: l.id,
            title: "순보고서 제출",
            body: `${reportPayload.sun_number}순 ${reportPayload.sun_leader}님이 보고서를 제출했습니다.${bibleNote}`,
          }))
        );
      }
    }
  }

  return NextResponse.json({ id: currentReportId });
}
