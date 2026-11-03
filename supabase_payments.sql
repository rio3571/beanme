-- 거래처 입금 관리: 입금 기록 + 주문/수기 입력별 입금 연결
CREATE TABLE IF NOT EXISTS b2b_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  account_id  uuid NOT NULL REFERENCES b2b_accounts(id) ON DELETE CASCADE,
  paid_on     date NOT NULL,
  amount      integer NOT NULL DEFAULT 0, -- 실제 입금액 (부가세 포함 최종 금액)
  memo        text
);
CREATE INDEX IF NOT EXISTS b2b_payments_account_idx ON b2b_payments(account_id, paid_on);
ALTER TABLE b2b_payments ENABLE ROW LEVEL SECURITY;

-- 어느 입금으로 처리됐는지 (null = 미입금)
ALTER TABLE b2b_orders ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES b2b_payments(id) ON DELETE SET NULL;
ALTER TABLE roast_manual ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES b2b_payments(id) ON DELETE SET NULL;
