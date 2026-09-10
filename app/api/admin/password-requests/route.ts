import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requirePastor() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("sunbogo_profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "pastor") return null;
  return user;
}

// 승인/거절
export async function PATCH(request: Request) {
  const pastor = await requirePastor();
  if (!pastor) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { requestId, action } = await request.json() as { requestId: string; action: "approve" | "reject" };
  if (!requestId || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const admin = getAdminClient();

  const { data: reqRow } = await admin
    .from("password_reset_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (!reqRow) return NextResponse.json({ error: "요청을 찾을 수 없습니다" }, { status: 404 });
  if (reqRow.status !== "pending") {
    return NextResponse.json({ error: "이미 처리된 요청입니다" }, { status: 400 });
  }

  if (action === "approve") {
    if (!reqRow.new_password) {
      return NextResponse.json({ error: "비밀번호 정보가 없습니다" }, { status: 400 });
    }
    const { error } = await admin.auth.admin.updateUserById(reqRow.profile_id, {
      password: reqRow.new_password,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin
    .from("password_reset_requests")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      processed_at: new Date().toISOString(),
      processed_by: pastor.id,
      new_password: null, // 처리 즉시 평문 비밀번호 제거
    })
    .eq("id", requestId);

  await admin.from("notifications").insert({
    user_id: reqRow.profile_id,
    title: action === "approve" ? "비밀번호 변경 승인됨" : "비밀번호 변경 요청 거절됨",
    body: action === "approve"
      ? "새로 설정하신 비밀번호로 로그인하실 수 있습니다."
      : "담임목사님이 요청을 거절했습니다. 필요하면 다시 요청하거나 직접 문의해주세요.",
  });

  return NextResponse.json({ success: true });
}
