"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Trash2, KeyRound, UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { SUN_DIRECTORY, getMissionName } from "@/lib/constants/sun-directory";
import type { Role, ProfileStatus } from "@/types/database";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  sun_number: number | null;
  mission_id: number | null;
  status: ProfileStatus;
  phone: string | null;
};

const ROLE_LABELS: Record<Role, string> = {
  sun_leader: "순장",
  mission_leader: "선교회장",
  pastor: "담임목사",
};
const STATUS_STYLES: Record<ProfileStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  active: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};
const STATUS_LABELS: Record<ProfileStatus, string> = {
  pending: "승인 대기",
  active: "활성",
  rejected: "거절됨",
};
const MISSION_NAMES = [...Array.from({ length: 12 }, (_, i) => `${i + 1}선교회`), "브릿지선교회"];

interface Props {
  users: UserRow[];
}

export default function UsersManager({ users: initialUsers }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newPw, setNewPw] = useState<Record<string, string>>({});
  const [editPhone, setEditPhone] = useState<Record<string, string>>({});
  const [filterStatus, setFilterStatus] = useState<ProfileStatus | "전체">("전체");

  // 신규 가입 폼
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "" as Role | "",
    sun_number: "", mission_id: "",
  });

  const filtered = users.filter((u) =>
    filterStatus === "전체" || u.status === filterStatus
  );

  const pendingCount = users.filter((u) => u.status === "pending").length;

  async function updateUser(userId: string, updates: Partial<UserRow>) {
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, updates }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error); return false; }
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...updates } : u));
    return true;
  }

  async function handleApprove(userId: string) {
    if (await updateUser(userId, { status: "active" })) toast.success("승인되었습니다");
  }

  async function handleReject(userId: string) {
    if (await updateUser(userId, { status: "rejected" })) toast.success("거절되었습니다");
  }

  async function handleDelete(userId: string, name: string) {
    if (!confirm(`${name} 계정을 삭제하시겠습니까?`)) return;
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error); return; }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    toast.success("삭제되었습니다");
  }

  async function handleResetPassword(userId: string) {
    const pw = newPw[userId];
    if (!pw || pw.length < 6) { toast.error("6자리 이상 입력해주세요"); return; }
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, password: pw }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error); return; }
    setNewPw((prev) => ({ ...prev, [userId]: "" }));
    toast.success("비밀번호가 변경되었습니다");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          sun_number: form.sun_number ? parseInt(form.sun_number) : undefined,
          mission_id: form.mission_id ? parseInt(form.mission_id) : undefined,
          auto_approve: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("계정이 생성되었습니다");
      setShowCreate(false);
      setForm({ name: "", email: "", password: "", role: "", sun_number: "", mission_id: "" });
      router.refresh();
    } catch (err) {
      toast.error("생성 실패: " + (err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  function handleSunSelect(val: string | null) {
    const entry = val ? SUN_DIRECTORY.find((s) => s.sunNumber === parseInt(val)) : undefined;
    setForm((f) => ({ ...f, sun_number: val ?? "", name: f.name || entry?.sunLeader || "" }));
  }

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="flex gap-3">
        {(["전체", "pending", "active", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              filterStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {s === "전체" ? `전체 ${users.length}` :
             s === "pending" ? `승인 대기 ${pendingCount}` :
             s === "active" ? `활성 ${users.filter(u=>u.status==="active").length}` :
             `거절 ${users.filter(u=>u.status==="rejected").length}`}
          </button>
        ))}
      </div>

      {/* 신규 계정 생성 */}
      <Card>
        <CardHeader className="pb-2">
          <button
            type="button"
            className="flex items-center justify-between w-full"
            onClick={() => setShowCreate((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">새 계정 직접 생성</CardTitle>
            </div>
            {showCreate ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </CardHeader>
        {showCreate && (
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1">
                <Label>역할</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as Role, sun_number: "", mission_id: "" }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="역할 선택" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sun_leader">순장</SelectItem>
                    <SelectItem value="mission_leader">선교회장</SelectItem>
                    <SelectItem value="pastor">담임목사</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role === "sun_leader" && (
                <div className="space-y-1">
                  <Label>담당 순</Label>
                  <Select value={form.sun_number} onValueChange={handleSunSelect}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="순 선택" /></SelectTrigger>
                    <SelectContent>
                      {SUN_DIRECTORY.map((s) => (
                        <SelectItem key={s.sunNumber} value={String(s.sunNumber)}>
                          {s.sunNumber}순 — {s.sunLeader}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.role === "mission_leader" && (
                <div className="space-y-1">
                  <Label>소속 선교회</Label>
                  <Select value={form.mission_id} onValueChange={(v) => setForm((f) => ({ ...f, mission_id: v ?? "" }))}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="선교회 선택" /></SelectTrigger>
                    <SelectContent>
                      {MISSION_NAMES.map((m, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>이름</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="이름" required className="h-10" />
                </div>
                <div className="space-y-1">
                  <Label>비밀번호</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="6자리 이상" minLength={6} required className="h-10" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>이메일</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="이메일" required className="h-10" />
              </div>
              <Button type="submit" size="sm" disabled={creating} className="w-full">
                {creating ? "생성 중..." : "계정 생성"}
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      {/* 사용자 목록 */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground">해당 사용자 없음</p>
          )}
          {filtered.map((u) => (
            <div key={u.id} className="border-b last:border-0">
              <button
                type="button"
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-muted/30 text-left gap-3"
                onClick={() => setExpandedId(expandedId === u.id ? null : u.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{u.name}</span>
                    <Badge variant="secondary" className="text-xs">{ROLE_LABELS[u.role]}</Badge>
                    <Badge className={`${STATUS_STYLES[u.status]} text-xs`}>{STATUS_LABELS[u.status]}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {u.email}
                    {u.role === "sun_leader" && u.sun_number && ` · ${u.sun_number}순`}
                    {u.role === "mission_leader" && u.mission_id && ` · ${getMissionName(u.mission_id)}`}
                    {u.phone && ` · ${u.phone}`}
                  </p>
                </div>
                {expandedId === u.id ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </button>

              {expandedId === u.id && (
                <div className="px-6 pb-4 space-y-3 bg-muted/10">
                  {/* 승인/거절 버튼 (pending만) */}
                  {u.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleApprove(u.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-1" /> 승인
                      </Button>
                      <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleReject(u.id)}>
                        <XCircle className="w-4 h-4 mr-1" /> 거절
                      </Button>
                    </div>
                  )}

                  {/* 활성→거절, 거절→승인 */}
                  {u.status === "active" && (
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => handleReject(u.id)}>
                      <XCircle className="w-4 h-4 mr-1" /> 계정 비활성화
                    </Button>
                  )}
                  {u.status === "rejected" && (
                    <Button size="sm" variant="outline" className="text-green-600 border-green-600/30" onClick={() => handleApprove(u.id)}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> 재승인
                    </Button>
                  )}

                  <Separator />

                  {/* 전화번호 수정 */}
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      placeholder="전화번호 (010-0000-0000)"
                      value={editPhone[u.id] ?? u.phone ?? ""}
                      onChange={(e) => setEditPhone((prev) => ({ ...prev, [u.id]: e.target.value }))}
                      className="h-9 text-sm flex-1"
                      inputMode="numeric"
                    />
                    <Button size="sm" variant="outline" onClick={async () => {
                      const phone = (editPhone[u.id] ?? "").replace(/[^0-9]/g, "");
                      if (await updateUser(u.id, { phone } as Partial<UserRow>)) {
                        toast.success("전화번호가 저장되었습니다");
                      }
                    }}>
                      저장
                    </Button>
                  </div>

                  {/* 비밀번호 초기화 */}
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="새 비밀번호 (6자리 이상)"
                      value={newPw[u.id] ?? ""}
                      onChange={(e) => setNewPw((prev) => ({ ...prev, [u.id]: e.target.value }))}
                      className="h-9 text-sm flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={() => handleResetPassword(u.id)}>
                      <KeyRound className="w-4 h-4 mr-1" /> 변경
                    </Button>
                  </div>

                  {/* 삭제 */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive/80 w-full"
                    onClick={() => handleDelete(u.id, u.name)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> 계정 삭제
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
