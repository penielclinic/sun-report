# 해운대순복음교회 순·선교회 보고 앱 — CLAUDE.md

## 📌 프로젝트 개요

**앱 이름**: 순보고 (SunBogo)  
**교회**: 해운대순복음교회  
**목적**: 매주 일요일 낮 예배 후 순장 → 선교회장 → 담임목사 순으로 제출되는 종이 보고서를 완전히 온라인화  
**스택**: Next.js 14 (App Router) + Supabase + Vercel  
**언어**: 한국어 UI 100%

---

## 🏗️ 조직 구조

```
해운대순복음교회
├── 담임목사 (유진성 목사님)
├── 선교회 1 (목양장로 + 선교회장)
│   ├── 1순 — 순장: 이봉자
│   ├── 2순 — 순장: 정춘옥
│   ├── 3순 — 순장: 김인숙
│   └── 4순 — 순장: 이복희
├── 선교회 2
│   ├── 5순 — 순장: 황양희
│   ├── 6순 — 순장: 엄옥자
│   └── 7순 — 순장: 김정미
├── 선교회 3
│   ├── 8순  — 순장: 김동선
│   ├── 9순  — 순장: 김장순
│   └── 10순 — 순장: 박정자
├── 선교회 4
│   ├── 11순 — 순장: 권덕숙
│   ├── 12순 — 순장: 정호이
│   ├── 13순 — 순장: 김은혜
│   └── 14순 — 순장: 김경미F
├── 선교회 5
│   ├── 15순 — 순장: 김영화
│   ├── 16순 — 순장: 박현순
│   ├── 17순 — 순장: 김임선
│   └── 18순 — 순장: 안다인
├── 선교회 6
│   ├── 19순 — 순장: 정정수
│   ├── 20순 — 순장: 정가경
│   ├── 21순 — 순장: 송경옥
│   └── 22순 — 순장: 정태화
├── 선교회 7
│   ├── 23순 — 순장: 오미미
│   ├── 24순 — 순장: 소미아
│   └── 25순 — 순장: 김옥내
├── 선교회 8
│   ├── 26순 — 순장: 정행순
│   ├── 27순 — 순장: 조영희
│   ├── 28순 — 순장: 박미자
│   └── 29순 — 순장: 김용덕
├── 선교회 9
│   ├── 30순 — 순장: 윤지은
│   ├── 31순 — 순장: 배연정
│   └── 32순 — 순장: 임춘애
├── 선교회 10
│   ├── 33순 — 순장: 이윤경B
│   ├── 34순 — 순장: 김혜영C
│   ├── 35순 — 순장: 박숙현
│   ├── 36순 — 순장: 박민옥
│   └── 37순 — 순장: 박향규
├── 선교회 11
│   ├── 38순 — 순장: 강경숙
│   ├── 39순 — 순장: 변숙자
│   ├── 40순 — 순장: 이윤정
│   └── 41순 — 순장: 신상현
├── 선교회 12
│   ├── 42순 — 순장: 나순주
│   ├── 43순 — 순장: 박소영B
│   └── 44순 — 순장: 한미영
└── 브릿지선교회 (13선교회 · 순장/선교회장 없음)
    └── 45순 — 목자: 김의현·홍혜진 (부부, 두 명 모두 순장 권한으로 순보고서 직접 제출)
```

> **브릿지선교회 특수 규칙**: 선교회장이 없으므로 선교회보고서 제출 대상에서 제외(`MISSION_REPORT_COUNT = 12`).
> 목자의 순보고서 제출이 곧 최종 보고이며, 담임목사 대시보드에는 "목자 직접보고"로 표시된다.
> 명단은 교적부(공유 DB `members` 테이블, mission='브릿지선교회') 기준 26명.

---

## 👤 사용자 역할 (RBAC)

| 역할 | 접근 범위 | 주요 기능 |
|------|-----------|-----------|
| `순장` | 자기 순만 | 순보고서 작성·제출·수정(제출 전) |
| `선교회장` | 소속 선교회 전체 | 순보고서 열람, 선교회보고서 작성·제출 |
| `담임목사` | 전체 | 모든 보고서 열람, 통계 대시보드, 최종 확인 |

