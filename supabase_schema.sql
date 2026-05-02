-- ============================================================
-- beanme 초기 스키마 (4개 테이블 + RLS)
-- 사용법: Supabase Dashboard → SQL Editor → New query → 전체 붙여넣고 Run
-- ============================================================

-- 1. customers
CREATE TABLE IF NOT EXISTS customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  name          text NOT NULL,
  phone         text,
  email         text,
  company       text,
  customer_type text -- 'b2c' | 'b2b_pro' | 'b2b_office' | 'gift'
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- 2. quiz_results
CREATE TABLE IF NOT EXISTS quiz_results (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  customer_id  uuid REFERENCES customers(id) ON DELETE SET NULL,
  path_type    text NOT NULL, -- 'b2c' | 'pro' | 'office' | 'gift'
  answers      jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_type  text,          -- 'BRIGHT' | 'BALANCE' | 'DEEP' | 'AROMA'
  blend_name   text
);
CREATE INDEX IF NOT EXISTS idx_quiz_customer ON quiz_results(customer_id);
CREATE INDEX IF NOT EXISTS idx_quiz_path ON quiz_results(path_type);

-- 3. orders
CREATE TABLE IF NOT EXISTS orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  customer_id      uuid REFERENCES customers(id) ON DELETE SET NULL,
  quiz_result_id   uuid REFERENCES quiz_results(id) ON DELETE SET NULL,
  order_type       text NOT NULL, -- 'subscription' | 'oneshot' | 'b2b' | 'gift'
  blend_type       text,          -- 'BRIGHT' | 'BALANCE' | 'DEEP' | 'AROMA'
  package_name     text,
  amount           text,          -- '200g' | '500g' | '1kg' | '5kg' 등
  grind            text,          -- 'whole' | 'espresso' | 'drip'
  frequency        text,          -- 'monthly' | 'biweekly' | 'weekly' | NULL
  total_price      integer,
  status           text NOT NULL DEFAULT 'pending',
  delivery_address jsonb,
  gift_message     text,
  memo             text
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- 4. b2b_inquiries
CREATE TABLE IF NOT EXISTS b2b_inquiries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  company_name  text,
  contact_name  text,
  phone         text,
  email         text,
  inquiry_type  text NOT NULL, -- 'pro' | 'office'
  answers       jsonb NOT NULL DEFAULT '{}'::jsonb,
  volume        text,
  status        text NOT NULL DEFAULT 'new', -- 'new' | 'contacted' | 'contracted'
  memo          text
);
CREATE INDEX IF NOT EXISTS idx_b2b_status ON b2b_inquiries(status);

-- ============================================================
-- RLS (Row Level Security)
-- 정책: anon은 INSERT만 허용 (사용자가 설문/주문/문의 생성 가능)
--       SELECT/UPDATE/DELETE는 인증된 사용자(authenticated 또는 service_role)만 가능
-- ============================================================
ALTER TABLE customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results    ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_inquiries   ENABLE ROW LEVEL SECURITY;

-- 익명 INSERT 허용 (anon role)
CREATE POLICY "anon insert customers"      ON customers       FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon insert quiz_results"   ON quiz_results    FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon insert orders"         ON orders          FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon insert b2b_inquiries"  ON b2b_inquiries   FOR INSERT TO anon WITH CHECK (true);

-- upsert(by email)을 위한 anon SELECT/UPDATE — customers만 좁게 허용
-- (이메일 기준 동일 고객 식별)
CREATE POLICY "anon select customers by email" ON customers FOR SELECT TO anon USING (true);
CREATE POLICY "anon update customers"          ON customers FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 인증된 사용자 (대시보드 등 관리자) — 모든 권한
CREATE POLICY "authenticated all customers"      ON customers      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all quiz_results"   ON quiz_results   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all orders"         ON orders         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated all b2b_inquiries"  ON b2b_inquiries  FOR ALL TO authenticated USING (true) WITH CHECK (true);
