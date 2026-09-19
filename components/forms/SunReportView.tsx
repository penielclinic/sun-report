"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { SunReport, SunReportMember, Profile } from "@/types/database";

const CHECK_LABELS: { key: keyof SunReportMember; label: string }[] = [
  { key: "attend_samil", label: "삼일" },
  { key: "attend_friday", label: "금요" },
  { key: "attend_sun_day", label: "주일낮" },
  { key: "attend_sun_eve", label: "주일밤" },
  { key: "attend_sun", label: "순모임" },
  { key: "evangelism", label: "전도" },
  { key: "bulletin_recv", label: "주보전달" },
  { key: "bible_tongdok", label: "통독" },
  { key: "bible_pilsa", label: "필사" },
];

const ATTEND_SUMMARY: { key: keyof SunReportMember; label: string }[] = [
  { key: "attend_samil",   label: "삼일"   },
  { key: "attend_friday",  label: "금요"   },
  { key: "attend_sun_day", label: "주낮"   },
  { key: "attend_sun_eve", label: "주밤"   },
  { key: "attend_sun",     label: "순모임" },
  { key: "evangelism",     label: "전도"   },
];

export default function SunReportView({
  report,
  members,
  profile,
}: {
  report: SunReport;
  members: SunReportMember[];
  profile: Profile;
}) {
  const router = useRouter();

  // 항목별 참석 집계
  const attendCounts = ATTEND_SUMMARY.map(({ key }) =>
    members.filter((m) => m[key] === true).length
  );

  // 주일낮예배 참석자를 위쪽에, 비참석자를 아래쪽에 표시
  const sortedMembers = [...members].sort((a, b) => {
    const aAttended = a.attend_sun_day ? 0 : 1;
    const bAttended = b.attend_sun_day ? 0 : 1;
    return aAttended - bAttended;
  });

  const backHref =
    profile.role === "pastor"
      ? "/dashboard/admin"
      : profile.role === "mission_leader"
        ? "/dashboard/mission-leader"
        : "/dashboard/sun-leader";

  return (
    <div className="space-y-4 pb-8">
      <Button variant="ghost" size="sm" className="px-0 -ml-1 text-muted-foreground" onClick={() => router.push(backHref)}>
        <ChevronLeft className="w-4 h-4 mr-1" />
        뒤로가기
      </Button>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(report.report_date), "yyyy년 M월 d일 (E) 주일", {
              locale: ko,
            })}
          </p>
          <p className="font-medium">
            {report.sun_number}순 — {report.sun_leader} 순장
          </p>
        </div>
        <Badge
          variant={report.status === "submitted" ? "default" : "secondary"}
          className={
            report.status === "submitted" ? "bg-green-100 text-green-800" : ""
          }
        >
          {report.status === "submitted" ? "제출완료" : "임시저장"}
        </Badge>
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">예배 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {report.worship_at && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-20">예배 일시</span>
              <span>{report.worship_at}</span>
            </div>
          )}
          {report.worship_place && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-20">예배 장소</span>
              <span>{report.worship_place}</span>
            </div>
          )}
          {report.worship_leader && (
            <div className="flex gap-2">
              <span className="text-muted-foreground w-20">인도자</span>
              <span>{report.worship_leader}</span>
            </div>
          )}
          {/* 항목별 참석 집계 */}
          <div className="pt-1">
            <p className="text-xs text-muted-foreground mb-2">항목별 참석 현황</p>
            <div className="grid grid-cols-3 gap-1.5">
              {ATTEND_SUMMARY.map(({ label }, i) => (
                <div
                  key={label}
                  className="text-center rounded-lg border bg-muted/30 py-2 px-1"
                >
                  <p className="text-lg font-bold text-primary leading-tight">
                    {attendCounts[i]}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
              <span>주일낮 참석 <strong className="text-primary">{report.attend_total}명</strong></span>
              <span>성경 <strong className="text-primary">{report.bible_chapters}장</strong></span>
              <span>헌금 <strong className="text-primary">{(report.offering ?? 0).toLocaleString()}원</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 순원 현황 */}
      {members.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">순원 출석 현황</CardTitle>
            <p className="text-xs text-muted-foreground">주일낮예배 참석자가 위쪽에 표시됩니다</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2 font-medium">성명</th>
                    {CHECK_LABELS.map(({ label }) => (
                      <th key={label} className="px-2 py-2 font-medium text-center">
                        {label}
                      </th>
                    ))}
                    <th className="px-2 py-2 font-medium text-center">성경</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMembers.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{m.member_name}</td>
                      {CHECK_LABELS.map(({ key }) => (
                        <td key={key} className="px-2 py-2 text-center">
                          {m[key] ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-200 mx-auto" />
                          )}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center">{m.bible_read || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 특별보고사항 */}
      {report.special_note && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">특별보고사항</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{report.special_note}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
