import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { createSpecialItemAlert } from "@/lib/pastoral-alert";

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const { itemId, missionId, missionLeader, category, content, status, pastorMemo, reportDate } = body;

  // 해결됨 상태는 알림 불필요
  if (status === "해결됨") return NextResponse.json({ ok: true, skipped: "resolved" });

  await createSpecialItemAlert({
    itemId,
    missionId,
    missionLeader,
    category,
    content,
    status,
    pastorMemo,
    reportDate,
  }).catch((e) => console.error("special item alert error:", e));

  return NextResponse.json({ ok: true });
}
