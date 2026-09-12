"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock3,
  BarChart2,
  HeartHandshake,
  FileDown,
  BellRing,
  ClipboardList,
  Sparkles,
  Users,
  UserCheck,
  Church,
  ChevronDown,
  KeyRound,
  UserPlus,
  LogIn,
  AlertTriangle,
} from "lucide-react";

type RoleTab = "sun_leader" | "mission_leader" | "pastor";

const keepAll = { wordBreak: "keep-all" as const };

// ── 종이 vs 앱 비교 데이터
const PAPER_ROWS = [
  "양식 나눠주고 걷는 데만 몇 시간",
  "손글씨 집계 — 더하기 실수 발생",
  "목사님께 전달되기까지 하루 이틀",
  "종이 분실·훼손, 보관 장소 필요",
  "지난 기록 찾으려면 서류철 뒤지기",
  "누가 안 냈는지 일일이 확인 전화",
];

const APP_ROWS = [
  "예배 후 스마트폰으로 3분이면 제출 끝",
  "참석·성경·헌금 자동 합산 — 실수 0",
  "제출 버튼 누르는 즉시 목사님 화면에",
  "모든 보고서 영구 보관, 언제든 검색",
  "지난 주·지난 달 기록 터치 한 번에",
  "미제출 순이 자동으로 표시, 자동 리마인더",
];

// ── 계정 안내: 회원가입 · 로그인 · 비밀번호
const ACCOUNT_GUIDE = [
  {
    icon: UserPlus,
    color: "bg-blue-100 text-blue-600",
    title: "회원가입 하는 방법",
    desc: "로그인 화면 아래 [회원가입]을 누르세요. 역할(순장 / 선교회장)을 고르고, 담당 순 번호(또는 소속 선교회)를 선택한 뒤, 이름과 전화번호, 비밀번호(숫자 4자리 이상)를 입력하고 신청하면 끝입니다. 이름이 곧 로그인 아이디이니 정확히 입력해주세요.",
    highlight: "⚠️ 회원가입 신청만으로는 바로 로그인할 수 없습니다. 담임목사님이 [사용자 관리]에서 승인해주셔야 로그인이 됩니다 — 처음 가입할 때는 물론, 계정이 삭제되어 다시 가입할 때도 마찬가지로 목사님 승인 후에 로그인할 수 있습니다.",
  },
  {
    icon: LogIn,
    color: "bg-emerald-100 text-emerald-600",
    title: "로그인 하는 방법",
    desc: "로그인 화면에서 이름과 비밀번호만 입력하면 됩니다. 이메일은 필요 없습니다. '아이디 기억하기'를 체크해두면 다음부터 이름을 다시 입력하지 않아도 됩니다.",
  },
  {
    icon: AlertTriangle,
    color: "bg-amber-100 text-amber-600",
    title: "회원가입이 안 될 때",
    desc: "① 이미 같은 이름으로 가입되어 있으면 신청이 안 됩니다 — 이전에 가입한 적이 있는지 담임목사님께 먼저 확인해주세요. ② 순 번호나 선교회를 잘못 고르면 오류가 날 수 있으니 편성표를 다시 확인해주세요. ③ 비밀번호는 숫자만, 4자리 이상이어야 합니다.",
  },
  {
    icon: AlertTriangle,
    color: "bg-amber-100 text-amber-600",
    title: "로그인이 안 될 때",
    desc: "① 이름 철자와 띄어쓰기를 다시 확인해주세요(등록된 이름과 정확히 같아야 합니다). ② 비밀번호를 다시 확인해주세요. ③ 방금 회원가입했다면 담임목사님 승인이 나기 전까지는 로그인이 안 됩니다 — 승인을 기다려주세요. ④ 그래도 안 되면 아래 '비밀번호를 잊어버렸을 때'를 이용해주세요.",
  },
  {
    icon: KeyRound,
    color: "bg-rose-100 text-rose-600",
    title: "비밀번호를 잊어버렸을 때",
    desc: "로그인 화면 하단의 '비밀번호를 잊으셨나요?'를 누르세요. 이름과 새 비밀번호(확인 포함)를 입력해 요청을 보내면, 담임목사님이 [사용자 관리]에서 승인하는 즉시 새 비밀번호로 로그인할 수 있습니다. 승인 전까지는 기존 비밀번호로도 계속 로그인됩니다 — 안심하고 요청해주세요.",
    highlight: "⚠️ 재발행하는 새 비밀번호는 반드시 숫자 6자리 이상이어야 합니다. (처음 회원가입할 때는 4자리 이상이면 되지만, 비밀번호를 다시 만들 때는 6자리 이상으로 더 안전하게 만들어야 합니다.)",
  },
];

