import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BriefingHistory } from "@/components/briefing/BriefingHistory";
import { GenerateBriefingButton } from "./GenerateBriefingButton";

export default async function PastoralBriefingPage() {
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

  // 최근 12주 브리핑 조회
  const { data: briefings } = await supabase
    .from("pastoral_briefings")
    .select(
      "id, week_of, briefing_text, briefing_summary, generated_at, alimtalk_sent_at, read_at, care_members, joy_news"
    )
    .order("week_of", { ascending: false })
    .limit(12);

  return (
    <div className="min-h-screen bg-[#FAFAF7]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1B3A6B]">목회 브리핑</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              AI가 분석한 주간 순보고 요약
            </p>
          </div>
          <GenerateBriefingButton />
        </div>

        {/* 브리핑 히스토리 */}
        <BriefingHistory briefings={briefings ?? []} />
      </div>
    </div>
  );
}
