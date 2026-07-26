-- ================================================================
-- AI 목회 지원 기능: pastoral_briefings, pastoral_alerts,
-- alert_settings, alert_recipients + Trigger + pg_cron + RPC
-- ================================================================

-- 확장 활성화 (최초 1회)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ----------------------------------------------------------------
-- 1. pastoral_briefings — 주간 AI 목회 브리핑 저장
-- ----------------------------------------------------------------
create table if not exists pastoral_briefings (
  id                uuid primary key default gen_random_uuid(),
  week_of           date not null unique,        -- 해당 주 시작일 (일요일 기준)

  -- 집계 원본 데이터
  raw_stats         jsonb not null default '{}', -- 출석률, 결석자 등 집계 JSON

  -- Claude API 결과
  briefing_text     text,                        -- 브리핑 전문
  briefing_summary  text,                        -- 3줄 요약 (알림톡용)

  -- 특별 관심 교인 (Claude가 추출)
  care_members      jsonb default '[]',
  -- [{ member_id, name, cell_name, reason, last_news }]

  -- 기쁜 소식
  joy_news          jsonb default '[]',
  -- [{ member_id, name, category, content }]

  -- 생성·발송 메타
  generated_at      timestamptz,
  alimtalk_sent_at  timestamptz,

  -- 목사님 열람
  read_at           timestamptz,

  created_at        timestamptz default now()
);

create index if not exists idx_briefings_week
  on pastoral_briefings(week_of desc);

-- RLS
alter table pastoral_briefings enable row level security;

create policy "목사님만 브리핑 접근"
  on pastoral_briefings for all
  using (
    (select role from sunbogo_profiles where id = auth.uid()) = 'pastor'
  );

-- ----------------------------------------------------------------
-- 2. pastoral_alerts — 목양 알림 발송 이력
-- ----------------------------------------------------------------
create table if not exists pastoral_alerts (
  id               uuid primary key default gen_random_uuid(),

  -- 알림 유형
  alert_type       text not null check (alert_type in (
    'keyword_critical',   -- 긴급 키워드 감지
    'absence_2w',         -- 2주 연속 결석
    'absence_4w',         -- 4주 연속 결석
    'absence_8w',         -- 8주 이상 결석
    'joy_news'            -- 기쁜 소식 (일괄)
  )),

  -- 대상 교인 (sun_reports, sun_report_members 기반)
  member_name      text,                         -- 교인 이름
  sun_number       int,                          -- 소속 순 번호
  sun_leader       text,                         -- 순장 이름

  -- 감지 내용
  triggered_by     text,                         -- 감지된 키워드 또는 결석 주수
  source_text      text,                         -- 원본 순보고 소식 내용
  source_report_id uuid references sun_reports(id) on delete set null,

  -- 발송 정보
  recipients       jsonb not null default '[]',
  -- [{ role: "pastor", name: "유진성", phone: "010-XXXX-XXXX" }]

  message_sent     text,                         -- 실제 발송된 알림톡 내용

  -- 상태
  status           text default 'pending' check (status in (
    'pending',     -- 발송 대기 (quiet hours)
    'sent',        -- 발송 완료
    'failed',      -- 발송 실패
    'suppressed'   -- 중복 방지로 발송 안 함
  )),

  sent_at          timestamptz,
  is_read          boolean default false,
  read_at          timestamptz,

  -- 중복 방지용
  dedup_key        text unique,
  -- 예: "keyword_critical:홍OO:수술:2026-W15"

  created_at       timestamptz default now()
);

create index if not exists idx_alerts_unread
  on pastoral_alerts(is_read, created_at desc);

create index if not exists idx_alerts_dedup
  on pastoral_alerts(dedup_key);

create index if not exists idx_alerts_status
  on pastoral_alerts(status, created_at);

-- RLS
alter table pastoral_alerts enable row level security;

