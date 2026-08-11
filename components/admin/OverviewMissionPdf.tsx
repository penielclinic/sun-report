"use client";

import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { getMissionName, SUN_COUNT } from "@/lib/constants/sun-directory";

export interface MissionStat {
  missionNum: number;
  total: number;
  submitted: number;
  attend: number;
}

interface SunRow {
  sunNumber: number;
  sunLeader: string;
  missionId: number;
  status: "submitted" | "draft" | "none";
  attendTotal: number;
}

interface Props {
  selectedDate: string;
  missionStats: MissionStat[];
  sunRows: SunRow[];
  trendData: { label: string; attend: number; reportedSuns: number }[];
}

function buildHtml(props: Props): string {
  const { selectedDate, missionStats, sunRows, trendData } = props;
  const totalSubmitted = missionStats.reduce((s, m) => s + m.submitted, 0);
  const totalAttend = missionStats.reduce((s, m) => s + m.attend, 0);

  const missionRows = missionStats
    .map(
      (m) => `
    <tr>
      <td class="center">${getMissionName(m.missionNum)}</td>
      <td class="center">${m.submitted} / ${m.total}</td>
      <td class="center">
        <div class="progress-wrap">
          <div class="progress-bar" style="width:${Math.round((m.submitted / m.total) * 100)}%"></div>
        </div>
        <span>${Math.round((m.submitted / m.total) * 100)}%</span>
      </td>
      <td class="center">${m.attend}명</td>
    </tr>
  `
    )
    .join("");

  const sunTableRows = sunRows
    .map(
      (r) => `
    <tr>
      <td class="center">${r.sunNumber}순</td>
      <td>${r.sunLeader}</td>
      <td class="center">${getMissionName(r.missionId)}</td>
      <td class="center">${
        r.status === "submitted"
          ? '<span class="badge green">제출</span>'
          : r.status === "draft"
          ? '<span class="badge yellow">임시</span>'
          : '<span class="badge gray">미제출</span>'
      }</td>
      <td class="center">${r.status !== "none" ? r.attendTotal + "명" : "−"}</td>
    </tr>
  `
    )
    .join("");

  const trendRows = trendData
    .map(
      (d) => `
    <tr>
      <td>${d.label}</td>
      <td class="center">${d.reportedSuns}순</td>
      <td class="center">${d.attend}명</td>
    </tr>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>선교회별 현황 — ${selectedDate}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:"맑은 고딕","Malgun Gothic","Noto Sans KR",sans-serif; font-size:10pt; padding:20px; color:#1a1a1a; }

  .header { text-align:center; border-bottom:3px solid #1B3A6B; padding-bottom:12px; margin-bottom:16px; }
  .church-name { font-size:10pt; color:#555; letter-spacing:1px; }
  .report-title { font-size:17pt; font-weight:bold; color:#1B3A6B; margin:4px 0; }
  .report-date { font-size:12pt; color:#C9A84C; font-weight:bold; }

  .summary-row { display:flex; gap:12px; margin-bottom:14px; }
  .summary-box { flex:1; border:1px solid #ddd; border-radius:6px; padding:8px 14px; background:#fafafa; }
  .summary-box .s-title { font-size:8pt; color:#777; }
  .summary-box .s-value { font-size:15pt; font-weight:bold; color:#1B3A6B; }

  .section { margin-bottom:16px; }
  .section-title { font-size:11pt; font-weight:bold; color:#1B3A6B; border-left:4px solid #C9A84C; padding-left:8px; margin-bottom:8px; }

  table { width:100%; border-collapse:collapse; font-size:9pt; }
  th { background:#1B3A6B; color:white; padding:5px 8px; text-align:left; }
  td { border:1px solid #ddd; padding:4px 8px; }
  tr:nth-child(even) td { background:#f5f7fb; }
  .center { text-align:center; }

  .progress-wrap { display:inline-block; width:60px; height:6px; background:#e5e7eb; border-radius:3px; vertical-align:middle; margin-right:4px; }
  .progress-bar { height:100%; background:#1B3A6B; border-radius:3px; }

  .badge { display:inline-block; padding:1px 6px; border-radius:4px; font-size:8.5pt; font-weight:bold; }
  .badge.green { background:#dcfce7; color:#166534; }
  .badge.yellow { background:#fef9c3; color:#854d0e; }
  .badge.gray { background:#f3f4f6; color:#6b7280; }

  .footer { margin-top:20px; border-top:1px solid #ddd; padding-top:8px; font-size:8pt; color:#aaa; text-align:right; }
  @page { size:A4 portrait; margin:15mm; }
  @media print { body { padding:0; } }
</style>
</head>
<body>

<div class="header">
  <p class="church-name">해운대순복음교회</p>
  <p class="report-title">선교회별 보고 현황</p>
  <p class="report-date">${selectedDate}</p>
</div>

<div class="summary-row">
  <div class="summary-box">
    <div class="s-title">제출 순 수</div>
    <div class="s-value">${totalSubmitted} / ${SUN_COUNT}</div>
  </div>
  <div class="summary-box">
    <div class="s-title">제출률</div>
    <div class="s-value">${Math.round((totalSubmitted / SUN_COUNT) * 100)}%</div>
  </div>
  <div class="summary-box">
    <div class="s-title">총 참석 인원</div>
    <div class="s-value">${totalAttend}명</div>
  </div>
</div>

<div class="section">
  <h3 class="section-title">선교회별 집계</h3>
  <table>
    <thead>
      <tr>
        <th class="center">선교회</th>
        <th class="center">제출/전체</th>
        <th class="center">제출률</th>
        <th class="center">참석</th>
      </tr>
    </thead>
    <tbody>${missionRows}</tbody>
  </table>
</div>

<div class="section">
  <h3 class="section-title">순별 상세 현황</h3>
  <table>
    <thead>
      <tr>
        <th class="center">순</th>
        <th>순장</th>
        <th class="center">선교회</th>
        <th class="center">상태</th>
        <th class="center">참석</th>
      </tr>
    </thead>
    <tbody>${sunTableRows}</tbody>
  </table>
</div>

${
  trendData.length >= 2
    ? `<div class="section">
  <h3 class="section-title">주간 추이 (최근 8주)</h3>
  <table>
    <thead><tr><th>날짜</th><th class="center">제출순수</th><th class="center">총참석</th></tr></thead>
    <tbody>${trendRows}</tbody>
  </table>
</div>`
    : ""
}

<div class="footer">
  출력일: ${new Date().toLocaleDateString("ko-KR")} &nbsp;·&nbsp; 해운대순복음교회 순보고 시스템
</div>
</body>
</html>`;
}

export function OverviewMissionPdf(props: Props) {
  const [loading, setLoading] = useState(false);

  function handleDownload() {
    setLoading(true);
    try {
      const html = buildHtml(props);
      const win = window.open("", "_blank", "width=900,height=1100");
      if (!win) {
        alert("팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요.");
        return;
      }
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 600);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className="gap-1.5 border-[#C9A84C]/60 text-[#C9A84C] hover:bg-[#C9A84C]/10 hover:text-[#C9A84C]"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
      PDF
    </Button>
  );
}
