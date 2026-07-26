import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SunReportForm from "@/components/forms/SunReportForm";
import { getThisSunday, formatDate } from "@/lib/utils/report-aggregator";

export default async function NewSunReportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("sunbogo_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "sun_leader") redirect("/dashboard");

  const thisSunday = formatDate(getThisSunday());

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary">순보고서 작성</h2>
      <SunReportForm
        profile={profile}
        userId={user.id}
        reportDate={thisSunday}
        reportId={null}
        initialData={null}
      />
    </div>
  );
}
