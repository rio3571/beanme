-- ============================================================
-- 주문건별 코멘트/문의 (거래처 ↔ 관리자 양방향)
-- Supabase SQL Editor 에 붙여넣고 Run
-- ============================================================
CREATE TABLE IF NOT EXISTS b2b_order_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  order_id    uuid NOT NULL REFERENCES b2b_orders(id) ON DELETE CASCADE,
  sender      text NOT NULL,   -- 'buyer' | 'admin'
  body        text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_b2b_order_comments_order
  ON b2b_order_comments(order_id, created_at);

ALTER TABLE b2b_order_comments ENABLE ROW LEVEL SECURITY;
