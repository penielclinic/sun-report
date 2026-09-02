"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import type { SunReportComment, Role } from "@/types/database";

const ROLE_LABEL: Record<Role, string> = {
  sun_leader: "순장",
  mission_leader: "선교회장",
  pastor: "담임목사",
};

const ROLE_BADGE_CLASS: Record<Role, string> = {
  pastor: "bg-primary text-primary-foreground",
  mission_leader: "bg-[#C9A84C]/20 text-[#8a6d1f]",
  sun_leader: "bg-muted text-muted-foreground",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SunReportComments({
  reportId,
  initialComments,
  currentUserId,
  canComment,
}: {
  reportId: string;
  initialComments: SunReportComment[];
  currentUserId: string;
  canComment: boolean;
}) {
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/reports/sun/${reportId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setComments((prev) => [...prev, json.comment]);
      setContent("");
      toast.success("답글이 등록되었습니다");
      router.refresh();
    } catch (err) {
      toast.error("등록 실패: " + (err as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(commentId: string) {
    try {
      const res = await fetch(`/api/reports/sun/${reportId}/comments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      router.refresh();
    } catch (err) {
      toast.error("삭제 실패: " + (err as Error).message);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          답글{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({comments.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            아직 답글이 없습니다
          </p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg border bg-muted/30 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge className={`text-[10px] px-1.5 py-0 ${ROLE_BADGE_CLASS[c.author_role]}`}>
                      {ROLE_LABEL[c.author_role] ?? c.author_role}
                    </Badge>
                    <span className="text-sm font-medium">{c.author_name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatTime(c.created_at)}
                    </span>
                  </div>
                  {c.author_id === currentUserId && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      className="text-muted-foreground hover:text-destructive flex-shrink-0"
                      aria-label="답글 삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-sm mt-1.5 whitespace-pre-wrap break-words">{c.content}</p>
              </li>
            ))}
          </ul>
        )}

        {canComment && (
          <div className="flex gap-2 pt-1">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="답글을 입력하세요"
              rows={2}
              className="resize-none text-sm flex-1"
            />
            <Button
              type="button"
              size="icon"
              className="h-auto shrink-0"
              onClick={handleSend}
              disabled={sending || !content.trim()}
              aria-label="답글 등록"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
