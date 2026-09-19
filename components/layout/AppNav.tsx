"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, FileText, Bell, Send, BookOpen, HeartHandshake, HelpCircle } from "lucide-react";
import type { Profile } from "@/types/database";

const ROLE_LABEL: Record<string, string> = {
  sun_leader: "순장",
  mission_leader: "선교회장",
  pastor: "담임목사",
};

export default function AppNav({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("read", false);
    setUnreadCount(count ?? 0);
  }, []);

  useEffect(() => {
    fetchUnread();

    const supabase = createClient();
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => fetchUnread()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchUnread]);

  async function handleBellClick() {
    const supabase = createClient();
    const { data } = await supabase
      .from("notifications")
      .select("id")
      .eq("read", false);
    if (data && data.length > 0) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: data.map((n: { id: string }) => n.id) }),
      });
      setUnreadCount(0);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const dashboardHref =
    profile.role === "pastor"
      ? "/dashboard/admin"
      : profile.role === "mission_leader"
        ? "/dashboard/mission-leader"
        : "/dashboard/sun-leader";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground shadow-sm">
      <div className="container mx-auto max-w-2xl px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        {/* 로고 + 앱이름 — 메뉴 버튼이 많아도(담임목사) 줄어들거나 한 글자씩 줄바꿈되지 않게 고정 */}
        <Link href={dashboardHref} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Image src="/logo.png" alt="로고" width={30} height={30} />
          <span className="font-bold text-lg whitespace-nowrap">순보고</span>
        </Link>

        <div className="flex items-center gap-2 min-w-0">
          {/* 이름·역할 */}
          <span className="text-sm opacity-90 hidden sm:block">
            {profile.name}{" "}
            <span className="opacity-70">({ROLE_LABEL[profile.role]})</span>
          </span>

          <nav className="flex items-center gap-0.5 sm:gap-1">
            {/* 홈 */}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-primary-foreground hover:bg-primary-foreground/10 flex flex-col h-12 gap-0 px-1 sm:px-2"
            >
              <Link href={dashboardHref}>
                <LayoutDashboard className="w-5 h-5" />
                <span className="text-[10px] leading-tight">홈</span>
              </Link>
            </Button>

            {/* 순장: 보고서 작성 */}
            {profile.role === "sun_leader" && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-primary-foreground hover:bg-primary-foreground/10 flex flex-col h-12 gap-0 px-1 sm:px-2"
              >
                <Link href="/report/sun/new">
                  <FileText className="w-5 h-5" />
                  <span className="text-[10px] leading-tight">보고서</span>
                </Link>
              </Button>
            )}

            {/* 순장·선교회장: 사용설명서 */}
            {profile.role !== "pastor" && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-primary-foreground hover:bg-primary-foreground/10 flex flex-col h-12 gap-0 px-1 sm:px-2"
              >
                <Link href="/guide">
                  <HelpCircle className="w-5 h-5" />
                  <span className="text-[10px] leading-tight">설명서</span>
                </Link>
              </Button>
            )}

            {/* 담임목사: 메시지 발송 */}
            {profile.role === "pastor" && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-primary-foreground hover:bg-primary-foreground/10 flex flex-col h-12 gap-0 px-1 sm:px-2"
              >
                <Link href="/admin/messages">
                  <Send className="w-5 h-5" />
                  <span className="text-[10px] leading-tight">메시지</span>
                </Link>
              </Button>
            )}

            {/* 담임목사: 목회 브리핑 */}
            {profile.role === "pastor" && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-primary-foreground hover:bg-primary-foreground/10 flex flex-col h-12 gap-0 px-1 sm:px-2"
              >
                <Link href="/admin/pastoral-briefing">
                  <BookOpen className="w-5 h-5" />
                  <span className="text-[10px] leading-tight">브리핑</span>
                </Link>
              </Button>
            )}

            {/* 담임목사: 목양 알림 */}
            {profile.role === "pastor" && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-primary-foreground hover:bg-primary-foreground/10 flex flex-col h-12 gap-0 px-1 sm:px-2"
              >
                <Link href="/admin/pastoral-alerts">
                  <HeartHandshake className="w-5 h-5" />
                  <span className="text-[10px] leading-tight">목양알림</span>
                </Link>
              </Button>
            )}

            {/* 알림 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBellClick}
              className="relative text-primary-foreground hover:bg-primary-foreground/10 flex flex-col h-12 gap-0 px-1 sm:px-2"
            >
              <Bell className="w-5 h-5" />
              <span className="text-[10px] leading-tight">알림</span>
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            {/* 로그아웃 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-primary-foreground hover:bg-primary-foreground/10 flex flex-col h-12 gap-0 px-1 sm:px-2"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[10px] leading-tight">로그아웃</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}
