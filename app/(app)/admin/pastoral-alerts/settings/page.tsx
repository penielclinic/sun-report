import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AlertSettingsForm } from "./AlertSettingsForm";

export default async function AlertSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("sunbogo_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "pastor") redirect("/dashboard");

  const { data: settings } = await supabase
    .from("alert_settings")
    .select("*")
    .order("alert_type");

  const { data: recipients } = await supabase
    .from("alert_recipients")
    .select("*")
    .order("role");

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1B3A6B]">알림 설정</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            목양 알림 유형별 활성화 및 수신자를 관리합니다
          </p>
        </div>
        <AlertSettingsForm
          settings={settings ?? []}
          recipients={recipients ?? []}
        />
      </div>
    </div>
  );
}
