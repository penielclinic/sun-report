"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { BarChart3, BookOpen } from "lucide-react";
import { idToEmail, validateId } from "@/lib/utils/id-to-email";
import UpdateNotice from "@/components/UpdateNotice";

const SAVED_ID_KEY = "sunbogo_saved_id";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_ID_KEY);
    if (saved) {
      setLoginId(saved);
      setRememberLogin(true);
    }
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const idError = validateId(loginId);
    if (idError) {
      toast.error(idError);
      return;
    }

    setLoading(true);

    if (rememberLogin) {
      localStorage.setItem(SAVED_ID_KEY, loginId);
    } else {
      localStorage.removeItem(SAVED_ID_KEY);
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: idToEmail(loginId),
      password,
    });

    if (error) {
      toast.error("로그인 실패: 아이디 또는 비밀번호를 확인해주세요");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* 교회 로고 영역 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image src="/logo.png" alt="해운대순복음교회 로고" width={80} height={80} priority />
          </div>
          <h1 className="text-2xl font-bold text-primary">순보고</h1>
          <p className="text-sm text-muted-foreground mt-1">해운대순복음교회</p>
        </div>

        {/* 새 기능 공지 — 반짝이는 필독 알림 */}
        <UpdateNotice />

        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center">로그인</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginId" className="text-base font-medium">이름 (아이디)</Label>
                <Input
                  id="loginId"
                  type="text"
                  placeholder="이름을 입력하세요"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                  autoComplete="username"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-medium">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="숫자 4자리 이상"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="h-12 text-base"
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberLogin}
                  onCheckedChange={(v) => setRememberLogin(!!v)}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  아이디 기억하기
                </Label>
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? "로그인 중..." : "로그인"}
              </Button>
              <p className="text-center">
                <Link href="/forgot-password" className="text-sm text-muted-foreground underline underline-offset-2">
                  비밀번호를 잊으셨나요?
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          계정이 없으신가요?{" "}
          <Link href="/register" className="text-primary font-medium">
            회원가입
          </Link>
        </p>

        {/* 사용설명서 — 크게, 눈에 잘 띄게 */}
        <Link href="/guide" className="block mt-4">
          <div className="relative overflow-hidden rounded-2xl p-5 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-[#C9A84C] to-[#B8933A]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-lg leading-tight">
                  📖 사용설명서 보기
                </p>
                <p className="text-white/90 text-sm mt-1 leading-snug" style={{ wordBreak: "keep-all" }}>
                  회원가입·로그인·비밀번호 안내, 순보고 작성법까지 처음이신 분은 꼭 확인해주세요
                </p>
              </div>
            </div>
          </div>
        </Link>

        {/* 공개 통계 — 로그인 없이 누구나 열람 가능 */}
        <Link href="/public-stats" className="block mt-6">
          <div className="relative overflow-hidden rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-[#1B3A6B] via-[#3A5A9B] to-[#C9A84C]">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-base leading-tight">
                  📊 전체 통계 현황 보기
                </p>
                <p className="text-white/85 text-xs mt-0.5">
                  출석 · 성경읽기 · 전도 현황 — 로그인 없이 누구나 볼 수 있어요
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