---

## 📋 보고서 데이터 모델

### 1. 순보고서 (`sun_reports`)

순장이 매주 제출하는 보고서 (기존 종이 양식 디지털화)

```sql
CREATE TABLE sun_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sun_number      INT NOT NULL,           -- 순 번호 (1~44)
  sun_leader      TEXT NOT NULL,          -- 순장 이름
  mission_id      INT NOT NULL,           -- 소속 선교회 번호 (1~12)
  report_date     DATE NOT NULL,          -- 보고 일자
  worship_at      TEXT,                   -- 예배 일시
  worship_place   TEXT,                   -- 예배 장소
  worship_leader  TEXT,                   -- 인도자
  attend_total    INT DEFAULT 0,          -- 참석인원 (합계)
  bible_chapters  INT DEFAULT 0,          -- 성경읽은장수
  special_note    TEXT,                   -- 특별보고사항
  status          TEXT DEFAULT 'draft',   -- 'draft' | 'submitted'
  submitted_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 순원 출석 현황 (순보고서 내 멤버별 상세)
CREATE TABLE sun_report_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID REFERENCES sun_reports(id) ON DELETE CASCADE,
  member_name     TEXT NOT NULL,          -- 성명
  attend_samil    BOOLEAN DEFAULT false,  -- 삼일예배 참석
  attend_friday   BOOLEAN DEFAULT false,  -- 금요예배 참석
  attend_sun_day  BOOLEAN DEFAULT false,  -- 주일낮예배 참석
  attend_sun_eve  BOOLEAN DEFAULT false,  -- 주일밤예배 참석
  attend_sun      BOOLEAN DEFAULT false,  -- 순모임 참석
  evangelism      BOOLEAN DEFAULT false,  -- 전도
  bulletin_recv   BOOLEAN DEFAULT false,  -- 주보전달
  bible_read      INT DEFAULT 0,          -- 성경읽은장수
  member_note     TEXT                    -- 개별 보고사항
);
```

### 2. 선교회보고서 (`mission_reports`)

선교회장이 소속 순보고서를 집계 후 제출하는 보고서  
**헌금은 개인 금액 비공개 — 선교회장이 선교회 총액만 직접 입력**

```sql
CREATE TABLE mission_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id      INT NOT NULL,           -- 선교회 번호 (1~12)
  report_date     DATE NOT NULL,          -- 보고 일자
  mission_leader  TEXT,                   -- 선교회장
  -- 순보고서에서 자동 합산되는 집계 필드
  total_sun       INT DEFAULT 0,          -- 총 순 수
  total_attend    INT DEFAULT 0,          -- 총 참석인원
  total_bible     INT DEFAULT 0,          -- 총 성경읽은장수
  -- 헌금: 개인별 금액 불명, 선교회장이 선교회 총액을 직접 입력
  total_offering  INT DEFAULT 0,          -- 선교회 헌금 총액 (원)
  special_note    TEXT,                   -- 선교회 특별보고
  status          TEXT DEFAULT 'draft',   -- 'draft' | 'submitted'
  submitted_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

### 3. 사용자·편성 테이블

```sql
-- 사용자 프로필
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  name        TEXT NOT NULL,
  role        TEXT NOT NULL,  -- 'sun_leader' | 'mission_leader' | 'pastor'
  sun_number  INT,            -- 순장인 경우 담당 순 번호
  mission_id  INT             -- 선교회장인 경우 소속 선교회
);

-- 순 편성표 (정적 데이터)
CREATE TABLE sun_directory (
  sun_number    INT PRIMARY KEY,
  sun_leader    TEXT NOT NULL,
  mission_id    INT NOT NULL
);
```

---

## 🗺️ 화면 구성 (페이지 라우팅)

```
/                           → 로그인 페이지
/dashboard                  → 역할별 홈 대시보드
  /dashboard/sun-leader     → 순장 홈 (내 보고서 현황)
  /dashboard/mission-leader → 선교회장 홈 (소속 순 현황)
  /dashboard/pastor         → 담임목사 홈 (전체 현황)

/report/sun/new             → 순보고서 작성 (순장)
/report/sun/[id]            → 순보고서 상세·수정
/report/sun/history         → 지난 순보고서 목록

