-- 선교회보고서
CREATE TABLE IF NOT EXISTS sunbogo_mission_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id      INT NOT NULL,
  report_date     DATE NOT NULL,
  mission_leader  TEXT,
  total_sun       INT DEFAULT 0,
  total_attend    INT DEFAULT 0,
  total_bible     INT DEFAULT 0,
  total_offering  INT DEFAULT 0,
  special_note    TEXT,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE sunbogo_mission_reports ENABLE ROW LEVEL SECURITY;

-- 선교회장: 본인 선교회 보고서만 CRUD
CREATE POLICY "선교회장 보고서 조회" ON sunbogo_mission_reports
  FOR SELECT USING (
    auth.uid() = created_by
    OR (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'pastor'
    OR (
      (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'mission_leader'
      AND mission_id = (SELECT mission_id FROM sunbogo_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "선교회장 보고서 생성" ON sunbogo_mission_reports
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "선교회장 보고서 수정" ON sunbogo_mission_reports
  FOR UPDATE USING (
    auth.uid() = created_by AND status = 'draft'
  );

-- 담임목사: 전체 열람
CREATE POLICY "담임목사 선교회보고서 열람" ON sunbogo_mission_reports
  FOR SELECT USING (
    (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'pastor'
  );
