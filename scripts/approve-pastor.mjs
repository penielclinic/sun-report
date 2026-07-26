import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pmkxyxsqyiikmwcdbrmp.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBta3h5eHNxeWlpa213Y2Ricm1wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA2NzM5MywiZXhwIjoyMDkwNjQzMzkzfQ.QxusZ7aHGcF_K6gg0JWM6nxYGjl4ASTsP15L3Ezz-2I';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// 1. 현재 pastor 계정 조회
const { data: pastors, error: fetchErr } = await supabase
  .from('sunbogo_profiles')
  .select('id, name, role, status')
  .eq('role', 'pastor');

console.log('\n=== 현재 담임목사 계정 ===');
if (fetchErr) { console.error('조회 오류:', fetchErr.message); process.exit(1); }
if (!pastors || pastors.length === 0) {
  console.log('등록된 담임목사 계정이 없습니다.');
  console.log('\n→ 앱에서 /register 페이지로 회원가입 후 다시 실행하세요.');
  process.exit(0);
}

console.table(pastors);

// 2. pending 상태인 계정 승인
const pending = pastors.filter(p => p.status !== 'active');
if (pending.length === 0) {
  console.log('\n✅ 이미 모든 담임목사 계정이 승인되어 있습니다.');
  process.exit(0);
}

for (const p of pending) {
  const { error: updateErr } = await supabase
    .from('sunbogo_profiles')
    .update({ status: 'active' })
    .eq('id', p.id);

  if (updateErr) {
    console.error(`❌ ${p.name} 승인 실패:`, updateErr.message);
  } else {
    console.log(`✅ ${p.name} (${p.id}) 승인 완료!`);
  }
}