// ── 목사님 유익
const PASTOR_BENEFITS = [
  {
    icon: Clock3,
    title: "주일 오후, 실시간 현황판",
    desc: "45개 순 · 12개 선교회의 제출 현황이 한 화면에. 보고서가 올라오는 순간 바로 확인하실 수 있습니다.",
  },
  {
    icon: CheckCircle2,
    title: "계산 실수 없는 자동 집계",
    desc: "참석 인원, 성경 읽은 장수, 전도 건수, 헌금 총액이 자동으로 합산됩니다. 사람이 더하지 않으니 틀리지 않습니다.",
  },
  {
    icon: BarChart2,
    title: "한눈에 보는 출석 추이",
    desc: "주간·월간·연간 차트로 교회의 흐름이 보입니다. 어느 선교회가 성장하고 어디에 돌봄이 필요한지 데이터로 확인됩니다.",
  },
  {
    icon: HeartHandshake,
    title: "심방이 필요한 성도를 놓치지 않음",
    desc: "질병·재정·인간관계 등 특별보고가 항목별로 정리되고, 장기 결석자는 자동으로 감지됩니다. 중보기도와 심방 대상이 분명해집니다.",
  },
  {
    icon: FileDown,
    title: "당회 보고 자료가 자동으로",
    desc: "주간 보고 PDF·엑셀이 버튼 하나로 만들어집니다. 당회 보고, 연말 결산 자료 준비 시간이 크게 줄어듭니다.",
  },
  {
    icon: BellRing,
    title: "독려 부담을 앱이 대신",
    desc: "주일 오후 미제출 순에게 자동 리마인더가 나갑니다. 일일이 전화하지 않으셔도 됩니다.",
  },
];

