"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!/^\d{6,}$/.test(newPassword)) {
      toast.error("새 비밀번호는 숫자 6자리 이상이어야 합니다");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("비밀번호가 서로 일치하지 않습니다");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, newPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDone(true);
    } catch (err) {
      toast.error("요청 실패: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <Image src="/logo.png" alt="해운대순복음교회 로고" width={80} height={80} priority />
          </div>
          <h1 className="text-2xl font-bold text-primary">순보고</h1>
          <p className="text-sm text-muted-foreground mt-1">해운대순복음교회</p>
        </div>

        {done ? (
          <Card className="shadow-md">
            <CardContent className="pt-8 pb-8 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
              <p className="text-lg font-bold text-primary">요청이 접수되었습니다</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                담임목사님이 승인하시면 방금 설정하신 새 비밀번호로<br />
                로그인하실 수 있습니다. 승인 전까지는 기존 비밀번호가
                그대로 유지됩니다.
              </p>
              <Button asChild className="w-full h-11 mt-2">
                <Link href="/login">로그인 화면으로</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-center flex items-center justify-center gap-2">
                  <KeyRound className="w-5 h-5 text-[#C9A84C]" />
                  비밀번호 찾기
                </CardTitle>
                <p className="text-xs text-center text-muted-foreground">
                  새 비밀번호를 설정하면, 담임목사님 승인 후 바로 사용하실 수 있습니다
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-base font-medium">이름 (아이디)</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="가입하신 이름을 입력하세요"
                      required
                      autoComplete="username"
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-base font-medium">새 비밀번호</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="숫자 6자리 이상"
                      required
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-base font-medium">새 비밀번호 확인</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="다시 한 번 입력하세요"
                      required
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className="h-12 text-base"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
                    disabled={loading}
                  >
                    {loading ? "요청 중..." : "새 비밀번호 요청"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <p className="text-center text-sm text-muted-foreground mt-4">
              비밀번호가 기억나셨나요?{" "}
              <Link href="/login" className="text-primary font-medium">
                로그인
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
