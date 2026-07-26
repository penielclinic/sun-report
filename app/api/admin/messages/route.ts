import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function adminClient() {
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

// 수신자 목록 조회
export async function GET() {
  const pastor = await requirePastor();
  if (!pastor) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const admin = adminClient();
  const { data } = await admin
    .from("sunbogo_profiles")
    .select("id, name, role, sun_number, mission_id, phone")
    .in("role", ["sun_leader", "mission_leader"])
    .eq("status", "active")
    .order("role")
    .order("sun_number");

  return NextResponse.json({ recipients: data ?? [] });
}

// 앱 내 메시지 발송
export async function POST(request: Request) {
  const pastor = await requirePastor();
  if (!pastor) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { title, body, targetIds } = await request.json() as {
    title: string;
    body: string;
    targetIds: string[];
  };

  if (!title?.trim() || !body?.trim() || !targetIds?.length) {
    return NextResponse.json({ error: "제목, 내용, 수신자를 입력해주세요" }, { status: 400 });
  }

  const admin = adminClient();
  const { error } = await admin.from("notifications").insert(
    targetIds.map((userId) => ({ user_id: userId, title, body }))
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, sent: targetIds.length });
}
