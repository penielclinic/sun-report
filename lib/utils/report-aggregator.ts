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
 * 이번 주 일요일 날짜 반환 (일요일부터 토요일까지 제출 시 모두 해당 주 일요일 기준)
 *
 * 예배는 일요일에 드리고, 보고서는 그 주 토요일까지 작성·수정할 수 있어야 하므로
 * 오늘이 일요일이면 오늘, 월~토요일이면 "지나온" 직전 일요일(이번 주 시작일)을 반환한다.
 * (과거 구현은 반대로 "다음" 일요일을 반환해 월~토 제출 시 날짜가 미래로 잘못 잡히는 버그가 있었음)
 */
export function getThisSunday(from: Date = new Date()): Date {
  const day = from.getDay(); // 0=일, 1=월 ... 6=토
  const sunday = new Date(from);
  sunday.setDate(from.getDate() - day); // 이번 주가 시작된 일요일까지 되돌아감
  return sunday;
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}