// ── 역할별 단계
const STEPS: Record<RoleTab, { title: string; desc: string }[]> = {
  sun_leader: [
    {
      title: "회원가입 (처음 한 번만)",
      desc: "로그인 화면에서 [회원가입] → 역할 '순장' 선택 → 담당 순 선택 → 이름과 숫자 비밀번호(4자리 이상) 입력 → 신청. 담임목사님이 승인하면 바로 사용할 수 있습니다. 이름이 곧 로그인 아이디입니다.",
    },
    {
      title: "주일 예배 후 로그인 → [보고서]",
      desc: "이름과 비밀번호로 로그인하면 내 순 화면이 열립니다. 상단의 [보고서] 버튼을 누르세요. 날짜·순 번호·순장 이름은 자동으로 채워져 있습니다. 보고서는 일요일부터 토요일 사이 언제든 작성·수정할 수 있습니다.",
    },
    {
      title: "순원 출석 체크 — 6개 버튼은 바로, 나머지는 [열기]",
      desc: "삼일·금요·주일낮·주일밤·순모임·전도, 이 6가지는 이름 옆 버튼을 바로 눌러 체크하면 됩니다. 성경 읽은 장수·주보전달·개별메모를 입력하려면 이름 줄 오른쪽의 [열기]를 눌러야 세부 입력창이 나옵니다. 다 입력했으면 [닫기]를 누르세요.",
    },
    {
      title: "체크할수록 이름이 저절로 정리됩니다",
      desc: "주일낮예배 참석을 체크한 순원은 목록 위쪽으로, 아직 체크하지 않은 순원은 아래쪽으로 자동으로 옮겨집니다. 그래서 아래쪽에 남은 이름만 보면 누구를 아직 확인 안 했는지 바로 알 수 있습니다.",
    },
    {
      title: "특별보고 작성",
      desc: "아픈 순원, 기도 제목, 기쁜 소식 등을 적으면 선교회장과 목사님께 그대로 전달됩니다. 종이보다 자세히 적을수록 목양에 큰 도움이 됩니다.",
    },
    {
      title: "제출 — 그리고 제출 후 수정·삭제까지",
      desc: "[제출] 버튼을 누르면 선교회장에게 자동으로 전달됩니다. 제출한 뒤라도 선교회장님이 선교회보고서를 아직 제출하지 않았다면, 내용을 다시 고쳐서 재제출하거나 [이 보고서 삭제]로 지우고 새로 작성할 수 있습니다. 하지만 선교회장님이 선교회보고서를 제출하고 나면 그 순간부터 순보고서 수정·삭제가 잠깁니다 — 그 뒤엔 선교회장님이나 목사님께 말씀해주세요.",
    },
  ],
  mission_leader: [
    {
      title: "회원가입 (처음 한 번만)",
      desc: "로그인 화면에서 [회원가입] → 역할 '선교회장' 선택 → 소속 선교회 선택 → 이름과 숫자 비밀번호 입력 → 신청 후 담임목사님 승인을 기다리세요.",
    },
    {
      title: "소속 순 제출 현황 확인",
      desc: "대시보드에 우리 선교회 순들의 제출 여부가 ○/✕로 표시됩니다. 종이를 걷으러 다닐 필요 없이 화면만 보면 됩니다. 제출된 순보고서는 터치해서 상세 내용을 볼 수 있습니다.",
    },
    {
      title: "선교회보고서 작성 — 집계는 자동",
      desc: "순보고서들의 참석 인원·성경 장수가 자동으로 합산되어 있습니다. 선교회장님은 헌금 총액만 직접 입력하시면 됩니다 (개인별 금액은 기록하지 않는 것이 원칙입니다).",
    },
    {
      title: "특별보고 항목 추가",
      desc: "질병 · 재정 문제 · 인간관계 · 진로/직장 · 기타 항목으로 나눠 기록하면, 목사님 화면에서 항목별로 정리되어 진행 상황까지 관리됩니다.",
    },
    {
      title: "제출 — 이 순간 순보고서가 잠깁니다",
      desc: "[제출]을 누르면 담임목사님께 자동 전달됩니다. 중요: 선교회보고서를 제출하는 순간, 소속 순장들의 순보고서는 더 이상 수정·삭제할 수 없게 잠깁니다. 그러니 순장님들이 아직 고칠 내용이 있는지 먼저 확인한 뒤에 제출해주세요.",
    },
  ],
  pastor: [
    {
      title: "대시보드 — 교회 전체가 한 화면에",
      desc: "로그인하면 이번 주 순보고서 제출(45순), 선교회 제출(12선교회), 총 참석 인원, 헌금 총액, 성경 읽기 합계가 바로 보입니다. 브릿지선교회는 목자 직접보고로 표시됩니다.",
    },
    {
      title: "사용자 관리 — 가입 승인 · 비밀번호 재발행 승인",
      desc: "순장·선교회장이 가입 신청하면 [사용자 관리]에서 승인하세요. 성도가 '비밀번호 찾기'로 재발행을 요청하면 같은 화면 상단에 승인 대기 목록이 뜨는데, 새 비밀번호를 확인하고 [승인]을 누르면 즉시 적용됩니다. 계정 직접 생성, 비밀번호 즉시 초기화도 여기서 하실 수 있습니다.",
    },
    {
      title: "전체 현황 — 주차별 상세",
      desc: "[상세보기]에서 선교회별·순별 제출 현황과 항목별 참석(삼일/금요/주낮/주밤/순모임/전도)을 확인하세요. 날짜를 바꾸면 지난 주 기록도 바로 열립니다.",
    },
    {
      title: "통계 — 흐름을 읽는 목회",
      desc: "주간·월간·연간 출석 추이, 선교회별 비교 차트가 자동으로 그려집니다. 감이 아니라 데이터로 교회의 흐름을 확인하실 수 있습니다.",
    },
    {
      title: "주간 보고 다운로드",
      desc: "선교회별 보고 현황을 PDF·엑셀로 내려받아 당회 보고, 인쇄 보관, 연말 결산에 바로 쓰실 수 있습니다.",
    },
    {
      title: "특별보고 관리 & 목양 도구",
      desc: "성도들의 어려움을 항목별로 보며 '기도중 → 진행중 → 해결됨'으로 관리하고 메모를 남기세요. 메시지 발송, AI 목회 브리핑, 장기 결석 목양알림 기능이 목양을 돕습니다.",
    },
  ],
};

const ROLE_TABS: { key: RoleTab; label: string; icon: typeof Users }[] = [
  { key: "sun_leader", label: "순장", icon: Users },
  { key: "mission_leader", label: "선교회장", icon: UserCheck },
  { key: "pastor", label: "담임목사", icon: Church },
];

