import { BookOpenCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompletionLine, type BibleCompletion } from "@/lib/utils/bible-completion";

// 성경통독·필사 완료자 보고 (선교회보고서·공개 통계 공용)
export default function BibleCompletionList({
  completions,
  title = "성경통독 · 필사 보고",
  emptyText = "이번 보고에 통독·필사 완료자가 없습니다.",
  showDate = false,
}: {
  completions: BibleCompletion[];
  title?: string;
  emptyText?: string;
  showDate?: boolean;
}) {
  const pilsa = completions.filter((c) => c.kind === "성경필사").length;
  const tongdok = completions.length - pilsa;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpenCheck className="w-4 h-4 text-[#C9A84C]" />
          {title}
        </CardTitle>
        {completions.length > 0 && (
          <p className="text-xs text-muted-foreground">
            성경필사 {pilsa}명 · 성경통독 {tongdok}명
          </p>
        )}
      </CardHeader>
      <CardContent>
        {completions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">{emptyText}</p>
        ) : (
          <ul className="space-y-2.5">
            {completions.map((c) => (
              <li key={`${c.kind}-${c.name}-${c.missionId}-${c.reportDate}`} className="leading-snug">
                <p
                  className={`text-sm font-semibold ${
                    c.kind === "성경필사" ? "text-[#B8933A]" : "text-primary"
                  }`}
                >
                  {c.kind}
                  {showDate && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {c.reportDate.slice(5).replace("-", "/")}
                    </span>
                  )}
                </p>
                <p className="text-base" style={{ wordBreak: "keep-all" }}>
                  {formatCompletionLine(c)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
