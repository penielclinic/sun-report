import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SUN_DIRECTORY } from "@/lib/constants/sun-directory";

export default async function SettingsPage() {
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

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary">편성표 관리</h2>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">순 편성표</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium">순</th>
                  <th className="text-left px-4 py-2 font-medium">순장</th>
                  <th className="text-left px-4 py-2 font-medium">선교회</th>
                </tr>
              </thead>
              <tbody>
                {SUN_DIRECTORY.map((entry) => (
                  <tr key={entry.sunNumber} className="border-b last:border-0">
                    <td className="px-4 py-2">{entry.sunNumber}순</td>
                    <td className="px-4 py-2">{entry.sunLeader}</td>
                    <td className="px-4 py-2">선교회 {entry.missionId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
