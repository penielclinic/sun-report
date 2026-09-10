import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, newPassword } = body as { name?: string; newPassword?: string };

  const trimmedName = name?.trim();
  if (!trimmedName) {
    return NextResponse.json({ error: "이름을 입력해주세요" }, { status: 400 });
  }
  // Supabase 인증 정책상 updateUserById는 6자 미만 비밀번호를 거부하므로 동일하게 맞춤
  if (!newPassword || !/^\d{6,}$/.test(newPassword)) {
    return NextResponse.json({ error: "새 비밀번호는 숫자 6자리 이상이어야 합니다" }, { status: 400 });
  }

  const admin = getAdminClient();

  const { data: profile } = await admin
    .from("sunbogo_profiles")
    .select("id, name, status")
    .eq("name", trimmedName)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "해당 이름의 계정을 찾을 수 없습니다" }, { status: 404 });
  }
  if (profile.status !== "active") {
    return NextResponse.json(
      { error: "승인 대기 중이거나 비활성화된 계정입니다. 담임목사님께 문의해주세요" },
      { status: 400 }
    );
  }

  // 기존 대기 중인 요청이 있으면 취소하고 새로 등록 (중복 방지)
  await admin
    .from("password_reset_requests")
    .update({ status: "rejected", processed_at: new Date().toISOString() })
    .eq("profile_id", profile.id)
    .eq("status", "pending");

  const { error } = await admin.from("password_reset_requests").insert({
    profile_id: profile.id,
    name: profile.name,
    new_password: newPassword,
    status: "pending",
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 담임목사(들)에게 알림
  const { data: pastors } = await admin.from("sunbogo_profiles").select("id").eq("role", "pastor");
  if (pastors && pastors.length > 0) {
    await admin.from("notifications").insert(
      pastors.map((p: { id: string }) => ({
        user_id: p.id,
        title: "비밀번호 재설정 요청",
        body: `${profile.name}님이 새 비밀번호 승인을 요청했습니다. 사용자 관리에서 확인해주세요.`,
      }))
    );
  }

  return NextResponse.json({ success: true });
}