create policy "목사님 전체 알림 접근"
  on pastoral_alerts for all
  using (
    (select role from sunbogo_profiles where id = auth.uid()) = 'pastor'
  );

create policy "선교회장 소속 알림 열람"
  on pastoral_alerts for select
  using (
    (select role from sunbogo_profiles where id = auth.uid()) = 'mission_leader'
    and alert_type in ('absence_4w', 'absence_8w')
    and sun_number in (
      select sd.sun_number from sun_directory sd
      join sunbogo_profiles p on p.mission_id = sd.mission_id
      where p.id = auth.uid()
    )
  );

create policy "순장 본인 순 알림 열람"
  on pastoral_alerts for select
  using (
    (select role from sunbogo_profiles where id = auth.uid()) = 'sun_leader'
    and alert_type = 'absence_2w'
    and sun_number = (select sun_number from sunbogo_profiles where id = auth.uid())
  );

-- ----------------------------------------------------------------
-- 3. alert_settings — 알림 유형별 설정
-- ----------------------------------------------------------------
create table if not exists alert_settings (
  id                       uuid primary key default gen_random_uuid(),
  alert_type               text unique not null,

  -- 활성화 여부
  is_enabled               boolean default true,

  -- 결석 알림 전용
  absence_weeks            int,               -- 몇 주 결석부터 발동할지

  -- 수신 대상
  notify_pastor            boolean default true,
  notify_missionary_leader boolean default false,
  notify_cell_leader       boolean default false,

  -- Quiet Hours (한국 시간 기준)
  quiet_hours_start        int default 22,    -- 22시
  quiet_hours_end          int default 7,     -- 7시
  quiet_hours_bypass       boolean default false, -- 긴급 알림은 quiet hours 무시

  -- 중복 방지 기간 (일)
  dedup_days               int default 7,

  updated_at               timestamptz default now()
);

-- 초기 설정값
insert into alert_settings
  (alert_type, absence_weeks, notify_pastor, notify_cell_leader, quiet_hours_bypass)
values
  ('keyword_critical', null, true,  false, false),
  ('absence_2w',       2,    false, true,  false),
  ('absence_4w',       4,    true,  false, false),
  ('absence_8w',       8,    true,  false, false),
  ('joy_news',         null, true,  false, false)
on conflict (alert_type) do nothing;

-- RLS
alter table alert_settings enable row level security;

create policy "목사님만 알림설정 관리"
  on alert_settings for all
  using (
    (select role from sunbogo_profiles where id = auth.uid()) = 'pastor'
  );

create policy "모든 인증 사용자 알림설정 열람"
  on alert_settings for select
  using (auth.uid() is not null);

