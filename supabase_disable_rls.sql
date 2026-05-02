-- ============================================================
-- RLS 일시 비활성화 (prototype 단계, 사용자 인증 붙이기 전까지)
-- 보안: anon/publishable 키로 누구나 모든 테이블 INSERT/SELECT 가능
-- 향후 사용자 인증 + Supabase Auth 도입 시 다시 RLS 활성화 권장
-- ============================================================
ALTER TABLE customers      DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results   DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders         DISABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_inquiries  DISABLE ROW LEVEL SECURITY;
