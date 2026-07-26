import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Role } from "@/types/database";
import { getSunEntry } from "@/lib/constants/sun-directory";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { name, phone, role, sun_number, mission_id } = await request.json() as {
    name: string;
    phone?: string;
    role: Role;
    sun_number?: number;
    mission_id?: number;
  };

  if (!name || !role) {
    return NextResponse.json({ error: "필수 항목을 입력해주세요" }, { status: 400 });
  }
  if (role === "sun_leader" && !sun_number) {
    return NextResponse.json({ error: "순 번호를 선택해주세요" }, { status: 400 });
  }
  if (role === "mission_leader" && !mission_id) {
    return NextResponse.json({ error: "선교회를 선택해주세요" }, { status: 400 });
  }

  // 이미 프로필이 있으면 중복 방지
  const { data: existing } = await supabase
    .from("sunbogo_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "이미 등록된 계정입니다" }, { status: 400 });
  }

  const derivedMissionId =
    role === "sun_leader" && sun_number
      ? (getSunEntry(sun_number)?.missionId ?? null)
      : (mission_id ?? null);

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await admin.from("sunbogo_profiles").insert({
    id: user.id,
    name,
    phone: phone || null,
    role,
    sun_number: sun_number ?? null,
    mission_id: derivedMissionId,
    status: "pending",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
