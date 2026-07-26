import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SpecialReportsManager from "./SpecialReportsManager";
import type { SpecialReportItem } from "@/types/database";

export default async function SpecialReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("sunbogo_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "pastor") redirect("/dashboard");

  const { data: items } = await supabase
    .from("special_report_items")
    .select("*")
    .order("report_date", { ascending: false })
    .order("mission_id");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-primary">특별보고 관리</h2>
        <p className="text-sm text-muted-foreground mt-1">
          선교회별 특별보고 항목을 확인하고 진행상황을 관리합니다
        </p>
      </div>
      <SpecialReportsManager items={(items ?? []) as SpecialReportItem[]} />
    </div>
  );
}
