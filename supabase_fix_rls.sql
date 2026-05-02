-- ============================================================
-- RLS 정책 수정: anon → public (Supabase v2 publishable key 호환)
-- 사용법: Supabase Dashboard → SQL Editor → 붙여넣고 Run
-- ============================================================

-- 기존 정책 제거
DROP POLICY IF EXISTS "anon insert customers"      ON customers;
DROP POLICY IF EXISTS "anon insert quiz_results"   ON quiz_results;
DROP POLICY IF EXISTS "anon insert orders"         ON orders;
DROP POLICY IF EXISTS "anon insert b2b_inquiries"  ON b2b_inquiries;
DROP POLICY IF EXISTS "anon select customers by email" ON customers;
DROP POLICY IF EXISTS "anon update customers"      ON customers;

-- 새 정책: public(모든 role) 대상으로 INSERT 허용
CREATE POLICY "public insert customers"      ON customers      FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public insert quiz_results"   ON quiz_results   FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public insert orders"         ON orders         FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "public insert b2b_inquiries"  ON b2b_inquiries  FOR INSERT TO public WITH CHECK (true);

-- customers: upsert(by email)을 위한 SELECT/UPDATE도 public 허용
CREATE POLICY "public select customers" ON customers FOR SELECT TO public USING (true);
CREATE POLICY "public update customers" ON customers FOR UPDATE TO public USING (true) WITH CHECK (true);
