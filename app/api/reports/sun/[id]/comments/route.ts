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
  sun_leader: "순장",
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
    .select("name, role, mission_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "프로필을 찾을 수 없습니다" }, { status: 400 });

  const { data: report } = await supabase
    .from("sun_reports")
    .select("id, sun_number, mission_id, created_by")
    .eq("id", reportId)
    .single();
  if (!report) return NextResponse.json({ error: "보고서를 찾을 수 없습니다" }, { status: 404 });

  // 권한 확인: 보고서 작성자 본인(순장), 소속 선교회장, 담임목사만
  const allowed =
    report.created_by === user.id ||
    profile.role === "pastor" ||
    (profile.role === "mission_leader" && profile.mission_id === report.mission_id);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = getAdminClient();
  const { data: comment, error } = await admin
    .from("sun_report_comments")
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

  // 본인이 아닌 사람의 답글이면 보고서 작성자(순장)에게 알림
  if (report.created_by !== user.id) {
    await admin.from("notifications").insert({
      user_id: report.created_by,
      title: `${ROLE_LABEL[profile.role] ?? profile.role} ${profile.name}님의 답글`,
      body: `${report.sun_number}순 보고서: ${content.trim().slice(0, 80)}`,
    });
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
    .from("sun_report_comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
