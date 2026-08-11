"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { SUN_DIRECTORY } from "@/lib/constants/sun-directory";
import type { Role } from "@/types/database";

const MISSION_NAMES = ["1선교회","2선교회","3선교회","4선교회","5선교회","6선교회","7선교회","8선교회","9선교회","10선교회","11선교회","12선교회","브릿지선교회"];

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [sunNumber, setSunNumber] = useState("");
  const [missionId, setMissionId] = useState("");

  // 카카오 프로필에서 이름 가져오기
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      const kakaoName =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.preferred_username ||
        "";
      if (kakaoName) setName(kakaoName);
    });
  }, [router]);

  function handleSunSelect(val: string | null) {
    if (!val) return;
    setSunNumber(val);
    const entry = SUN_DIRECTORY.find((s) => s.sunNumber === parseInt(val));
    if (entry && !name) setName(entry.sunLeader);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) { toast.error("역할을 선택해주세요"); return; }
    if (role === "sun_leader" && !sunNumber) { toast.error("담당 순을 선택해주세요"); return; }
    if (role === "mission_leader" && !missionId) { toast.error("소속 선교회를 선택해주세요"); return; }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
      toast.error("등록 실패: " + (err as Error).message);
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
            <CardTitle className="text-lg text-center">역할 등록</CardTitle>
            <p className="text-xs text-center text-muted-foreground">
              처음 로그인하셨습니다. 역할을 등록해 주세요.<br />
              담임목사님 승인 후 앱을 이용하실 수 있습니다.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 역할 선택 */}
              <div className="space-y-2">
                <Label>역할</Label>
                <Select value={role} onValueChange={(v) => { setRole(v as Role); setSunNumber(""); setMissionId(""); }}>
                  <SelectTrigger className="h-12">
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
                  <Label>담당 순</Label>
                  <Select value={sunNumber} onValueChange={handleSunSelect}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="담당 순을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUN_DIRECTORY.map((s) => (
                        <SelectItem key={s.sunNumber} value={String(s.sunNumber)}>
                          {s.missionId === 13
                            ? `브릿지선교회 — ${s.sunLeader} (목자)`
                            : `${s.sunNumber}순 — ${s.sunLeader}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSun && (
                    <p className="text-xs text-muted-foreground">소속: {selectedSun.missionId}선교회</p>
                  )}
                </div>
              )}

              {/* 선교회장: 선교회 선택 */}
              {role === "mission_leader" && (
                <div className="space-y-2">
                  <Label>소속 선교회</Label>
                  <Select value={missionId} onValueChange={(v) => setMissionId(v ?? "")}>
                    <SelectTrigger className="h-12">
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

              {/* 이름 */}
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="실명을 입력하세요"
                  required
                  className="h-12 text-base"
                />
              </div>

              {/* 전화번호 */}
              <div className="space-y-2">
                <Label htmlFor="phone">
                  전화번호 <span className="text-xs text-muted-foreground">(카카오 알림톡 수신)</span>
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
                {loading ? "등록 중..." : "등록 신청"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
