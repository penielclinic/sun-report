import type { SunReport } from "@/types/database";

/**
 * 소속 순보고서들을 집계해 선교회보고서 초기값 반환
 */
export function aggregateSunReports(reports: SunReport[]) {
  const submitted = reports.filter((r) => r.status === "submitted");
  return {
    total_sun: submitted.length,
    total_attend: submitted.reduce((sum, r) => sum + r.attend_total, 0),
    total_bible: submitted.reduce((sum, r) => sum + r.bible_chapters, 0),
    total_offering: submitted.reduce((sum, r) => sum + (r.offering || 0), 0),
  };
}

/**
 * 이번 주 일요일 날짜 반환 (월~토 제출 시 해당 주 일요일 기준)
 */
export function getThisSunday(from: Date = new Date()): Date {
  const day = from.getDay(); // 0=일, 1=월 ...
  const diff = day === 0 ? 0 : 7 - day; // 이번 주 일요일까지 남은 일수
  const sunday = new Date(from);
  sunday.setDate(from.getDate() + diff);
  return sunday;
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
