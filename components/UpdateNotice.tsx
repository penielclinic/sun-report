"use client";

import { useState } from "react";
import { Megaphone, ChevronDown, ChevronUp, BookOpenCheck } from "lucide-react";

// 로그인 화면 상단 공지 — 새 기능(성경통독·필사) 안내. 눈에 띄도록 반짝이며, 눌러서 펼쳐 읽는다.
const keepAll = { wordBreak: "keep-all" as const };

export default function UpdateNotice() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6">
      <style>{`
        @keyframes notice-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.55); transform: scale(1); }
          50% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); transform: scale(1.02); }
        }
        @keyframes notice-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .notice-glow { animation: notice-glow 1.6s ease-in-out infinite; }
        .notice-blink { animation: notice-blink 1s steps(2, start) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .notice-glow, .notice-blink { animation: none; }
        }
      `}</style>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-left rounded-2xl border-2 border-red-500 bg-gradient-to-r from-red-50 via-amber-50 to-red-50 px-4 py-3 ${
          open ? "" : "notice-glow"
        }`}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-extrabold text-red-700 flex items-center gap-1.5">
              <span className="notice-blink inline-block rounded bg-red-600 text-white text-xs px-1.5 py-0.5">NEW</span>
              <span className="whitespace-nowrap">꼭 읽어주세요!</span>
            </p>
            <p className="text-sm font-semibold text-gray-800 mt-0.5" style={keepAll}>
              순보고에 <span className="text-red-700">성경통독 · 성경필사</span> 보고가 추가되었습니다
            </p>
          </div>
          {open ? (
            <ChevronUp className="w-5 h-5 text-red-600 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
        </div>
        {!open && (
          <p className="notice-blink text-center text-sm font-bold text-red-600 mt-2">
            👆 여기를 눌러 내용을 확인하세요
          </p>
        )}
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border-2 border-red-200 bg-white px-4 py-4 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <BookOpenCheck className="w-5 h-5 text-[#C9A84C]" />
            <p className="text-lg font-bold text-primary">성경통독 · 필사 보고 안내</p>
          </div>

          <section className="space-y-1.5">
            <p className="text-base font-bold text-gray-900">📝 순장님께</p>
            <ol className="list-decimal pl-5 space-y-1 text-base text-gray-700" style={keepAll}>
              <li>순보고서에서 해당 순원 이름 옆 <b>[열기]</b>를 누르세요.</li>
              <li>
                <b>&lsquo;성경통독 완료&rsquo;</b> 또는 <b>&lsquo;성경필사 완료&rsquo;</b>에 체크하세요.
              </li>
              <li>
                성경을 <b className="text-red-700">다 마친 그 주에 한 번만</b> 체크해주세요. (매주 체크하지 않습니다)
              </li>
            </ol>
          </section>

          <section className="space-y-1.5">
            <p className="text-base font-bold text-gray-900">📋 선교회장님께</p>
            <p className="text-base text-gray-700" style={keepAll}>
              순장님들이 체크한 내용이 선교회보고서에 <b>자동으로 모여</b> 목사님께 아래처럼 보고됩니다.
              따로 입력하실 필요가 없습니다.
            </p>
            <div className="rounded-lg bg-gray-50 border px-3 py-2 text-base leading-relaxed">
              <p className="font-semibold text-[#B8933A]">성경필사</p>
              <p>최경남(권사 (3선교회))</p>
              <p className="font-semibold text-primary mt-1">성경통독</p>
              <p>이영철(장로 (3선교회))</p>
            </div>
          </section>

          <section className="space-y-1.5">
            <p className="text-base font-bold text-gray-900">📊 모든 성도님께</p>
            <p className="text-base text-gray-700" style={keepAll}>
              통독·필사를 마친 분들의 명단은 이 화면 아래 <b>&lsquo;전체 통계 현황 보기&rsquo;</b>에도 자동으로 올라갑니다.
              함께 축하하고 격려해주세요! 🎉
            </p>
          </section>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground text-base font-semibold"
          >
            확인했습니다
          </button>
        </div>
      )}
    </div>
  );
}
