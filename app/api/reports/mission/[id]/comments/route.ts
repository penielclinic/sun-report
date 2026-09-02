import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const ROLE_LABEL: Record<string, string> = {
  mission_leader: "선교회장",
  pastor: "담임목사",
};

// 답글 작성
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await request.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "내용을 입력해주세요" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("sunbogo_profiles")
    .select("name, role")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "프로필을 찾을 수 없습니다" }, { status: 400 });

  const { data: report } = await supabase
    .from("sunbogo_mission_reports")
    .select("id, mission_id, created_by")
    .eq("id", reportId)
    .single();
  if (!report) return NextResponse.json({ error: "보고서를 찾을 수 없습니다" }, { status: 404 });

  // 권한 확인: 보고서 작성자 본인(선교회장), 담임목사만
  const allowed = report.created_by === user.id || profile.role === "pastor";
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getAdminClient();
  const { data: comment, error } = await admin
    .from("mission_report_comments")
    .insert({
      report_id: reportId,
      author_id: user.id,
      author_name: profile.name,
      author_role: profile.role,
      content: content.trim(),
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const preview = content.trim().slice(0, 80);

  if (profile.role === "pastor" && report.created_by !== user.id) {
    // 담임목사 답글 → 보고서 작성자(선교회장)에게 알림
    await admin.from("notifications").insert({
      user_id: report.created_by,
      title: `담임목사 ${profile.name}님의 답글`,
      body: `${report.mission_id}선교회 보고서: ${preview}`,
    });
  } else if (report.created_by === user.id) {
    // 선교회장(작성자) 답글 → 전체 담임목사에게 알림
    const { data: pastors } = await admin
      .from("sunbogo_profiles")
      .select("id")
      .eq("role", "pastor");
    if (pastors && pastors.length > 0) {
      await admin.from("notifications").insert(
        pastors.map((p: { id: string }) => ({
          user_id: p.id,
          title: `${ROLE_LABEL[profile.role] ?? profile.role} ${profile.name}님의 답글`,
          body: `${report.mission_id}선교회 보고서: ${preview}`,
        }))
      );
    }
  }

  return NextResponse.json({ comment });
}

// 답글 삭제 (본인 것만)
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await request.json();
  if (!commentId) return NextResponse.json({ error: "commentId 필요" }, { status: 400 });

  const admin = getAdminClient();
  const { error } = await admin
    .from("mission_report_comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
