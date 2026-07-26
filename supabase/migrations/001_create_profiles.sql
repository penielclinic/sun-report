-- 사용자 프로필
CREATE TABLE IF NOT EXISTS sunbogo_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('sun_leader', 'mission_leader', 'pastor')),
  sun_number  INT,
  mission_id  INT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 순 편성표 (정적 데이터)
CREATE TABLE IF NOT EXISTS sun_directory (
  sun_number    INT PRIMARY KEY,
  sun_leader    TEXT NOT NULL,
  mission_id    INT NOT NULL
);

-- 44순 편성표 데이터 삽입
INSERT INTO sun_directory (sun_number, sun_leader, mission_id) VALUES
(1, '이봉자', 1), (2, '정춘옥', 1), (3, '김인숙', 1), (4, '이복희', 1),
(5, '황양희', 2), (6, '엄옥자', 2), (7, '김정미', 2),
(8, '김동선', 3), (9, '김장순', 3), (10, '박정자', 3),
(11, '권덕숙', 4), (12, '정호이', 4), (13, '김은혜', 4), (14, '김경미F', 4),
(15, '김영화', 5), (16, '박현순', 5), (17, '김임선', 5), (18, '안다인', 5),
(19, '정정수', 6), (20, '정가경', 6), (21, '송경옥', 6), (22, '정태화', 6),
(23, '오미미', 7), (24, '소미아', 7), (25, '김옥내', 7),
(26, '정행순', 8), (27, '조영희', 8), (28, '박미자', 8), (29, '김용덕', 8),
(30, '윤지은', 9), (31, '배연정', 9), (32, '임춘애', 9),
(33, '이윤경B', 10), (34, '김혜영C', 10), (35, '박숙현', 10), (36, '박민옥', 10), (37, '박향규', 10),
(38, '강경숙', 11), (39, '변숙자', 11), (40, '이윤정', 11), (41, '신상현', 11),
(42, '나순주', 12), (43, '박소영B', 12), (44, '한미영', 12)
ON CONFLICT (sun_number) DO NOTHING;

-- RLS 활성화
ALTER TABLE sunbogo_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sun_directory ENABLE ROW LEVEL SECURITY;

-- 본인 프로필만 조회·수정
CREATE POLICY "프로필 본인 조회" ON sunbogo_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "프로필 본인 수정" ON sunbogo_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "프로필 생성" ON sunbogo_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 순 편성표는 로그인한 모든 사용자 조회
CREATE POLICY "편성표 조회" ON sun_directory FOR SELECT USING (auth.role() = 'authenticated');
