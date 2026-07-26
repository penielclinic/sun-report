import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SUN_DIRECTORY } from "@/lib/constants/sun-directory";
import { getThisSunday, formatDate } from "@/lib/utils/report-aggregator";
import { WeeklyReportExporter, type SunRow } from "@/components/admin/WeeklyReportExporter";
import { DateSelector } from "@/components/admin/DateSelector";
import { AdminPdfDownload } from "@/components/admin/AdminPdfDownload";

export default async function WeeklyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
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
  if (!profile || profile.role !== "pastor") redirect("/dashboard");

  const reportDate = date ?? formatDate(getThisSunday());

  const { data: sunReports } = await supabase
    .from("sun_reports")
    .select("sun_number, attend_total, bible_chapters, worship_place, worship_leader, status")
    .eq("report_date", reportDate);

  const reportMap = new Map(sunReports?.map((r) => [r.sun_number, r]) ?? []);

  // 44순 전체 데이터 (미제출이면 blank)
  const rows: SunRow[] = SUN_DIRECTORY.map((entry) => {
    const r = reportMap.get(entry.sunNumber);
    return {
      sunNumber: entry.sunNumber,
      missionId: entry.missionId,
      sunLeader: entry.sunLeader,
      worshipPlace: r?.worship_place ?? "",
      worshipLeader: r?.worship_leader ?? "",
      attendTotal: r?.attend_total ?? null,
      bibleChapters: r?.bible_chapters ?? null,
      submitted: r?.status === "submitted",
    };
  });

  const submittedCount = rows.filter((r) => r.submitted).length;
  const leftRows = rows.slice(0, 22);
  const rightRows = rows.slice(22, 44);

  // 선교회 rowspan 계산
  function rowspans(r: SunRow[]) {
    const spans = new Array(r.length).fill(0);
    let i = 0;
    while (i < r.length) {
      const mid = r[i].missionId;
      let j = i;
      while (j < r.length && r[j].missionId === mid) j++;
      spans[i] = j - i;
      i = j;
    }
    return spans;
  }

  const lSpans = rowspans(leftRows);
  const rSpans = rowspans(rightRows);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-primary">선교회별 예배 보고 현황</h2>
          <Badge variant="outline" className="mt-1">{submittedCount}/44 제출</Badge>
        </div>
        <AdminPdfDownload />
      </div>

      {/* 날짜 선택 */}
      <DateSelector currentDate={reportDate} />

      {/* 다운로드 버튼 */}
      <WeeklyReportExporter rows={rows} reportDate={reportDate} />

      {/* 미리보기 테이블 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{reportDate} 주일 보고 현황</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#1B3A6B] text-white">
                <th className="border border-blue-900 px-2 py-1.5">선교회</th>
                <th className="border border-blue-900 px-2 py-1.5">순</th>
                <th className="border border-blue-900 px-2 py-1.5">순장</th>
                <th className="border border-blue-900 px-2 py-1.5">장소</th>
                <th className="border border-blue-900 px-2 py-1.5">인도</th>
                <th className="border border-blue-900 px-2 py-1.5">인원</th>
                <th className="border border-blue-900 px-2 py-1.5">성경</th>
                <th className="border-none w-2 bg-white"></th>
                <th className="border border-blue-900 px-2 py-1.5">선교회</th>
                <th className="border border-blue-900 px-2 py-1.5">순</th>
                <th className="border border-blue-900 px-2 py-1.5">순장</th>
                <th className="border border-blue-900 px-2 py-1.5">장소</th>
                <th className="border border-blue-900 px-2 py-1.5">인도</th>
                <th className="border border-blue-900 px-2 py-1.5">인원</th>
                <th className="border border-blue-900 px-2 py-1.5">성경</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(leftRows.length, rightRows.length) }, (_, i) => {
                const L = leftRows[i];
                const R = rightRows[i];
                return (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                    {/* 좌측 */}
                    {L && lSpans[i] > 0 && (
                      <td
                        rowSpan={lSpans[i]}
                        className="border border-gray-300 text-center font-bold bg-blue-50 px-1 py-1"
                      >
                        {L.missionId}
                      </td>
                    )}
                    {L ? (
                      <>
                        <td className="border border-gray-300 text-center px-1 py-1">{L.sunNumber}</td>
                        <td className="border border-gray-300 px-2 py-1">{L.sunLeader}</td>
                        <td className="border border-gray-300 px-2 py-1 text-muted-foreground">
                          {L.submitted ? L.worshipPlace : ""}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-muted-foreground">
                          {L.submitted ? L.worshipLeader : ""}
                        </td>
                        <td className={`border border-gray-300 text-center px-1 py-1 ${!L.submitted ? "text-gray-300" : ""}`}>
                          {L.submitted ? (L.attendTotal ?? "") : "−"}
                        </td>
                        <td className={`border border-gray-300 text-center px-1 py-1 font-medium ${!L.submitted ? "text-gray-300" : "text-green-700"}`}>
                          {L.submitted ? (L.bibleChapters ?? "") : "−"}
                        </td>
                      </>
                    ) : <td colSpan={6}></td>}

                    {/* 구분 */}
                    <td className="w-2 bg-white border-none"></td>

                    {/* 우측 */}
                    {R && rSpans[i] > 0 && (
                      <td
                        rowSpan={rSpans[i]}
                        className="border border-gray-300 text-center font-bold bg-blue-50 px-1 py-1"
                      >
                        {R.missionId}
                      </td>
                    )}
                    {R ? (
                      <>
                        <td className="border border-gray-300 text-center px-1 py-1">{R.sunNumber}</td>
                        <td className="border border-gray-300 px-2 py-1">{R.sunLeader}</td>
                        <td className="border border-gray-300 px-2 py-1 text-muted-foreground">
                          {R.submitted ? R.worshipPlace : ""}
                        </td>
                        <td className="border border-gray-300 px-2 py-1 text-muted-foreground">
                          {R.submitted ? R.worshipLeader : ""}
                        </td>
                        <td className={`border border-gray-300 text-center px-1 py-1 ${!R.submitted ? "text-gray-300" : ""}`}>
                          {R.submitted ? (R.attendTotal ?? "") : "−"}
                        </td>
                        <td className={`border border-gray-300 text-center px-1 py-1 font-medium ${!R.submitted ? "text-gray-300" : "text-green-700"}`}>
                          {R.submitted ? (R.bibleChapters ?? "") : "−"}
                        </td>
                      </>
                    ) : <td colSpan={6}></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
