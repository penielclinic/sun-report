import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 담임목사: 날짜 기준 보고서 삭제
// body: { date: "YYYY-MM-DD", missionId?: number }
// missionId 없으면 해당 날짜 전체 삭제
export async function DELETE(req: Request) {
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

  const { date, missionId } = await req.json() as { date: string; missionId?: number };
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const admin = adminClient();

  // 대상 sun_reports id 조회
  let sunQuery = admin
    .from("sun_reports")
    .select("id")
    .eq("report_date", date);
  if (missionId) sunQuery = sunQuery.eq("mission_id", missionId);

  const { data: sunRows } = await sunQuery;
  const sunIds = sunRows?.map((r) => r.id) ?? [];

  if (sunIds.length > 0) {
    await admin.from("sun_report_members").delete().in("report_id", sunIds);
    await admin.from("sun_reports").delete().in("id", sunIds);
  }

  // 선교회보고서 삭제
  let missionQuery = admin
    .from("sunbogo_mission_reports")
    .delete()
    .eq("report_date", date);
  if (missionId) missionQuery = missionQuery.eq("mission_id", missionId);
  await missionQuery;

  return NextResponse.json({ ok: true });
}
