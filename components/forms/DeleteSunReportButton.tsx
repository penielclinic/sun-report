"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DeleteSunReportButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("이 순보고서를 삭제하시겠습니까? 삭제 후 다시 작성해 제출할 수 있습니다.")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/reports/sun/${reportId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("순보고서가 삭제되었습니다. 다시 작성해 제출해주세요.");
      router.push("/dashboard/sun-leader");
      router.refresh();
    } catch (err) {
      toast.error("삭제 실패: " + (err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 text-destructive border-destructive/30 hover:bg-destructive/5"
      onClick={handleDelete}
      disabled={deleting}
    >
      <Trash2 className="w-4 h-4 mr-2" />
      {deleting ? "삭제 중..." : "이 보고서 삭제"}
    </Button>
  );
}
