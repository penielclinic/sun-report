-- 순보고서
CREATE TABLE IF NOT EXISTS sun_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sun_number      INT NOT NULL,
  sun_leader      TEXT NOT NULL,
  mission_id      INT NOT NULL,
  report_date     DATE NOT NULL,
  worship_at      TEXT,
  worship_place   TEXT,
  worship_leader  TEXT,
  attend_total    INT DEFAULT 0,
  bible_chapters  INT DEFAULT 0,
  special_note    TEXT,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 순원 출석 현황
CREATE TABLE IF NOT EXISTS sun_report_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id       UUID REFERENCES sun_reports(id) ON DELETE CASCADE,
  member_name     TEXT NOT NULL,
  attend_samil    BOOLEAN DEFAULT false,
  attend_friday   BOOLEAN DEFAULT false,
  attend_sun_day  BOOLEAN DEFAULT false,
  attend_sun_eve  BOOLEAN DEFAULT false,
  attend_sun      BOOLEAN DEFAULT false,
  evangelism      BOOLEAN DEFAULT false,
  bulletin_recv   BOOLEAN DEFAULT false,
  bible_read      INT DEFAULT 0,
  member_note     TEXT
);

-- RLS
ALTER TABLE sun_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE sun_report_members ENABLE ROW LEVEL SECURITY;

-- 순장: 본인 보고서만 CRUD
CREATE POLICY "순장 본인 보고서 조회" ON sun_reports
  FOR SELECT USING (
    auth.uid() = created_by
    OR (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) IN ('mission_leader', 'pastor')
    OR (
      (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'mission_leader'
      AND mission_id = (SELECT mission_id FROM sunbogo_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "순장 보고서 생성" ON sun_reports
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "순장 보고서 수정" ON sun_reports
  FOR UPDATE USING (
    auth.uid() = created_by AND status = 'draft'
  );

-- 선교회장: 소속 선교회 순보고서 열람
CREATE POLICY "선교회장 소속 순 열람" ON sun_reports
  FOR SELECT USING (
    (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'mission_leader'
    AND mission_id = (SELECT mission_id FROM sunbogo_profiles WHERE id = auth.uid())
  );

-- 담임목사: 전체 열람
CREATE POLICY "담임목사 전체 열람" ON sun_reports
  FOR SELECT USING (
    (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'pastor'
  );

-- 순원 현황 RLS (보고서에 접근 가능한 사람만)
CREATE POLICY "순원현황 조회" ON sun_report_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sun_reports sr
      WHERE sr.id = report_id
      AND (
        sr.created_by = auth.uid()
        OR (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'pastor'
        OR (
          (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'mission_leader'
          AND sr.mission_id = (SELECT mission_id FROM sunbogo_profiles WHERE id = auth.uid())
        )
      )
    )
  );

CREATE POLICY "순원현황 생성" ON sun_report_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sun_reports sr
      WHERE sr.id = report_id AND sr.created_by = auth.uid()
    )
  );

CREATE POLICY "순원현황 수정" ON sun_report_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM sun_reports sr
      WHERE sr.id = report_id AND sr.created_by = auth.uid() AND sr.status = 'draft'
    )
  );

CREATE POLICY "순원현황 삭제" ON sun_report_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM sun_reports sr
      WHERE sr.id = report_id AND sr.created_by = auth.uid() AND sr.status = 'draft'
    )
  );
