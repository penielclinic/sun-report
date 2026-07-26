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

// 상태 변경 (승인/거절) + 역할/번호 수정
export async function PATCH(request: Request) {
  const pastor = await requirePastor();
  if (!pastor) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { userId, updates } = await request.json() as {
    userId: string;
    updates: {
      status?: string;
      role?: string;
      sun_number?: number | null;
      mission_id?: number | null;
      name?: string;
      phone?: string | null;
    };
  };

  const admin = getAdminClient();
  const { error } = await admin.from("sunbogo_profiles").update(updates).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

// 사용자 삭제
export async function DELETE(request: Request) {
  const pastor = await requirePastor();
  if (!pastor) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { userId } = await request.json() as { userId: string };
  const admin = getAdminClient();

  // 관련 데이터 먼저 삭제 (FK 제약 해소)
  await admin.from("sun_report_members").delete().in(
    "report_id",
    (await admin.from("sun_reports").select("id").eq("created_by", userId)).data?.map((r: { id: string }) => r.id) ?? []
  );
  await admin.from("sun_reports").delete().eq("created_by", userId);
  await admin.from("sunbogo_mission_reports").delete().eq("created_by", userId);
  await admin.from("sunbogo_profiles").delete().eq("id", userId);

  // auth 계정 삭제
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}

// 비밀번호 초기화
export async function PUT(request: Request) {
  const pastor = await requirePastor();
  if (!pastor) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { userId, password } = await request.json() as { userId: string; password: string };
  const admin = getAdminClient();

  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
