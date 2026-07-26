import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
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

  if (!profile) redirect("/login");

  if (profile.role === "pastor") redirect("/dashboard/admin");
  if (profile.role === "mission_leader") redirect("/dashboard/mission-leader");
  redirect("/dashboard/sun-leader");
}
