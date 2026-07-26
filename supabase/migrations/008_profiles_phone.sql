-- sunbogo_profiles 테이블에 전화번호 컬럼 추가 (카카오 알림톡 발송용)
ALTER TABLE sunbogo_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
