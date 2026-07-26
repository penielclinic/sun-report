import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=oauth`);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("sunbogo_profiles")
        .select("status")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) return NextResponse.redirect(`${origin}/setup`);
      if (profile.status === "pending") return NextResponse.redirect(`${origin}/pending`);
      if (profile.status === "rejected") return NextResponse.redirect(`${origin}/login?error=rejected`);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
