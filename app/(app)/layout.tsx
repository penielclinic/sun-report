import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppNav from "@/components/layout/AppNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  if (!profile) redirect("/login");
  if (profile.status === "pending") redirect("/pending");
  if (profile.status === "rejected") redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <AppNav profile={profile} />
      <main className="flex-1 container mx-auto max-w-2xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
