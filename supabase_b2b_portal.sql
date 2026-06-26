-- ============================================================
-- beanme B2B 주문 포털 스키마 (1단계)
-- 사용법: Supabase Dashboard → SQL Editor → New query → 전체 붙여넣고 Run
--
-- 보안: 이 테이블들은 RLS 켜고 정책을 안 만들어서
--       anon(공개) 키로는 접근 불가 = 서버(service_role)에서만 읽고 씀.
--       돈/거래 데이터라 클라이언트에 직접 권한을 주지 않는 설계.
-- ============================================================

-- 1. 거래처 계정 (Supabase Auth 사용자와 연결)
CREATE TABLE IF NOT EXISTS b2b_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  auth_user_id  uuid UNIQUE,           -- auth.users.id (로그인 계정)
  company_name  text NOT NULL,         -- 거래처(상호)
  contact_name  text,                  -- 담당자
  phone         text,
  email         text,
  business_no   text,                  -- 사업자등록번호
  address       text,                  -- 배송지
  role          text NOT NULL DEFAULT 'buyer',   -- 'buyer' | 'admin'
  active        boolean NOT NULL DEFAULT true,
  memo          text
);
CREATE INDEX IF NOT EXISTS idx_b2b_accounts_auth ON b2b_accounts(auth_user_id);

-- 2. 상품
CREATE TABLE IF NOT EXISTS products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  name         text NOT NULL,
  category     text NOT NULL DEFAULT 'blend',  -- 'blend' | 'single' | 'etc'
  unit         text NOT NULL DEFAULT '1kg',
  base_price   integer NOT NULL DEFAULT 0,     -- 기본 단가(VAT별도)
  description  text,
  active       boolean NOT NULL DEFAULT true,
  sort_order   integer NOT NULL DEFAULT 0
);

-- 3. 아이디(거래처)별 단가 — 없으면 products.base_price 적용
CREATE TABLE IF NOT EXISTS account_prices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES b2b_accounts(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_price  integer NOT NULL,
  UNIQUE (account_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_account_prices_acct ON account_prices(account_id);

-- 4. 주문
CREATE TABLE IF NOT EXISTS b2b_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  order_no      text UNIQUE,            -- 사람이 읽는 주문번호 (앱에서 생성)
  account_id    uuid NOT NULL REFERENCES b2b_accounts(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'requested', -- requested|confirmed|shipped|done|canceled
  total_amount  integer NOT NULL DEFAULT 0,
  note          text                    -- 요청사항
);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_acct ON b2b_orders(account_id);
CREATE INDEX IF NOT EXISTS idx_b2b_orders_created ON b2b_orders(created_at);

-- 5. 주문 품목 (주문 시점 단가/이름을 스냅샷으로 저장)
CREATE TABLE IF NOT EXISTS b2b_order_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES b2b_orders(id) ON DELETE CASCADE,
  product_id    uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name  text NOT NULL,
  unit          text,
  unit_price    integer NOT NULL,
  qty           integer NOT NULL,
  line_amount   integer NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_b2b_order_items_order ON b2b_order_items(order_id);

-- 6. 1:1 문의 메시지
CREATE TABLE IF NOT EXISTS b2b_messages (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  account_id     uuid NOT NULL REFERENCES b2b_accounts(id) ON DELETE CASCADE,
  sender         text NOT NULL,         -- 'buyer' | 'admin'
  body           text NOT NULL,
  read_by_admin  boolean NOT NULL DEFAULT false,
  read_by_buyer  boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_b2b_messages_acct ON b2b_messages(account_id, created_at);

-- ── RLS 켜기 (정책 없음 → service_role(서버)만 접근) ──
ALTER TABLE b2b_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_prices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_messages    ENABLE ROW LEVEL SECURITY;

-- ── 상품 시드 (직화커피 라인업, 기본가는 추후 관리자에서 수정) ──
INSERT INTO products (name, category, unit, base_price, description, sort_order) VALUES
  ('다크브라운',   'blend',  '1kg', 20000, '균형 잡힌 바디감, 부담 없는 데일리', 1),
  ('스윗옐로우',   'blend',  '1kg', 22000, '부드러움과 은은한 단맛',            2),
  ('다크블루',     'blend',  '1kg', 22000, '산뜻한 산미와 고소함',              3),
  ('디카페인',     'blend',  '1kg', 24000, '견과류의 고소함, 은은한 아로마',     4),
  ('과테말라 안티구아',  'single', '1kg', 18000, '묵직한 바디, 다크초콜릿',     11),
  ('콜롬비아 수프리모',  'single', '1kg', 18000, '균형감, 부드러운 단맛',       12),
  ('에티오피아 예가체프','single', '1kg', 20000, '화사한 꽃향, 산뜻함',         13),
  ('인도네시아 만델링',  'single', '1kg', 18000, '깊은 바디, 스모키',           14),
  ('케냐 AA',           'single', '1kg', 20000, '선명한 산미, 베리',           15)
ON CONFLICT DO NOTHING;
