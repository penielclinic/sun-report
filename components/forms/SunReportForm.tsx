"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { PlusCircle, Trash2, Save, Send, ChevronDown, ChevronUp, ChevronLeft, Settings2 } from "lucide-react";
import type { Profile, SunReport, SunReportMember } from "@/types/database";
import { getSunMembers } from "@/lib/constants/sun-directory";
import { todayKST } from "@/lib/utils/report-aggregator";

interface Props {
  profile: Profile;
  userId: string;
  reportDate: string;
  reportId: string | null;
  initialData: {
    report: SunReport;
    members: SunReportMember[];
  } | null;
  /** 우리 순의 가장 최근 제출 보고서 순원 명단 (새 보고서 작성 시 기본 명단으로 사용) */
  previousMembers?: string[] | null;
}

type MemberRow = {
  id?: string;
  member_name: string;
  attend_samil: boolean;
  attend_friday: boolean;
  attend_sun_day: boolean;
  attend_sun_eve: boolean;
  attend_sun: boolean;
  evangelism: boolean;
  bulletin_recv: boolean;
  bible_read: number;
  member_note: string;
};

const EMPTY_MEMBER = (): MemberRow => ({
  member_name: "",
  attend_samil: false,
  attend_friday: false,
  attend_sun_day: false,
  attend_sun_eve: false,
  attend_sun: false,
  evangelism: false,
  bulletin_recv: false,
  bible_read: 0,
  member_note: "",
});

// 예배 시간 옵션
const WORSHIP_TIMES = [
  "오전 11시",
  "오후 1시",
  "오후 2시",
  "오후 7시",
  "오전 10시",
  "오후 3시",
];

// 예배 장소 옵션
const WORSHIP_PLACES = ["교회", "본당", "교육관", "소예배실", "가정"];