// ── FAQ
const FAQS = [
  {
    q: "비밀번호를 잊어버렸어요.",
    a: "로그인 화면의 '비밀번호를 잊으셨나요?'를 눌러 이름과 새 비밀번호(숫자 6자리 이상)를 입력해 요청하세요. 담임목사님이 승인하면 즉시 새 비밀번호로 로그인할 수 있고, 승인 전까지는 원래 비밀번호가 그대로 유지되니 안심하셔도 됩니다.",
  },
  {
    q: "회원가입이 안 돼요.",
    a: "같은 이름으로 이미 가입된 계정이 있으면 새로 가입할 수 없습니다. 담임목사님께 기존 계정이 있는지 확인해주시고, 없다면 순 번호·선교회 선택이 맞는지, 비밀번호가 숫자 4자리 이상인지 다시 확인해주세요.",
  },
  {
    q: "로그인이 안 돼요.",
    a: "이름과 비밀번호를 다시 확인해주세요. 방금 가입했다면 담임목사님 승인 전까지는 로그인이 되지 않습니다. 그래도 안 되면 '비밀번호를 잊어버렸을 때' 방법으로 새 비밀번호를 요청해주세요.",
  },
  {
    q: "제출한 보고서를 고치거나 지우고 싶어요.",
    a: "순장님은 선교회장님이 선교회보고서를 제출하기 전까지 순보고서를 자유롭게 수정하거나 삭제 후 다시 작성할 수 있습니다. 선교회장님이 제출하고 나면 그 순간 잠기니, 급한 수정은 선교회장이나 목사님께 말씀해 주세요.",
  },
  {
    q: "브릿지선교회는 어떻게 보고하나요?",
    a: "브릿지선교회는 순장·선교회장 없이 목자(김의현·홍혜진) 두 분이 '순장' 역할로 가입해 순보고서를 직접 제출합니다. 두 분 중 한 분만 제출하면 되고, 제출 즉시 목사님께 최종 보고로 전달됩니다.",
  },
  {
    q: "스마트폰이 익숙하지 않은 순장님은요?",
    a: "글씨가 크고 버튼이 커서 한두 번만 해보면 종이보다 쉽습니다. 처음에는 가족이나 선교회장의 도움을 받아 함께 작성해 보세요. 이름과 숫자 비밀번호만 기억하면 됩니다.",
  },
  {
    q: "이제 종이 보고서는 안 내도 되나요?",
    a: "네. 앱 제출이 곧 공식 보고입니다. 같은 내용을 종이로 또 낼 필요가 없고, 기록은 앱에 영구 보관됩니다.",
  },
];

