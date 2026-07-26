import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 선교회장: 자신의 선교회보고서 삭제
// submitted이면 삭제 불가 (목사님에게 이미 보고된 것)
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
    .select("role, mission_id")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "mission_leader")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: report } = await supabase
    .from("sunbogo_mission_reports")
    .select("id, status, mission_id, created_by")
    .eq("id", id)
    .single();

  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (report.mission_id !== profile.mission_id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (report.status === "submitted")
    return NextResponse.json(
      { error: "이미 담임목사님께 제출된 보고서는 삭제할 수 없습니다." },
      { status: 409 }
    );

  await adminClient().from("sunbogo_mission_reports").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
