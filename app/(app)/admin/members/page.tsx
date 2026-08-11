import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SUN_DIRECTORY } from "@/lib/constants/sun-directory";
import MembersManager from "./MembersManager";

export default async function MembersPage() {
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

  const totalMembers = SUN_DIRECTORY.reduce((acc, s) => acc + s.members.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary">순원 현황</h2>
        <p className="text-sm text-muted-foreground">
          전체 45순 · {totalMembers}명
        </p>
      </div>
      <MembersManager />
    </div>
  );
}