/report/mission/new         → 선교회보고서 작성 (선교회장)
/report/mission/[id]        → 선교회보고서 상세·수정
/report/mission/history     → 지난 선교회보고서 목록

/admin/overview             → 전체 보고 현황 (주차별)
/admin/statistics           → 통계·차트 (출석 트렌드, 헌금 현황)
/admin/members              → 순원 관리
/admin/settings             → 편성표 관리, 사용자 권한 관리
```

---

## 🔄 보고 워크플로우

```
[매주 일요일 낮 예배 후]

순장 (44명)
  ↓ 앱에서 순보고서 작성 & 제출
  ↓ (제출 전까지 수정 가능)
  ↓ 제출 완료 → 선교회장에게 알림 (KakaoTalk / 앱 푸시)

선교회장 (12명)
  ↓ 소속 순 보고서 모두 접수 확인
  ↓ 자동 집계된 선교회보고서 검토
  ↓ 특별보고사항 추가 후 제출
  ↓ 제출 완료 → 담임목사님에게 알림

담임목사 (유진성 목사님)
  ↓ 전체 12개 선교회 보고서 열람
  ↓ 주차별 통계 대시보드 확인
```

---

## 🎨 UI/UX 디자인 방향

### 디자인 컨셉
- **따뜻하고 신뢰감 있는 교회 앱** 
- 메인 컬러: 딥 네이비 `#1B3A6B` + 골드 `#C9A84C` (교회의 권위와 따뜻함)
- 배경: 크림화이트 `#FAFAF7`
- 폰트: Noto Sans KR (가독성), 헤더는 굵게

### 핵심 UX 원칙
1. **모바일 퍼스트** — 순장들이 예배 직후 스마트폰으로 바로 작성
2. **3탭 이내 제출** — 로그인 → 보고서 작성 → 제출 완료
3. **자동 완성** — 순장 이름, 순 번호, 날짜 자동 입력
4. **오프라인 임시저장** — 네트워크 불안정 시에도 로컬 저장
5. **큰 글씨·큰 버튼** — 연령대가 다양한 사용자 고려

### 주요 컴포넌트
- **순보고서 입력 폼**: 멤버별 출석 체크박스 (토글 스위치), 헌금 숫자 키패드
- **제출 완료 화면**: 애니메이션 확인 효과 + 요약 카드
- **선교회장 대시보드**: 소속 순별 제출 현황 (○/✕ 인디케이터)
- **전체 현황 보드**: 12개 선교회 × 제출 상태 그리드

---

## 🔔 알림 시스템

### Phase 1 — 앱 내 알림
- 순보고서 제출 시 → 해당 선교회장에게 알림
- 선교회보고서 제출 시 → 담임목사님에게 알림
- 미제출 순장 → 일요일 오후 2시 자동 리마인더

### Phase 2 — 카카오 알림톡 연동
- 카카오 비즈니스 채널 연동
- 순보고서 제출 완료 알림톡
- 미제출 리마인더 알림톡

---

## 📊 통계 기능

담임목사 전용 대시보드:

1. **주차별 전체 출석 현황** — 라인 차트
2. **선교회별 평균 출석률** — 바 차트
3. **헌금 현황** — 주차별 합계
4. **성경읽기 현황** — 전체 합계 장수
5. **전도 현황** — 전도 건수 합계
6. **미제출 현황** — 주차별 미제출 순 목록

---

## 📁 프로젝트 구조

