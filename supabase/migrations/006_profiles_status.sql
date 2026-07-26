-- sunbogo_profiles 테이블에 status 추가 (기존 계정은 active 유지)
ALTER TABLE sunbogo_profiles
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('pending', 'active', 'rejected'));

-- 기존 데이터 active로 설정
UPDATE sunbogo_profiles SET status = 'active' WHERE status IS NULL;
