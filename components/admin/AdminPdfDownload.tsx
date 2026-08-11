"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { getMissionName } from "@/lib/constants/sun-directory";

type Period = "week" | "month" | "year";

const PERIOD_LABELS: Record<Period, string> = {
  week:  "주간",
  month: "월간",
  year:  "연간",
};

interface PdfData {
  period: string;
  label: string;
  attend6: {
    samil: number; friday: number; sunDay: number;
    sunEve: number; sun: number; evangelism: number;
  };
  totalBible: number;
  totalOffering: number;
  sunCount: number;
  missionTable: { id: number; attend: number; bible: number; offering: number; sunCount: number }[];
  trend: { date: string; attend: number; bible: number; offering: number }[];
  generatedAt: string;
}

function buildPrintHtml(data: PdfData, periodLabel: string): string {
  const { label, attend6, totalBible, totalOffering, sunCount, missionTable, trend, generatedAt } = data;

  const totalAttend = attend6.sun; // 순모임 참석 = 대표 참석

  const attend6Rows = [
    ["삼일예배", attend6.samil],
    ["금요예배", attend6.friday],
    ["주일낮예배", attend6.sunDay],
    ["주일밤예배", attend6.sunEve],
    ["순모임", attend6.sun],
    ["전도", attend6.evangelism],
  ];

  const attend6Html = attend6Rows.map(([label, val]) => `
    <tr>
      <td class="item-label">${label}</td>
      <td class="item-val">${val}${label === "전도" ? "건" : "명"}</td>
    </tr>
  `).join("");

  const missionHtml = missionTable.map((m) => `
    <tr>
      <td class="center">${getMissionName(m.id)}</td>
      <td class="center">${m.sunCount}순</td>
      <td class="center">${m.attend}명</td>
      <td class="center">${m.bible}장</td>
      <td class="right">${m.offering > 0 ? m.offering.toLocaleString() + "원" : "−"}</td>
    </tr>
  `).join("");

  const trendLabel = data.period === "year" ? "월별" : data.period === "month" ? "주차별" : "";
  const trendHtml = trend.length > 1 ? `
    <div class="section">
      <h3 class="section-title">${trendLabel} 추이</h3>
      <table>
        <thead>
          <tr>
            <th>${data.period === "year" ? "월" : "날짜"}</th>
            <th class="right">참석</th>
            <th class="right">성경</th>
            <th class="right">헌금</th>
          </tr>
        </thead>
        <tbody>
          ${trend.map((t) => `
            <tr>
              <td>${t.date}</td>
              <td class="right">${t.attend}명</td>
              <td class="right">${t.bible}장</td>
              <td class="right">${t.offering > 0 ? t.offering.toLocaleString() + "원" : "−"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8"/>
<title>순보고 ${periodLabel} 보고서</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "맑은 고딕", "Malgun Gothic", "Noto Sans KR", sans-serif; font-size: 10pt; padding: 20px; color: #1a1a1a; }

  .header { text-align: center; border-bottom: 3px solid #1B3A6B; padding-bottom: 12px; margin-bottom: 16px; }
  .church-name { font-size: 11pt; color: #555; letter-spacing: 1px; }
  .report-title { font-size: 18pt; font-weight: bold; color: #1B3A6B; margin: 4px 0; letter-spacing: 2px; }
  .report-period { font-size: 12pt; color: #C9A84C; font-weight: bold; }

  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .summary-box { border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; background: #fafafa; }
  .summary-box .title { font-size: 8.5pt; color: #777; margin-bottom: 4px; }
  .summary-box .value { font-size: 16pt; font-weight: bold; color: #1B3A6B; }

  .section { margin-bottom: 16px; }
  .section-title { font-size: 11pt; font-weight: bold; color: #1B3A6B; border-left: 4px solid #C9A84C; padding-left: 8px; margin-bottom: 8px; }

  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { background: #1B3A6B; color: white; padding: 5px 8px; text-align: left; font-weight: bold; }
  td { border: 1px solid #ddd; padding: 4px 8px; }
  tr:nth-child(even) td { background: #f5f7fb; }
  .center { text-align: center; }
  .right { text-align: right; }
  .item-label { font-weight: 500; color: #333; width: 120px; }
  .item-val { font-weight: bold; color: #1B3A6B; font-size: 11pt; }

  .attend6-table { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
  .attend6-cell { border: 1px solid #ddd; border-radius: 6px; text-align: center; padding: 8px; background: #fafaf7; }
  .attend6-cell .a6-label { font-size: 8.5pt; color: #777; }
  .attend6-cell .a6-value { font-size: 14pt; font-weight: bold; color: #1B3A6B; margin-top: 2px; }

  .footer { margin-top: 20px; border-top: 1px solid #ddd; padding-top: 8px; font-size: 8pt; color: #aaa; text-align: right; }
  @page { size: A4 portrait; margin: 15mm; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>

<div class="header">
  <p class="church-name">해운대순복음교회</p>
  <p class="report-title">순보고 ${periodLabel} 보고서</p>
  <p class="report-period">${label}</p>
</div>

<div class="summary-grid">
  <div class="summary-box">
    <div class="title">순모임 총 참석</div>
    <div class="value">${totalAttend}명</div>
  </div>
  <div class="summary-box">
    <div class="title">전도</div>
    <div class="value">${attend6.evangelism}건</div>
  </div>
  <div class="summary-box">
    <div class="title">성경읽기</div>
    <div class="value">${totalBible}장</div>
  </div>
  <div class="summary-box">
    <div class="title">헌금 총액</div>
    <div class="value" style="font-size:12pt">${totalOffering > 0 ? totalOffering.toLocaleString() + "원" : "−"}</div>
  </div>
</div>

<div class="section">
  <h3 class="section-title">항목별 참석 현황 (${sunCount}개 순보고서 집계)</h3>
  <div class="attend6-table">
    ${[
      ["삼일예배", attend6.samil, "명"],
      ["금요예배", attend6.friday, "명"],
      ["주일낮예배", attend6.sunDay, "명"],
      ["주일밤예배", attend6.sunEve, "명"],
      ["순모임", attend6.sun, "명"],
      ["전도", attend6.evangelism, "건"],
    ].map(([l, v, u]) => `
      <div class="attend6-cell">
        <div class="a6-label">${l}</div>
        <div class="a6-value">${v}${u}</div>
      </div>
    `).join("")}
  </div>
</div>

<div class="section">
  <h3 class="section-title">선교회별 집계</h3>
  <table>
    <thead>
      <tr>
        <th class="center">선교회</th>
        <th class="center">순 수</th>
        <th class="center">참석</th>
        <th class="center">성경</th>
        <th class="right">헌금</th>
      </tr>
    </thead>
    <tbody>
      ${missionHtml}
      <tr style="background:#eef2ff;font-weight:bold">
        <td class="center" colspan="2">합계</td>
        <td class="center">${missionTable.reduce((s, m) => s + m.attend, 0)}명</td>
        <td class="center">${missionTable.reduce((s, m) => s + m.bible, 0)}장</td>
        <td class="right">${totalOffering > 0 ? totalOffering.toLocaleString() + "원" : "−"}</td>
      </tr>
    </tbody>
  </table>
</div>

${trendHtml}

<div class="footer">
  출력일: ${generatedAt} &nbsp;·&nbsp; 해운대순복음교회 순보고 시스템
</div>
</body>
</html>`;
}

export function AdminPdfDownload() {
  const [period, setPeriod] = useState<Period>("week");
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pdf-data?period=${period}`);
      if (!res.ok) throw new Error("데이터 조회 실패");
      const data: PdfData = await res.json();

      const html = buildPrintHtml(data, PERIOD_LABELS[period]);
      const win = window.open("", "_blank", "width=900,height=1100");
      if (!win) { alert("팝업이 차단되었습니다. 팝업 허용 후 다시 시도하세요."); return; }
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 600);
    } catch (e) {
      alert("PDF 생성 중 오류가 발생했습니다: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* 기간 선택 */}
      <div className="flex rounded-lg border border-border overflow-hidden text-sm">
        {(["week", "month", "year"] as Period[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 font-medium transition-colors ${
              period === p
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* 다운로드 버튼 */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={loading}
        className="gap-1.5 border-[#C9A84C]/60 text-[#C9A84C] hover:bg-[#C9A84C]/10 hover:text-[#C9A84C]"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4" />
        )}
        PDF
      </Button>
    </div>
  );
}
