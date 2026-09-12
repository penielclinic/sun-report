import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 선교회보고서 제출 시 담임목사에게 알림 생성
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { missionId, missionLeader } = await request.json() as {
    missionId: number;
    missionLeader: string;
  };

  const admin = adminClient();

  // 담임목사 계정 조회
  const { data: pastors } = await admin
    .from("sunbogo_profiles")
    .select("id")
    .eq("role", "pastor");

  if (pastors && pastors.length > 0) {
    await admin.from("notifications").insert(
      pastors.map((p: { id: string }) => ({
        user_id: p.id,
        title: "선교회보고서 제출",
        body: `${missionId}선교회 ${missionLeader}님이 보고서를 제출했습니다.`,
      }))
    );
  }

  return NextResponse.json({ ok: true });
}

// 알림 삭제
// notifications 테이블에는 DELETE RLS 정책이 없어(SELECT·UPDATE만 존재) 일반
// 클라이언트로 삭제를 시도하면 0건 매칭되어 에러 없이 조용히 실패한다 — 반드시
// admin 클라이언트로 삭제하고, 소유자 확인(user_id)은 애플리케이션 레벨에서 수행.
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json() as { id: string };

  const admin = adminClient();
  const { error } = await admin
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// 알림 읽음 처리
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await request.json() as { ids: string[] };

  await supabase
    .from("notifications")
    .update({ read: true })
    .in("id", ids)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
