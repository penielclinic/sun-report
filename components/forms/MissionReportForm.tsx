"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Send, ChevronLeft, ChevronDown, ChevronUp, PlusCircle, Trash2 } from "lucide-react";
import { MissionReportPrintPanel } from "@/components/forms/MissionReportPrintPanel";
import MissionReportComments from "@/components/forms/MissionReportComments";
import type {
  Profile,
  MissionReport,
  SunReportWithMembers,
  SpecialReportItem,
  SpecialCategory,
  MissionReportComment,
} from "@/types/database";
import { SPECIAL_CATEGORIES } from "@/types/database";

interface Props {
  profile: Profile;
  reportDate: string;
  reportId: string | null;
  initialData: MissionReport | null;
  aggregated: {
    total_sun: number;
    total_attend: number;
    total_bible: number;
    total_offering: number;
  };
  sunReports: SunReportWithMembers[];
  initialSpecialItems?: SpecialReportItem[];
  readonly?: boolean;
  comments?: MissionReportComment[];
  currentUserId?: string;
  canComment?: boolean;
}

type SpecialItemDraft = {
  category: SpecialCategory;
  content: string;
};

export default function MissionReportForm({
  profile,
  reportDate,
  reportId,
  initialData,
  aggregated,
  sunReports,
  initialSpecialItems = [],
  readonly = false,
  comments = [],
  currentUserId,
  canComment = false,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expandedSun, setExpandedSun] = useState<string | null>(null);

  const [totalOffering, setTotalOffering] = useState(
    initialData?.total_offering
      ? initialData.total_offering.toString()
      : aggregated.total_offering
        ? aggregated.total_offering.toString()
        : ""
  );

  const [specialItems, setSpecialItems] = useState<SpecialItemDraft[]>(
    initialSpecialItems.map((i) => ({ category: i.category, content: i.content }))
  );

  function addSpecialItem() {
    setSpecialItems((prev) => [...prev, { category: "기타", content: "" }]);
  }

  function removeSpecialItem(idx: number) {
    setSpecialItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSpecialItem(idx: number, key: keyof SpecialItemDraft, value: string) {
    setSpecialItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  }

  async function saveReport(status: "draft" | "submitted") {
    const supabase = createClient();
    if (status === "draft") setSaving(true);
    else setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const payload = {
        mission_id: profile.mission_id!,
        report_date: reportDate,
        mission_leader: profile.name,
        total_sun: aggregated.total_sun,
        total_attend: aggregated.total_attend,
        total_bible: aggregated.total_bible,
        total_offering: parseInt(totalOffering) || 0,
        special_note: null,
        status,
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
        created_by: user.id,
      };

      let currentReportId = reportId;

      if (reportId) {
        const { error } = await supabase
          .from("sunbogo_mission_reports")
          .update(payload)
          .eq("id", reportId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("sunbogo_mission_reports")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        currentReportId = data.id;
        router.replace(`/report/mission/${currentReportId}`);
      }

      // 특별보고 항목 저장 (기존 삭제 후 재삽입)
      if (currentReportId) {
        await supabase
          .from("special_report_items")
          .delete()
          .eq("mission_report_id", currentReportId);

        const validItems = specialItems.filter((i) => i.content.trim());
        if (validItems.length > 0) {
          const { error } = await supabase.from("special_report_items").insert(
            validItems.map((i) => ({
              mission_report_id: currentReportId,
              mission_id: profile.mission_id!,
              report_date: reportDate,
              mission_leader: profile.name,
              category: i.category,
              content: i.content,
            }))
          );
          if (error) throw error;
        }
      }

      if (status === "submitted") {
        // 담임목사에게 알림 전송
        await fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            missionId: profile.mission_id,
            missionLeader: profile.name,
          }),
        });
        toast.success("선교회보고서가 제출되었습니다!");
        router.push("/dashboard/mission-leader");
      } else {
        toast.success("임시저장 완료");
      }
      router.refresh();
    } catch (err) {
      toast.error("저장 실패: " + (err as Error).message);
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  }

  // 순보고서 멤버에서 6가지 출석 집계
  const allMembers = sunReports.flatMap((sr) => sr.sun_report_members);
  const attendBreakdown = [
    { label: "삼일예배",   count: allMembers.filter((m) => m.attend_samil).length },
    { label: "금요예배",   count: allMembers.filter((m) => m.attend_friday).length },
    { label: "주일낮예배", count: allMembers.filter((m) => m.attend_sun_day).length },
    { label: "주일밤예배", count: allMembers.filter((m) => m.attend_sun_eve).length },
    { label: "순모임",     count: allMembers.filter((m) => m.attend_sun).length },
    { label: "전도",       count: allMembers.filter((m) => m.evangelism).length },
  ];

  return (
    <div className="space-y-4 pb-8">
      <Button
        variant="ghost"
        size="sm"
        className="px-0 -ml-1 text-muted-foreground text-base"
        onClick={() => router.push("/dashboard/mission-leader")}
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        뒤로가기
      </Button>

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-lg">선교회 {profile.mission_id} — {profile.name}</p>
          <p className="text-base text-muted-foreground">{reportDate} 주일</p>
        </div>
        {readonly && (
          <Badge className={initialData?.status === "submitted" ? "bg-green-100 text-green-800" : ""}>
            {initialData?.status === "submitted" ? "제출완료" : "임시저장"}
          </Badge>
        )}
      </div>

      {/* 자동 집계 */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-muted-foreground">순보고서 자동 집계</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 제출 순 수 + 성경 */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-white rounded-lg p-3 border">
              <p className="text-3xl font-bold text-primary">{aggregated.total_sun}</p>
              <p className="text-sm text-muted-foreground mt-1">제출된 순</p>
            </div>
            <div className="bg-white rounded-lg p-3 border">
              <p className="text-3xl font-bold text-primary">{aggregated.total_bible}</p>
              <p className="text-sm text-muted-foreground mt-1">성경 읽은 장수</p>
            </div>
          </div>
          {/* 6가지 출석 인원 */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">출석 인원 현황</p>
            <div className="grid grid-cols-3 gap-2">
              {attendBreakdown.map(({ label, count }) => (
                <div key={label} className="text-center bg-white rounded-lg py-2 px-1 border">
                  <p className="text-2xl font-bold text-primary">{count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 순별 보고 상세 */}
      {sunReports.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              순별 보고 상세{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({sunReports.length}순 제출)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sunReports.map((sr) => (
              <div key={sr.id} className="border-b last:border-0">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors text-left"
                  onClick={() => setExpandedSun(expandedSun === sr.id ? null : sr.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm w-12">{sr.sun_number}순</span>
                    <span className="text-sm text-muted-foreground">{sr.sun_leader}</span>
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <span>참석 {sr.attend_total}명</span>
                      <span>성경 {sr.bible_chapters}장</span>
                      <span>헌금 {(sr.offering ?? 0).toLocaleString()}원</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        sr.status === "submitted"
                          ? "bg-green-100 text-green-800 text-xs"
                          : "text-xs"
                      }
                    >
                      {sr.status === "submitted" ? "제출" : "임시저장"}
                    </Badge>
                    {expandedSun === sr.id
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>
                </button>

                {expandedSun === sr.id && (
                  <div className="px-6 pb-4 space-y-3 bg-muted/10">
                    {/* 예배 정보 */}
                    {(sr.worship_at || sr.worship_place || sr.worship_leader) && (
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground pt-1">
                        {sr.worship_at && <span>일시: {sr.worship_at}</span>}
                        {sr.worship_place && <span>장소: {sr.worship_place}</span>}
                        {sr.worship_leader && <span>인도자: {sr.worship_leader}</span>}
                      </div>
                    )}

                    {/* 참석 명단 + 성경 장수 */}
                    {sr.sun_report_members.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          참석 명단 ({sr.sun_report_members.filter(m => m.attend_sun_day).length}명 주일낮 참석)
                        </p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-muted-foreground border-b">
                                <th className="text-left py-1.5 pr-3 font-medium">성명</th>
                                <th className="py-1.5 px-1.5 font-medium">삼일</th>
                                <th className="py-1.5 px-1.5 font-medium">금요</th>
                                <th className="py-1.5 px-1.5 font-medium">주일낮</th>
                                <th className="py-1.5 px-1.5 font-medium">주일밤</th>
                                <th className="py-1.5 px-1.5 font-medium">순모임</th>
                                <th className="py-1.5 px-1.5 font-medium">전도</th>
                                <th className="py-1.5 px-1.5 font-medium">주보</th>
                                <th className="py-1.5 px-1.5 font-medium">성경(장)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sr.sun_report_members.map((m) => (
                                <tr key={m.id} className="border-b last:border-0">
                                  <td className="py-1.5 pr-3 font-medium">{m.member_name}</td>
                                  <td className="py-1.5 px-1.5 text-center">{m.attend_samil ? "✓" : "−"}</td>
                                  <td className="py-1.5 px-1.5 text-center">{m.attend_friday ? "✓" : "−"}</td>
                                  <td className="py-1.5 px-1.5 text-center text-blue-600 font-medium">{m.attend_sun_day ? "✓" : "−"}</td>
                                  <td className="py-1.5 px-1.5 text-center">{m.attend_sun_eve ? "✓" : "−"}</td>
                                  <td className="py-1.5 px-1.5 text-center">{m.attend_sun ? "✓" : "−"}</td>
                                  <td className="py-1.5 px-1.5 text-center">{m.evangelism ? "✓" : "−"}</td>
                                  <td className="py-1.5 px-1.5 text-center">{m.bulletin_recv ? "✓" : "−"}</td>
                                  <td className="py-1.5 px-1.5 text-center font-medium">
                                    {m.bible_read > 0 ? m.bible_read : "−"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground pt-1">등록된 순원 없음</p>
                    )}

                    {/* 특별보고 */}
                    {sr.special_note && (
                      <div className="text-sm bg-amber-50 border border-amber-200 rounded p-2">
                        <span className="text-xs font-medium text-amber-700">특별보고: </span>
                        <span className="text-amber-900">{sr.special_note}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 헌금 입력 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">헌금 현황</CardTitle>
          <p className="text-xs text-muted-foreground">
            개인별 금액 비공개 — 순보고서 헌금 합계
            {aggregated.total_offering > 0 && (
              <> (<strong className="text-primary">{aggregated.total_offering.toLocaleString()}원</strong>)</>
            )}
            {" "}가 자동으로 채워집니다. 다르면 직접 수정하세요.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <Label>선교회 헌금 총액 (원)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={totalOffering}
              onChange={(e) => setTotalOffering(e.target.value)}
              placeholder="0"
              className="h-12 text-base"
              disabled={readonly}
            />
          </div>
        </CardContent>
      </Card>

      {/* 특별보고 항목 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">선교회 특별보고</CardTitle>
          <p className="text-xs text-muted-foreground">
            기도가 필요한 항목을 카테고리별로 등록하세요
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {specialItems.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              등록된 항목 없음
            </p>
          )}

          {specialItems.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <div className="w-36 shrink-0">
                <Select
                  value={item.category}
                  onValueChange={(v) => v && updateSpecialItem(idx, "category", v)}
                  disabled={readonly}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIAL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                value={item.content}
                onChange={(e) => updateSpecialItem(idx, "content", e.target.value)}
                placeholder="내용을 입력하세요"
                rows={2}
                className="flex-1 resize-none text-sm"
                disabled={readonly}
              />
              {!readonly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive/80 mt-0.5 shrink-0"
                  onClick={() => removeSpecialItem(idx)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}

          {!readonly && (
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-primary hover:bg-primary/5 rounded transition-colors border border-dashed border-primary/30"
              onClick={addSpecialItem}
            >
              <PlusCircle className="w-4 h-4" />
              항목 추가
            </button>
          )}
        </CardContent>
      </Card>

      {/* 답글 — 기존 보고서(reportId 존재)에만 표시 */}
      {reportId && currentUserId && (
        <MissionReportComments
          reportId={reportId}
          initialComments={comments}
          currentUserId={currentUserId}
          canComment={canComment}
        />
      )}

      {/* PDF 저장 + 순원 성경 현황 — 항상 표시 */}
      <MissionReportPrintPanel
        missionId={profile.mission_id!}
        missionLeader={profile.name}
        reportDate={reportDate}
        sunReports={sunReports}
        totalOffering={parseInt(totalOffering) || initialData?.total_offering || 0}
      />

      {!readonly && (
        <>
          <Separator />
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12"
              onClick={() => saveReport("draft")}
              disabled={saving || submitting}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "저장 중..." : "임시저장"}
            </Button>
            <Button
              className="flex-1 h-12 bg-primary hover:bg-primary/90 font-semibold"
              onClick={() => saveReport("submitted")}
              disabled={saving || submitting}
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "제출 중..." : "제출하기"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
