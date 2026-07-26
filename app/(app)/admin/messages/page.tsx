import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import MessageComposer from "@/components/admin/MessageComposer";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("sunbogo_profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.role !== "pastor") redirect("/dashboard");

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: recipients } = await admin
    .from("sunbogo_profiles")
    .select("id, name, role, sun_number, mission_id, phone")
    .in("role", ["sun_leader", "mission_leader"])
    .eq("status", "active")
    .order("role")
    .order("sun_number");

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-xl font-bold text-primary mb-6">메시지 발송</h1>
      <MessageComposer recipients={recipients ?? []} />
    </div>
  );
}
