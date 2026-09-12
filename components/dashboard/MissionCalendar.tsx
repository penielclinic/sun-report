"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { todayKST } from "@/lib/utils/report-aggregator";

interface Props {
  reportDates: string[]; // "YYYY-MM-DD" — 보고서 있는 날짜 목록
  selectedDate: string;  // 현재 선택된 날짜
}

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export default function MissionCalendar({ reportDates, selectedDate }: Props) {
  const router = useRouter();
  const dateSet = new Set(reportDates);
  const today = todayKST();

  const initDate = new Date(selectedDate + "T00:00:00");
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth()); // 0-based

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  const firstDow = new Date(viewYear, viewMonth, 1).getDay(); // 0=일
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function toDateStr(day: number) {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return (
    <div>
      {/* 월 네비게이션 */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold">
          {viewYear}년 {viewMonth + 1}월
        </span>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEK.map((d, i) => (
          <div
            key={d}
            className={`text-center text-[11px] font-medium py-1 ${
              i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 셀 */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="py-1.5" />;

          const dateStr = toDateStr(day);
          const hasReport = dateSet.has(dateStr);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === today;
          const isSun = i % 7 === 0;
          const isSat = i % 7 === 6;

          return (
            <button
              key={dateStr}
              onClick={() =>
                router.push(`/dashboard/mission-leader?date=${dateStr}`)
              }
              className={`relative flex flex-col items-center justify-center py-1.5 text-sm rounded-md transition-colors ${
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold"
                  : isToday
                  ? "bg-muted font-semibold"
                  : "hover:bg-muted/60"
              } ${isSun && !isSelected ? "text-red-500" : ""} ${
                isSat && !isSelected ? "text-blue-500" : ""
              }`}
            >
              {day}
              {hasReport && (
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    isSelected ? "bg-yellow-300" : "bg-primary"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
