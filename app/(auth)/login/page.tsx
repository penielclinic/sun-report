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
import { idToEmail, validateId } from "@/lib/utils/id-to-email";

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
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          계정이 없으신가요?{" "}
          <Link href="/register" className="text-primary font-medium">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
