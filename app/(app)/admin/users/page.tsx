import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import UsersManager from "./UsersManager";
import PasswordRequestsPanel from "@/components/admin/PasswordRequestsPanel";
import type { Profile, PasswordResetRequest } from "@/types/database";

export default async function UsersAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("sunbogo_profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "pastor") redirect("/dashboard");

  // 서비스 롤로 전체 사용자 조회 (auth 이메일 포함)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profiles } = await admin.from("sunbogo_profiles").select("*").order("status").order("role");
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 500 });
  const { data: pwRequests } = await admin
    .from("password_reset_requests")
    .select("*")
    .eq("status", "pending")
    .order("requested_at");

  // profile에 이메일 합치기
  const emailMap = new Map(authUsers.map((u) => [u.id, u.email ?? ""]));
  const usersWithEmail = (profiles ?? []).map((p: Profile) => ({
    ...p,
    email: emailMap.get(p.id) ?? "",
  }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-primary">사용자 관리</h2>
        <p className="text-sm text-muted-foreground mt-1">회원가입 승인 및 계정 관리</p>
      </div>
      <PasswordRequestsPanel requests={(pwRequests ?? []) as PasswordResetRequest[]} />
      <UsersManager users={usersWithEmail} />
    </div>
  );
}
