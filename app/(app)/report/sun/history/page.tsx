import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export default async function SunReportHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("sunbogo_profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "sun_leader") redirect("/dashboard");

  const { data: reports } = await supabase
    .from("sun_reports")
    .select("id, report_date, status, attend_total, bible_chapters, submitted_at")
    .eq("created_by", user.id)
    .order("report_date", { ascending: false });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary">지난 순보고서</h2>

      <Card>
        <CardContent className="p-0">
          {reports && reports.length > 0 ? (
            <ul className="divide-y">
              {reports.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/report/sun/${r.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(r.report_date), "yyyy년 M월 d일 (E)", {
                          locale: ko,
                        })}{" "}
                        주일
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        참석 {r.attend_total}명 · 성경 {r.bible_chapters}장
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          r.status === "submitted"
                            ? "bg-green-100 text-green-800 text-xs"
                            : "text-xs"
                        }
                      >
                        {r.status === "submitted" ? "제출완료" : "임시저장"}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-12">
              작성한 보고서가 없습니다
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
