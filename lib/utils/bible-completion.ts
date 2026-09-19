import type { SupabaseClient } from "@supabase/supabase-js";
import { getMissionName } from "@/lib/constants/sun-directory";

// 성경통독·필사 완료자 보고 — 순보고서에서 체크된 순원을 모아
// "성경필사 / 최경남(권사 (3선교회))" 형식으로 선교회보고서·공개 통계에 표시한다.

export type BibleCompletionKind = "성경필사" | "성경통독";

export interface BibleCompletion {
  kind: BibleCompletionKind;
  name: string;
  title: string; // 직분 (교적부 기준, 없으면 "성도")
  missionId: number;
  missionName: string;
  reportDate: string;
}

type MemberRow = {
  member_name: string;
  bible_tongdok: boolean | null;
  bible_pilsa: boolean | null;
};

type ReportRow = {
  mission_id: number;
  report_date: string;
  members: MemberRow[];
};

/** 교적부 직분을 보고서용 호칭으로 정리 (은퇴권사 → 권사, 안수집사 → 집사, 빈 값 → 성도) */
export function normalizeTitle(position: string | null | undefined): string {
  const p = (position ?? "").trim();
  if (!p) return "성도";
  for (const t of ["목사", "전도사", "장로", "권사", "집사"]) {
    if (p.includes(t)) return t;
  }
  return "성도";
}

/** "최경남(권사 (3선교회))" */
export function formatCompletionLine(c: Pick<BibleCompletion, "name" | "title" | "missionName">): string {
  return `${c.name}(${c.title} (${c.missionName}))`;
}

/**
 * 순보고서(+순원) 목록에서 통독·필사 완료자를 뽑고, 교적부(members)에서 직분을 찾아 붙인다.
 * 같은 사람이 같은 종류로 여러 번 체크돼도 한 번만 표시한다. 필사 → 통독, 선교회 순으로 정렬.
 */
export async function buildBibleCompletions(
  admin: SupabaseClient,
  reports: ReportRow[]
): Promise<BibleCompletion[]> {
  const raw: Omit<BibleCompletion, "title">[] = [];
  const seen = new Set<string>();
  for (const r of reports) {
    for (const m of r.members ?? []) {
      const name = m.member_name?.trim();
      if (!name) continue;
      const kinds: BibleCompletionKind[] = [];
      if (m.bible_pilsa) kinds.push("성경필사");
      if (m.bible_tongdok) kinds.push("성경통독");
      for (const kind of kinds) {
        const key = `${kind}|${name}|${r.mission_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        raw.push({
          kind,
          name,
          missionId: r.mission_id,
          missionName: getMissionName(r.mission_id),
          reportDate: r.report_date,
        });
      }
    }
  }
  if (raw.length === 0) return [];

  // 교적부에서 직분 조회 — 동명이인은 같은 선교회 소속을 우선
  const names = [...new Set(raw.map((c) => c.name))];
  const { data: registry } = await admin
    .from("members")
    .select("name, position, mission")
    .in("name", names);
  const rows = (registry ?? []) as { name: string; position: string | null; mission: string | null }[];

  const result: BibleCompletion[] = raw.map((c) => {
    const candidates = rows.filter((row) => row.name === c.name);
    const match = candidates.find((row) => row.mission === c.missionName) ?? candidates[0];
    return { ...c, title: normalizeTitle(match?.position) };
  });

  return result.sort(
    (a, b) =>
      (a.kind === b.kind ? 0 : a.kind === "성경필사" ? -1 : 1) ||
      a.missionId - b.missionId ||
      a.name.localeCompare(b.name, "ko")
  );
}