export default function GuidePage() {
  const [tab, setTab] = useState<RoleTab>("sun_leader");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* 상단 바 */}
      <header className="sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground shadow-sm">
        <div className="container mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="로고" width={26} height={26} />
            <span className="font-bold text-base">순보고 사용설명서</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-primary-foreground hover:bg-primary-foreground/10 gap-1"
          >
            <Link href="/login">
              <ArrowLeft className="w-4 h-4" />
              로그인으로
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-10">
        {/* 히어로 */}
        <section className="text-center space-y-3 pt-2">
          <p className="text-sm tracking-[0.3em] text-[#C9A84C] font-semibold">
            해운대순복음교회
          </p>
          <h1 className="text-3xl font-bold text-primary leading-snug" style={keepAll}>
            종이 없는 주일 보고,
            <br />
            <span className="text-[#C9A84C]">3분</span>이면 끝납니다
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto" style={keepAll}>
            순장님의 스마트폰에서 담임목사님의 책상까지 —
            제출 버튼 하나로 보고가 즉시 전달되고, 집계와 통계는 앱이 대신합니다.
          </p>
        </section>

        {/* 계정 안내: 회원가입 · 로그인 · 비밀번호 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2" style={keepAll}>
            <KeyRound className="w-5 h-5 text-[#C9A84C]" />
            회원가입 · 로그인 · 비밀번호
          </h2>
          <div className="space-y-3">
            {ACCOUNT_GUIDE.map(({ icon: Icon, color, title, desc, highlight }) => (
              <Card key={title} className="border-primary/15">
                <CardContent className="pt-4 pb-4 flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-primary" style={keepAll}>
                      {title}
                    </p>
                    <p className="text-base text-muted-foreground leading-relaxed mt-1" style={keepAll}>
                      {desc}
                    </p>
                    {highlight && (
                      <p
                        className="text-base font-bold text-rose-600 leading-relaxed mt-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2"
                        style={keepAll}
                      >
                        {highlight}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 종이 vs 앱 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2" style={keepAll}>
            <Sparkles className="w-5 h-5 text-[#C9A84C]" />
            종이 보고와 무엇이 다른가요?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="border-gray-200 bg-gray-50/60">
              <CardContent className="pt-4 pb-4 space-y-2.5">
                <p className="text-base font-bold text-gray-500">지금까지 — 종이 보고</p>
                {PAPER_ROWS.map((row) => (
                  <div key={row} className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600 leading-snug" style={keepAll}>{row}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-[#C9A84C]/50 bg-[#C9A84C]/5">
              <CardContent className="pt-4 pb-4 space-y-2.5">
                <p className="text-base font-bold text-primary">이제부터 — 순보고 앱</p>
                {APP_ROWS.map((row) => (
                  <div key={row} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#C9A84C] mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-primary leading-snug" style={keepAll}>{row}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 목사님 유익 */}
        <section className="space-y-4">
          <div className="rounded-xl bg-primary text-primary-foreground px-5 py-4">
            <h2 className="text-xl font-bold flex items-center gap-2" style={keepAll}>
              <Church className="w-5 h-5 text-[#C9A84C]" />
              담임목사님께 드리는 6가지 유익
            </h2>
            <p className="text-sm opacity-80 mt-1" style={keepAll}>
              순보고 앱은 행정 시간을 줄여 목양에 더 집중하시도록 돕습니다.
            </p>
          </div>
          <div className="space-y-3">
            {PASTOR_BENEFITS.map(({ icon: Icon, title, desc }, i) => (
              <Card key={title} className="border-primary/15">
                <CardContent className="pt-4 pb-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#C9A84C]/15 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4.5 h-4.5 text-[#C9A84C]" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-primary" style={keepAll}>
                      {i + 1}. {title}
                    </p>
                    <p className="text-base text-muted-foreground leading-relaxed mt-1" style={keepAll}>
                      {desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 역할별 사용법 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-primary flex items-center gap-2" style={keepAll}>
            <ClipboardList className="w-5 h-5 text-[#C9A84C]" />
            역할별 사용법
          </h2>

          {/* 탭 */}
          <div className="grid grid-cols-3 gap-2">
            {ROLE_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`h-12 rounded-lg border text-base font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  tab === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            ))}
          </div>

          {/* 단계 카드 */}
          <div className="space-y-3">
            {STEPS[tab].map((step, i) => (
              <Card key={`${tab}-${i}`} className="border-primary/15">
                <CardContent className="pt-4 pb-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-base font-bold text-primary" style={keepAll}>{step.title}</p>
                    <p className="text-base text-muted-foreground leading-relaxed mt-1" style={keepAll}>
                      {step.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}

            {tab === "sun_leader" && (
              <div className="rounded-lg border border-[#C9A84C]/50 bg-[#C9A84C]/10 px-4 py-3">
                <p className="text-base text-primary leading-relaxed" style={keepAll}>
                  <span className="font-bold">브릿지선교회 목자님께:</span>{" "}
                  김의현·홍혜진 목자님은 역할을 &lsquo;순장&rsquo;으로,
                  담당 순을 &lsquo;브릿지선교회&rsquo;로 선택해 가입하세요.
                  두 분 중 한 분만 제출하면 되고, 제출 즉시 목사님께 최종 보고로 전달됩니다.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-primary" style={keepAll}>자주 묻는 질문</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <Card key={faq.q} className="border-primary/15 overflow-hidden">
                <button
                  className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-2"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-base font-semibold text-primary" style={keepAll}>
                    Q. {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${
                      openFaq === i ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 -mt-1">
                    <p className="text-base text-muted-foreground leading-relaxed" style={keepAll}>
                      {faq.a}
                    </p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>

        {/* 마무리 CTA */}
        <section className="text-center space-y-4 pb-6">
          <div className="rounded-xl border border-[#C9A84C]/40 bg-[#C9A84C]/5 px-5 py-6 space-y-3">
            <p className="text-lg font-bold text-primary" style={keepAll}>
              이번 주일부터 시작해 보세요
            </p>
            <p className="text-base text-muted-foreground leading-relaxed" style={keepAll}>
              한 번 가입하면 매주 3분. 종이와 계산기는 이제 내려놓으셔도 됩니다.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button asChild className="bg-primary hover:bg-primary/90 h-11 px-6 font-semibold">
                <Link href="/register">회원가입</Link>
              </Button>
              <Button asChild variant="outline" className="h-11 px-6 font-semibold border-primary/30 text-primary">
                <Link href="/login">로그인</Link>
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            해운대순복음교회 순보고 시스템
          </p>
        </section>
      </main>
    </div>
  );
}
