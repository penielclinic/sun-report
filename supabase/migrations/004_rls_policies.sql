-- 추가 RLS: sunbogo_profiles 전체 열람 (선교회장이 소속 순장 이름 조회에 필요)
CREATE POLICY "인증된 사용자 프로필 조회" ON sunbogo_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- sunbogo_mission_reports: 선교회장이 자기 선교회 목록 조회
CREATE POLICY "선교회장 목록 조회" ON sunbogo_mission_reports
  FOR SELECT USING (
    auth.uid() = created_by
    OR (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'pastor'
    OR (
      (SELECT role FROM sunbogo_profiles WHERE id = auth.uid()) = 'mission_leader'
      AND mission_id = (SELECT mission_id FROM sunbogo_profiles WHERE id = auth.uid())
    )
  );