-- ----------------------------------------------------------------
-- 4. alert_recipients — 알림 수신자 관리
-- ----------------------------------------------------------------
create table if not exists alert_recipients (
  id          uuid primary key default gen_random_uuid(),

  role        text not null check (role in (
    'pastor', 'mission_leader', 'sun_leader', 'admin'
  )),

  name        text not null,
  phone       text not null,           -- 010-XXXX-XXXX 형식

  -- 특정 선교회/순 담당 (선교회장·순장용)
  mission_id  int,
  sun_number  int,

  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- RLS
alter table alert_recipients enable row level security;

create policy "목사님만 수신자 관리"
  on alert_recipients for all
  using (
    (select role from sunbogo_profiles where id = auth.uid()) = 'pastor'
  );

-- ----------------------------------------------------------------
-- 5. get_consecutive_absentees RPC 함수 (AGENT.md 참조)
-- ----------------------------------------------------------------
create or replace function get_consecutive_absentees(
  min_weeks int,
  reference_date timestamptz default now()
)
returns table (
  member_name       text,
  sun_number        int,
  sun_leader        text,
  consecutive_weeks bigint,
  last_attended     date
)
language sql
security definer
as $$
  with recent_weeks as (
    -- 최근 N주 일요일 목록
    select
      generate_series(0, min_weeks - 1) as week_offset,
      (date_trunc('week', reference_date::date) - (generate_series(0, min_weeks - 1) * interval '1 week'))::date as week_date
  ),
  member_weekly as (
    -- 각 순원의 주차별 출석 여부
    select
      srm.member_name,
      sr.sun_number,
      sr.sun_leader,
      sr.report_date,
      srm.attend_sun_day or srm.attend_sun_eve or srm.attend_sun as attended
    from sun_report_members srm
    join sun_reports sr on sr.id = srm.report_id
    where sr.report_date >= (reference_date::date - (min_weeks * 7))
      and sr.status = 'submitted'
  ),
  absent_streak as (
    select
      mw.member_name,
      mw.sun_number,
      mw.sun_leader,
      count(*) as total_weeks,
      count(*) filter (where not mw.attended) as absent_weeks,
      max(mw.report_date) filter (where mw.attended) as last_attended_date
    from member_weekly mw
    group by mw.member_name, mw.sun_number, mw.sun_leader
    having count(*) filter (where not mw.attended) >= min_weeks
  )
  select
    member_name,
    sun_number,
    sun_leader,
    absent_weeks as consecutive_weeks,
    last_attended_date as last_attended
  from absent_streak
  order by absent_weeks desc, member_name;
$$;

-- ----------------------------------------------------------------
-- 6. PostgreSQL Trigger — sun_reports 저장 시 pastoral-alert 호출
-- ----------------------------------------------------------------
create or replace function fn_trigger_pastoral_alert()
returns trigger
language plpgsql
security definer
as $$
begin
  -- pg_net 확장으로 Edge Function 비동기 호출
  perform net.http_post(
    url     := current_setting('app.supabase_url', true)
               || '/functions/v1/pastoral-alert',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := jsonb_build_object(
      'report_id',    NEW.id,
      'sun_number',   NEW.sun_number,
      'sun_leader',   NEW.sun_leader,
      'mission_id',   NEW.mission_id,
      'special_note', NEW.special_note,
      'report_date',  NEW.report_date,
      'status',       NEW.status
    )::text
  );
  return NEW;

exception when others then
  -- 알림 실패가 순보고 저장을 막지 않도록 예외 무시
  raise warning 'pastoral-alert trigger failed: %', sqlerrm;
  return NEW;
end;
$$;

-- 기존 트리거 제거 후 재생성
drop trigger if exists trg_pastoral_alert on sun_reports;

create trigger trg_pastoral_alert
  after insert or update of status, special_note on sun_reports
  for each row
  when (NEW.status = 'submitted')
  execute function fn_trigger_pastoral_alert();

-- ----------------------------------------------------------------
-- 7. pg_cron 스케줄
-- ----------------------------------------------------------------
-- 매주 일요일 22:00 KST (13:00 UTC) — 결석 패턴 알림 + 브리핑 데이터 집계
select cron.schedule(
  'weekly-pastoral-alert',
  '0 13 * * 0',
  $$
  select net.http_post(
    url     := current_setting('app.supabase_url', true)
               || '/functions/v1/generate-briefing',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := '{"trigger": "cron"}'
  );
  $$
);

-- 매주 월요일 08:00 KST (23:00 UTC 전날) — 브리핑 알림톡 발송
select cron.schedule(
  'weekly-briefing-alimtalk',
  '0 23 * * 0',
  $$
  select net.http_post(
    url     := current_setting('app.supabase_url', true)
               || '/functions/v1/generate-briefing',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := '{"trigger": "send_alimtalk"}'
  );
  $$
);

-- 매일 07:00 KST (22:00 UTC 전날) — Quiet Hours 보류 알림 발송
select cron.schedule(
  'daily-pending-alerts',
  '0 22 * * *',
  $$
  select net.http_post(
    url     := current_setting('app.supabase_url', true)
               || '/functions/v1/pastoral-alert',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := '{"trigger": "send_pending"}'
  );
  $$
);
