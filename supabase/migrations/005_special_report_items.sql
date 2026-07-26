-- 특별보고 항목 테이블
CREATE TABLE IF NOT EXISTS special_report_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_report_id UUID REFERENCES sunbogo_mission_reports(id) ON DELETE CASCADE,
  mission_id        INT NOT NULL,
  report_date       DATE NOT NULL,
  mission_leader    TEXT,
  category          TEXT NOT NULL CHECK (category IN ('질병', '재정문제', '인간관계', '진로및직장문제', '기타')),
  content           TEXT NOT NULL,
  status            TEXT DEFAULT '기도중' CHECK (status IN ('기도중', '진행중', '해결됨')),
  pastor_memo       TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE special_report_items ENABLE ROW LEVEL SECURITY;

-- SELECT: 선교회장(본인 선교회) + 담임목사(전체)
CREATE POLICY "항목 조회" ON special_report_items
  FOR SELECT USING (
    (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'pastor'
    OR (
      (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'mission_leader'
      AND mission_id = (SELECT mission_id FROM sunbogo_profiles WHERE id = auth.uid())
    )
  );

-- INSERT: 선교회장(본인 선교회만)
CREATE POLICY "항목 생성" ON special_report_items
  FOR INSERT WITH CHECK (
    (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'mission_leader'
    AND mission_id = (SELECT mission_id FROM sunbogo_profiles WHERE id = auth.uid())
  );

-- UPDATE: 선교회장(본인) + 담임목사(전체 — 진행상황/메모)
CREATE POLICY "항목 수정" ON special_report_items
  FOR UPDATE USING (
    (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'pastor'
    OR (
      (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'mission_leader'
      AND mission_id = (SELECT mission_id FROM sunbogo_profiles WHERE id = auth.uid())
    )
  );

-- DELETE: 선교회장(본인만)
CREATE POLICY "항목 삭제" ON special_report_items
  FOR DELETE USING (
    (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'mission_leader'
    AND mission_id = (SELECT mission_id FROM sunbogo_profiles WHERE id = auth.uid())
  );
