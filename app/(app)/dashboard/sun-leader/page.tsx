import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import SunReportList from "@/components/dashboard/SunReportList";
import PastorMessageCard from "@/components/dashboard/PastorMessageCard";

export default async function SunLeaderDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("sunbogo_profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "sun_leader") redirect("/dashboard");

  // 최근 보고서 5개
  const { data: reports } = await supabase
    .from("sun_reports")
    .select("id, report_date, status, attend_total, submitted_at")
    .eq("created_by", user.id)
    .order("report_date", { ascending: false })
    .limit(5);

  const latestReport = reports?.[0];
  const hasThisWeek =
    latestReport &&
    latestReport.report_date >=
      new Date(
        Date.now() - 7 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split("T")[0];

  return (
    <div className="space-y-6">
      {/* 인사 & 현재 상태 */}
      <div>
        <h2 className="text-2xl font-bold text-primary">
          {profile.name} 순장님, 안녕하세요!
        </h2>
        <p className="text-base text-muted-foreground mt-1">
          {profile.sun_number}순 보고 현황
        </p>
      </div>

      {/* 이번 주 보고 상태 카드 */}
      <Card
        className={`border-2 ${hasThisWeek && latestReport?.status === "submitted" ? "border-green-500" : "border-amber-400"}`}
      >
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {hasThisWeek && latestReport?.status === "submitted" ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold text-green-700">이번 주 제출 완료!</p>
                  <p className="text-base text-muted-foreground">
                    참석인원 {latestReport?.attend_total}명
                  </p>
                </div>
              </>
            ) : (
              <>
                <Clock className="w-10 h-10 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold text-amber-700">
                    {hasThisWeek ? "임시저장 중" : "이번 주 보고서 미제출"}
                  </p>
                  <p className="text-base text-muted-foreground">
                    예배 후 순보고서를 작성해 주세요
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 보고서 작성 버튼 */}
      {(!hasThisWeek || latestReport?.status === "draft") && (
        <Button
          asChild
          size="lg"
          className="w-full h-16 text-lg font-semibold bg-primary hover:bg-primary/90"
        >
          <Link href={hasThisWeek && latestReport?.status === "draft" ? `/report/sun/${latestReport.id}` : "/report/sun/new"}>
            <PlusCircle className="w-5 h-5 mr-2" />
            {hasThisWeek && latestReport?.status === "draft"
              ? "작성 중인 보고서 이어서 작성"
              : "이번 주 순보고서 작성"}
          </Link>
        </Button>
      )}

      {/* 목사님 메시지 */}
      <PastorMessageCard userId={user.id} />

      {/* 지난 보고서 목록 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">최근 보고서</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/report/sun/history" className="text-xs text-muted-foreground">
                전체보기 <ChevronRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <SunReportList reports={reports ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
