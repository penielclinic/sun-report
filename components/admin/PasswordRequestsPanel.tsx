"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, KeyRound, Eye, EyeOff } from "lucide-react";
import type { PasswordResetRequest } from "@/types/database";

export default function PasswordRequestsPanel({ requests }: { requests: PasswordResetRequest[] }) {
  const router = useRouter();
  const [items, setItems] = useState(requests);
  const [processing, setProcessing] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  async function handleAction(requestId: string, action: "approve" | "reject") {
    setProcessing(requestId);
    try {
      const res = await fetch("/api/admin/password-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setItems((prev) => prev.filter((r) => r.id !== requestId));
      toast.success(action === "approve" ? "승인되었습니다" : "거절되었습니다");
      router.refresh();
    } catch (err) {
      toast.error("처리 실패: " + (err as Error).message);
    } finally {
      setProcessing(null);
    }
  }

  if (items.length === 0) return null;

  return (
    <Card className="border-[#C9A84C]/50 bg-[#C9A84C]/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#C9A84C]" />
          비밀번호 재설정 요청
          <Badge className="bg-[#C9A84C] text-white text-xs">{items.length}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          승인하면 아래 새 비밀번호로 즉시 로그인할 수 있게 됩니다
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((r) => (
          <div key={r.id} className="rounded-lg border bg-background px-3 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{r.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  새 비밀번호: {revealed[r.id] ? r.new_password : "••••"}
                </span>
                <button
                  type="button"
                  onClick={() => setRevealed((p) => ({ ...p, [r.id]: !p[r.id] }))}
                  className="text-muted-foreground hover:text-primary"
                >
                  {revealed[r.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 h-8 px-2.5"
                disabled={processing === r.id}
                onClick={() => handleAction(r.id, "approve")}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 승인
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 h-8 px-2.5"
                disabled={processing === r.id}
                onClick={() => handleAction(r.id, "reject")}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" /> 거절
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