// 기존 worshipAt 텍스트에서 날짜·시간 파싱
function parseWorshipAt(text: string | null | undefined, fallbackDate: string) {
  if (!text) return { date: fallbackDate, time: "오전 11시" };
  const dateMatch = text.match(/(\d{4})[.\-\/](\d{1,2})[.\-\/](\d{1,2})/);
  const timeMatch = text.match(/(오전|오후)\s*\d+시/);
  const date = dateMatch
    ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`
    : fallbackDate;
  const time = timeMatch ? timeMatch[0].replace(/\s+/, " ") : "오전 11시";
  return { date, time };
}

// 6가지 출석 항목 정의
const ATTEND_COLS: { key: keyof MemberRow; label: string }[] = [
  { key: "attend_samil",   label: "삼일" },
  { key: "attend_friday",  label: "금요" },
  { key: "attend_sun_day", label: "주낮" },
  { key: "attend_sun_eve", label: "주밤" },
  { key: "attend_sun",     label: "순모임" },
  { key: "evangelism",     label: "전도" },
];

export default function SunReportForm({
  profile,
  userId,
  reportDate,
  reportId,
  initialData,
  previousMembers,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(reportDate);
  const [dateChecking, setDateChecking] = useState(false);

  async function handleDateChange(newDate: string) {
    setSelectedDate(newDate);
    if (!newDate || reportId) return;
    setDateChecking(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("sun_reports")
        .select("id")
        .eq("created_by", userId)
        .eq("report_date", newDate)
        .maybeSingle();
      if (data?.id) {
        router.push(`/report/sun/${data.id}`);
      }
    } finally {
      setDateChecking(false);
    }
  }

  const parsedWorshipAt = parseWorshipAt(initialData?.report.worship_at, selectedDate);
  const [worshipDate, setWorshipDate] = useState(parsedWorshipAt.date);
  const [worshipTime, setWorshipTime] = useState(parsedWorshipAt.time);

  const initPlace = initialData?.report.worship_place ?? "교회";
  const [worshipPlaceSelect, setWorshipPlaceSelect] = useState(
    WORSHIP_PLACES.includes(initPlace) ? initPlace : "기타"
  );
  const [worshipPlaceCustom, setWorshipPlaceCustom] = useState(
    WORSHIP_PLACES.includes(initPlace) ? "" : initPlace
  );
  const worshipPlace = worshipPlaceSelect === "기타" ? worshipPlaceCustom : worshipPlaceSelect;

  const [worshipLeader, setWorshipLeader] = useState(initialData?.report.worship_leader ?? "");
  const [specialNote, setSpecialNote] = useState(initialData?.report.special_note ?? "");

  const defaultMembers = (): MemberRow[] => {
    // 지난 주 실제 제출 명단이 있으면 그걸 기본값으로 사용 (새가족 추가분 유지),
    // 없으면(첫 작성) 편성표(sun-directory.ts) 정적 명단으로 시작
    if (previousMembers && previousMembers.length > 0) {
      return previousMembers.map((name) => ({ ...EMPTY_MEMBER(), member_name: name }));
    }
    const names = getSunMembers(profile.sun_number!);
    const allNames = [profile.name, ...names];
    return allNames.map((name) => ({ ...EMPTY_MEMBER(), member_name: name }));
  };

  const [members, setMembers] = useState<MemberRow[]>(
    initialData?.members.length
      ? initialData.members.map((m) => ({
          id: m.id,
          member_name: m.member_name,
          attend_samil: m.attend_samil,
          attend_friday: m.attend_friday,
          attend_sun_day: m.attend_sun_day,
          attend_sun_eve: m.attend_sun_eve,
          attend_sun: m.attend_sun,
          evangelism: m.evangelism,
          bulletin_recv: m.bulletin_recv,
          bible_read: m.bible_read,
          member_note: m.member_note ?? "",
        }))
      : defaultMembers()
  );

  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // 주일낮예배 참석자를 목록 위쪽으로, 아직 체크 안 된 순원은 아래쪽으로 정렬
  // (원래 배열의 idx는 그대로 유지해 입력 핸들러가 올바른 행을 가리키게 함)
  const sortedMembers = useMemo(
    () =>
      members
        .map((member, idx) => ({ member, idx }))
        .sort((a, b) => {
          const aAttended = a.member.attend_sun_day ? 0 : 1;
          const bAttended = b.member.attend_sun_day ? 0 : 1;
          if (aAttended !== bAttended) return aAttended - bAttended;
          return a.idx - b.idx;
        }),
    [members]
  );

  const updateMember = useCallback(
    (idx: number, key: keyof MemberRow, value: MemberRow[keyof MemberRow]) => {
      setMembers((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], [key]: value };
        return next;
      });
    },
    []
  );

  const addMember = () => {
    setMembers((prev) => [...prev, EMPTY_MEMBER()]);
    setExpandedIdx(members.length);
  };

  const removeMember = (idx: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };

  // 6가지 출석 집계
  const attendCounts = ATTEND_COLS.map(({ key }) =>
    members.filter((m) => m[key] === true).length
  );
  const attendTotal = attendCounts[2]; // 주일낮예배 참석 (attend_sun_day)
  const autoBible = members.reduce((s, m) => s + (m.bible_read || 0), 0);

  const [manualBible, setManualBible] = useState<string>(
    initialData?.report.bible_chapters
      ? initialData.report.bible_chapters.toString()
      : ""
  );
  const bibleChapters = manualBible !== "" ? parseInt(manualBible) || 0 : autoBible;

  const [offering, setOffering] = useState<string>(
    initialData?.report.offering ? initialData.report.offering.toString() : ""
  );

  async function saveReport(status: "draft" | "submitted") {
    if (status === "draft") setSaving(true);
    else setSubmitting(true);

    try {
      const reportPayload = {
        sun_number: profile.sun_number!,
        sun_leader: profile.name,
        mission_id: profile.mission_id!,
        report_date: selectedDate,
        worship_at: worshipDate ? `${worshipDate} ${worshipTime}` : null,
        worship_place: worshipPlace || null,
        worship_leader: worshipLeader || null,
        attend_total: attendTotal,
        bible_chapters: bibleChapters,
        offering: parseInt(offering) || 0,
        special_note: specialNote || null,
        status,
        submitted_at: status === "submitted" ? new Date().toISOString() : null,
        created_by: userId,
      };

      const validMembers = members.filter((m) => m.member_name.trim());

      const res = await fetch("/api/reports/sun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, reportPayload, members: validMembers }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      if (status === "submitted") {
        toast.success("순보고서가 제출되었습니다!");
        router.push("/dashboard/sun-leader");
      } else {
        toast.success("임시저장 완료");
        if (!reportId) router.push(`/report/sun/${json.id}`);
      }
      router.refresh();
    } catch (err) {
      toast.error("저장 실패: " + (err as Error).message);
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 pb-8">
      <Button variant="ghost" size="sm" className="px-0 -ml-1 text-muted-foreground text-base" onClick={() => router.push("/dashboard/sun-leader")}>
        <ChevronLeft className="w-5 h-5 mr-1" />
        뒤로가기
      </Button>

      {/* 기본 정보 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            {profile.sun_number}순 — {profile.name} 순장
          </CardTitle>
          {reportId ? (
            <p className="text-base text-muted-foreground">{selectedDate} 주일</p>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                disabled={dateChecking}
                className="h-10 w-44 text-base"
                max={todayKST()}
              />
              {dateChecking && (
                <span className="text-sm text-muted-foreground">확인 중...</span>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 예배 일시 — 날짜 달력 + 시간 선택 */}
          <div className="space-y-1">
            <Label className="text-base">예배 일시</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                value={worshipDate}
                onChange={(e) => setWorshipDate(e.target.value)}
                className="h-11 text-base"
              />
              <Select value={worshipTime} onValueChange={(v) => setWorshipTime(v ?? "오전 11시")}>
                <SelectTrigger className="h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORSHIP_TIMES.map((t) => (
                    <SelectItem key={t} value={t} className="text-base">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 예배 장소 — 옵션 선택 */}
          <div className="space-y-1">
            <Label className="text-base">예배 장소</Label>
            <Select value={worshipPlaceSelect} onValueChange={(v) => setWorshipPlaceSelect(v ?? "교회")}>
              <SelectTrigger className="h-11 text-base">
                <SelectValue placeholder="장소 선택" />
              </SelectTrigger>
              <SelectContent>
                {WORSHIP_PLACES.map((p) => (
                  <SelectItem key={p} value={p} className="text-base">
                    {p}
                  </SelectItem>
                ))}
                <SelectItem value="기타" className="text-base">기타 (직접 입력)</SelectItem>
              </SelectContent>
            </Select>
            {worshipPlaceSelect === "기타" && (
              <Input
                value={worshipPlaceCustom}
                onChange={(e) => setWorshipPlaceCustom(e.target.value)}
                placeholder="장소를 직접 입력하세요"
                className="h-11 text-base mt-2"
              />
            )}
          </div>
          <div className="space-y-1">
            <Label className="text-base">인도자</Label>
            <Input
              value={worshipLeader}
              onChange={(e) => setWorshipLeader(e.target.value)}
              placeholder="인도자 이름"
              className="h-11 text-base"
            />
          </div>

          {/* 6가지 출석 집계 */}
          <div>
            <Label className="text-base mb-2 block">출석 현황 요약</Label>
            <div className="grid grid-cols-3 gap-2">
              {ATTEND_COLS.map(({ label }, i) => (
                <div key={label} className="text-center bg-muted/40 rounded-lg py-2 px-1 border">
                  <p className="text-2xl font-bold text-primary">{attendCounts[i]}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-base">성경읽은 장수</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={manualBible}
              onChange={(e) => setManualBible(e.target.value)}
              placeholder={autoBible > 0 ? String(autoBible) : "0"}
              className="h-11 text-base"
              min={0}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-base">헌금 (원)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={offering}
              onChange={(e) => setOffering(e.target.value)}
              placeholder="0"
              className="h-11 text-base"
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              개인별 금액은 기록하지 않습니다 — 이번 주 우리 순 헌금 총액만 입력해주세요
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 순원 출석 현황 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              순원 출석 현황{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({members.filter((m) => m.member_name.trim()).length}명)
              </span>
            </CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            주일낮예배 참석을 체크하면 이름이 위쪽으로 자동 정렬됩니다
          </p>
        </CardHeader>

        <CardContent className="p-0">
          {sortedMembers.map(({ member, idx }) => {
            const isOpen = expandedIdx === idx;
            return (
              <div
                key={idx}
                className={`border-b last:border-0 transition-colors duration-200 ${
                  isOpen
                    ? "bg-emerald-50 border-l-4 border-l-emerald-500"
                    : idx % 2 === 0 ? "bg-white" : "bg-sky-50/60"
                }`}
              >
                {/* ── 1행: 이름 입력 (전체 너비) + 펼치기 버튼 ── */}
                <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
                  <Input
                    value={member.member_name}
                    onChange={(e) => updateMember(idx, "member_name", e.target.value)}
                    placeholder="이름"
                    className={`flex-1 h-10 text-base px-3 transition-colors ${
                      isOpen ? "border-emerald-400 bg-white ring-1 ring-emerald-300" : ""
                    }`}
                  />
                  {/* ── 펼치기 버튼 ── */}
                  <button
                    type="button"
                    onClick={() => setExpandedIdx(isOpen ? null : idx)}
                    className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 shadow-sm shrink-0 ${
                      isOpen
                        ? "bg-emerald-500 text-white shadow-emerald-300 shadow-md scale-105"
                        : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border"
                    }`}
                  >
                    {isOpen ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>닫기</span>
                      </>
                    ) : (
                      <>
                        <Settings2 className="w-3.5 h-3.5" />
                        <span>열기</span>
                      </>
                    )}
                  </button>
                </div>

                {/* ── 2행: 타이틀 + 체크박스 ── */}
                <div className="flex items-center px-3 pb-2.5">
                  {ATTEND_COLS.map(({ key, label }) => (
                    <div key={key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                      <span className={`text-[10px] font-semibold ${
                        isOpen ? "text-emerald-700" : "text-muted-foreground"
                      }`}>
                        {label}
                      </span>
                      <Checkbox
                        checked={member[key] as boolean}
                        onCheckedChange={(v) => updateMember(idx, key, !!v)}
                        className={`w-6 h-6 transition-all ${
                          isOpen
                            ? "border-emerald-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            : ""
                        }`}
                      />
                    </div>
                  ))}
                </div>

                {/* ── 펼침 영역: 성경장수 + 주보전달 + 메모 + 삭제 ── */}
                {isOpen && (
                  <div className="mx-3 mb-3 mt-1 rounded-xl bg-white/80 border border-emerald-200 px-3 py-3 space-y-2.5 shadow-inner">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-sm text-muted-foreground">성경읽은 장수</Label>
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={member.bible_read || ""}
                          onChange={(e) => updateMember(idx, "bible_read", parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className="h-9 text-base text-center"
                          min={0}
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={member.bulletin_recv}
                            onCheckedChange={(v) => updateMember(idx, "bulletin_recv", !!v)}
                            className="w-5 h-5"
                          />
                          <span className="text-base">주보전달</span>
                        </label>
                      </div>
                    </div>
                    <Input
                      value={member.member_note}
                      onChange={(e) => updateMember(idx, "member_note", e.target.value)}
                      placeholder="개별 메모 (선택)"
                      className="h-9 text-base"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/80 px-0 h-8 text-sm"
                      onClick={() => removeMember(idx)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      이 순원 삭제
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* 순원 추가 버튼 */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 py-4 text-base text-primary hover:bg-primary/5 transition-colors font-medium"
            onClick={addMember}
          >
            <PlusCircle className="w-5 h-5" />
            순원 추가
          </button>
        </CardContent>
      </Card>

      {/* 특별 보고사항 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">특별보고사항</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={specialNote}
            onChange={(e) => setSpecialNote(e.target.value)}
            placeholder="기도제목, 특별한 사항 등을 적어주세요 (선택)"
            rows={3}
            className="resize-none text-base"
          />
        </CardContent>
      </Card>

      <Separator />

      {/* 저장·제출 버튼 */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 h-14 text-base"
          onClick={() => saveReport("draft")}
          disabled={saving || submitting}
        >
          <Save className="w-5 h-5 mr-2" />
          {saving ? "저장 중..." : "임시저장"}
        </Button>
        <Button
          className="flex-1 h-14 bg-primary hover:bg-primary/90 font-semibold text-base"
          onClick={() => saveReport("submitted")}
          disabled={saving || submitting}
        >
          <Send className="w-5 h-5 mr-2" />
          {submitting ? "제출 중..." : "제출하기"}
        </Button>
      </div>
    </div>
  );
}
