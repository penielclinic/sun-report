import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 순장: 자신의 순보고서 삭제
// 해당 날짜 선교회보고서가 이미 submitted이면 삭제 불가
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("sunbogo_profiles")
    .select("role, sun_number")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "sun_leader")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 보고서 조회 (본인 것인지 + 날짜/선교회 확인)
  const { data: report } = await supabase
    .from("sun_reports")
    .select("id, report_date, mission_id, created_by")
    .eq("id", id)
    .single();

  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (report.created_by !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 해당 날짜 선교회보고서가 submitted인지 확인
  const { data: missionReport } = await supabase
    .from("sunbogo_mission_reports")
    .select("status")
    .eq("mission_id", report.mission_id)
    .eq("report_date", report.report_date)
    .maybeSingle();

  if (missionReport?.status === "submitted")
    return NextResponse.json(
      { error: "이미 선교회 보고서가 제출되어 삭제할 수 없습니다." },
      { status: 409 }
    );

  const admin = adminClient();
  await admin.from("sun_report_members").delete().eq("report_id", id);
  await admin.from("sun_reports").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}