```
sun-bogo/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (app)/
│   │   ├── dashboard/
│   │   │   ├── page.tsx              ← 역할 감지 후 리다이렉트
│   │   │   ├── sun-leader/page.tsx
│   │   │   ├── mission-leader/page.tsx
│   │   │   └── admin/page.tsx
│   │   ├── report/
│   │   │   ├── sun/
│   │   │   │   ├── new/page.tsx      ← 순보고서 작성
│   │   │   │   ├── [id]/page.tsx     ← 상세·수정
│   │   │   │   └── history/page.tsx
│   │   │   └── mission/
│   │   │       ├── new/page.tsx      ← 선교회보고서 작성
│   │   │       ├── [id]/page.tsx
│   │   │       └── history/page.tsx
│   │   └── admin/
│   │       ├── overview/page.tsx
│   │       ├── statistics/page.tsx
│   │       └── settings/page.tsx
│   ├── api/
│   │   ├── reports/route.ts
│   │   └── notifications/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                           ← shadcn/ui 기반 공통 컴포넌트
│   ├── forms/
│   │   ├── SunReportForm.tsx         ← 순보고서 작성 폼
│   │   └── MissionReportForm.tsx     ← 선교회보고서 작성 폼
│   ├── dashboard/
│   │   ├── SunLeaderDashboard.tsx
│   │   ├── MissionLeaderDashboard.tsx
│   │   └── AdminDashboard.tsx
│   └── charts/
│       └── AttendanceChart.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── constants/
│   │   └── sun-directory.ts          ← 44순 편성표 정적 데이터
│   └── utils/
│       └── report-aggregator.ts      ← 순보고서 → 선교회보고서 집계 로직
├── supabase/
│   └── migrations/
│       ├── 001_create_profiles.sql
│       ├── 002_create_sun_reports.sql
│       ├── 003_create_mission_reports.sql
│       └── 004_rls_policies.sql      ← Row Level Security 정책
└── CLAUDE.md
```

---

## 🔐 Supabase RLS 정책

```sql
-- 순장: 자기 순 보고서만 CRUD
CREATE POLICY "순장 본인 보고서만 접근" ON sun_reports
  FOR ALL USING (
    auth.uid() = created_by
    AND sun_number = (SELECT sun_number FROM profiles WHERE id = auth.uid())
  );

-- 선교회장: 소속 선교회 순보고서 열람
CREATE POLICY "선교회장 소속 순 열람" ON sun_reports
  FOR SELECT USING (
    mission_id = (SELECT mission_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'mission_leader'
  );

-- 담임목사: 전체 열람
CREATE POLICY "담임목사 전체 열람" ON sun_reports
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'pastor'
  );
```

---

## 🚀 개발 단계 (Phase)

### Phase 1 — MVP (2주)
- [ ] Supabase 프로젝트 생성 + 스키마 마이그레이션
- [ ] 로그인 / 프로필 설정 (역할 기반)
- [ ] 순보고서 작성·제출 폼 (순장 전용)
- [ ] 선교회장 대시보드 (제출 현황 확인)
- [ ] 선교회보고서 자동 집계·제출

### Phase 2 — 알림 (1주)
- [ ] 앱 내 실시간 알림 (Supabase Realtime)
- [ ] 이메일 알림 (Supabase Edge Function)

### Phase 3 — 통계·관리 (1주)
- [ ] 담임목사 통계 대시보드 (출석, 헌금, 전도)
- [ ] 순 편성표 관리 페이지
- [ ] 보고서 PDF 내보내기

### Phase 4 — 고도화 (추후)
- [ ] 카카오 알림톡 연동
- [ ] PWA 오프라인 지원
- [ ] 이음(Eum) 플랫폼 통합

---

## 🔧 환경 변수

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_NAME=순보고
NEXT_PUBLIC_CHURCH_NAME=해운대순복음교회
```

---

## 📌 개발 시 주의사항

1. **순 번호 중복 방지** — 44순 편성표는 `sun-directory.ts` 상수 파일로 관리, DB와 이중 검증
2. **날짜 기준** — 보고서는 해당 주 일요일 날짜 기준으로 집계 (월~토 사이 제출도 해당 주로 처리)
3. **수정 가능 기간** — 순장은 선교회장이 선교회보고서를 제출하기 전까지만 수정 가능
4. **헌금 정보 보안** — 헌금은 개인별 금액 노출 없이 선교회 총액만 관리. `total_offering` 필드는 선교회장·담임목사만 열람 (RLS 적용)
5. **한글 입력 최적화** — IME 이슈 방지를 위해 `onCompositionEnd` 이벤트 처리
6. **모바일 폼** — 숫자 입력 필드는 `inputMode="numeric"` 설정으로 숫자 키패드 표시

---

*해운대순복음교회 순보고 앱 — by Claude Code*
