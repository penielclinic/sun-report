import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertList } from "@/components/alerts/AlertList";
import { AlertBadge } from "@/components/alerts/AlertBadge";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

export default async function PastoralAlertsPage() {
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

  // 최근 알림 100건
  const { data: alerts } = await supabase
    .from("pastoral_alerts")
    .select(
      "id, alert_type, member_name, sun_number, sun_leader, triggered_by, source_text, status, is_read, sent_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const unreadCount = (alerts ?? []).filter((a) => !a.is_read).length;

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[#1B3A6B]">목양 알림 센터</h1>
            <AlertBadge count={unreadCount} />
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/pastoral-alerts/settings">
              <Settings className="h-4 w-4 mr-2" />
              알림 설정
            </Link>
          </Button>
        </div>

        {/* 범례 */}
        <div className="flex gap-3 mb-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> 긴급
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> 결석 패턴
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> 기쁜 소식
          </span>
        </div>

        {/* 알림 목록 */}
        <AlertList alerts={alerts ?? []} />
      </div>
    </div>
  );
}
