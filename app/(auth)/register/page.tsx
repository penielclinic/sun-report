"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import { toast } from "sonner";
import { SUN_DIRECTORY } from "@/lib/constants/sun-directory";
import type { Role } from "@/types/database";
import { idToEmail, validateId } from "@/lib/utils/id-to-email";

const MISSION_NAMES = ["1선교회", "2선교회", "3선교회", "4선교회", "5선교회", "6선교회", "7선교회", "8선교회", "9선교회", "10선교회", "11선교회", "12선교회"];

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [sunNumber, setSunNumber] = useState<string>("");
  const [missionId, setMissionId] = useState<string>("");

  // 순장 선택 시 이름 자동 입력
  function handleSunSelect(val: string | null) {
    setSunNumber(val ?? "");
    const entry = val ? SUN_DIRECTORY.find((s) => s.sunNumber === parseInt(val)) : undefined;
    if (entry && !name) setName(entry.sunLeader);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) { toast.error("역할을 선택해주세요"); return; }

    const idError = validateId(name);
    if (idError) { toast.error(idError); return; }

    if (!/^\d{4,}$/.test(password)) {
      toast.error("비밀번호는 숫자 4자리 이상이어야 합니다");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: idToEmail(name),
          password,
          name,
          phone: phone.replace(/[^0-9]/g, ""),
          role,
          sun_number: role === "sun_leader" ? parseInt(sunNumber) : undefined,
          mission_id: role === "mission_leader" ? parseInt(missionId) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push("/pending");
    } catch (err) {
      toast.error("가입 실패: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const selectedSun = SUN_DIRECTORY.find((s) => s.sunNumber === parseInt(sunNumber));

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-4">
            <Image src="/logo.png" alt="해운대순복음교회 로고" width={80} height={80} priority />
          </div>
          <h1 className="text-2xl font-bold text-primary">순보고</h1>
          <p className="text-sm text-muted-foreground mt-1">해운대순복음교회</p>
        </div>

        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center">회원가입</CardTitle>
            <p className="text-xs text-center text-muted-foreground">
              가입 후 담임목사님 승인이 필요합니다
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* 역할 선택 */}
              <div className="space-y-2">
                <Label className="text-base font-medium">역할</Label>
                <Select value={role} onValueChange={(v) => { setRole(v as Role); setSunNumber(""); setMissionId(""); }}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="역할을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sun_leader">순장</SelectItem>
                    <SelectItem value="mission_leader">선교회장</SelectItem>
                    <SelectItem value="pastor">담임목사</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 순장: 순 선택 */}
              {role === "sun_leader" && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">담당 순</Label>
                  <Select value={sunNumber} onValueChange={handleSunSelect}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="담당 순을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUN_DIRECTORY.map((s) => (
                        <SelectItem key={s.sunNumber} value={String(s.sunNumber)}>
                          {s.sunNumber}순 — {s.sunLeader}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSun && (
                    <p className="text-xs text-muted-foreground">
                      소속: {selectedSun.missionId}선교회
                    </p>
                  )}
                </div>
              )}

              {/* 선교회장: 선교회 선택 */}
              {role === "mission_leader" && (
                <div className="space-y-2">
                  <Label className="text-base font-medium">소속 선교회</Label>
                  <Select value={missionId} onValueChange={(v) => setMissionId(v ?? "")}>
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="선교회를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {MISSION_NAMES.map((m, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 이름 (아이디로 사용) */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-medium">이름 (아이디)</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="실명을 입력하세요"
                  required
                  autoComplete="username"
                  className="h-12 text-base"
                />
                <p className="text-xs text-muted-foreground">
                  이름이 로그인 아이디로 사용됩니다
                </p>
              </div>

              {/* 비밀번호 */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-medium">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="숫자 4자리 이상"
                  required
                  minLength={4}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="h-12 text-base"
                />
                <p className="text-xs text-muted-foreground">
                  숫자만 입력, 4자리 이상
                </p>
              </div>

              {/* 전화번호 */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base font-medium">
                  전화번호 <span className="text-xs text-muted-foreground font-normal">(선택)</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-0000-0000"
                  inputMode="numeric"
                  className="h-12 text-base"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
                disabled={loading}
              >
                {loading ? "가입 중..." : "회원가입 신청"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-primary font-medium">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
