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

const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // 대한민국(KST)은 UTC+9, DST 없음

/**
 * 서버 실행 타임존과 무관하게 "지금"을 대한민국(KST) 기준 연/월/일로 구한다.
 * Vercel 등 서버는 보통 UTC로 동작하므로, 서버의 로컬 getDay()/getDate()를 그대로 쓰면
 * 자정부터 오전 9시(KST) 사이에는 아직 전날로 계산되는 버그가 생긴다.
 */
function kstDateParts(from: Date): { y: number; m: number; d: number } {
  const kst = new Date(from.getTime() + KST_OFFSET_MS);
  return { y: kst.getUTCFullYear(), m: kst.getUTCMonth(), d: kst.getUTCDate() };
}

/**
 * 이번 주 일요일 날짜 반환 (일요일부터 토요일까지 제출 시 모두 해당 주 일요일 기준)
 *
 * 예배는 일요일에 드리고, 보고서는 그 주 토요일까지 작성·수정할 수 있어야 하므로
 * 오늘이 일요일이면 오늘, 월~토요일이면 "지나온" 직전 일요일(이번 주 시작일)을 반환한다.
 * (과거 구현은 반대로 "다음" 일요일을 반환해 월~토 제출 시 날짜가 미래로 잘못 잡히는 버그가 있었음)
 *
 * 날짜 계산은 항상 KST(대한민국 표준시) 기준 — 서버가 UTC로 돌아도 결과가 흔들리지 않도록
 * KST 연/월/일을 구한 뒤 그 날짜의 UTC 자정으로 되돌려 반환한다 (toISOString/formatDate와 호환).
 */
export function getThisSunday(from: Date = new Date()): Date {
  const { y, m, d } = kstDateParts(from);
  const kstMidnight = new Date(Date.UTC(y, m, d));
  const day = kstMidnight.getUTCDay(); // 0=일, 1=월 ... 6=토 (KST 기준 요일)
  kstMidnight.setUTCDate(kstMidnight.getUTCDate() - day); // 이번 주가 시작된 일요일까지 되돌아감
  return kstMidnight;
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** 오늘 날짜(KST)를 YYYY-MM-DD 문자열로 반환 — <input type="date"> max, 파일명 등에 사용 */
export function todayKST(): string {
  const { y, m, d } = kstDateParts(new Date());
  return formatDate(new Date(Date.UTC(y, m, d)));
}
