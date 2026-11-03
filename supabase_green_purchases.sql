-- 생두 결제(매입) 기록 — 수익관리의 이론 원두원가·로스율과 대조용
CREATE TABLE IF NOT EXISTS green_purchases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  paid_on     date NOT NULL,          -- 결제(입금)일
  for_month   text NOT NULL,          -- 귀속월 'YYYY-MM' (어느 달 생두값인지)
  amount      integer NOT NULL,       -- 결제 금액
  vat_included boolean NOT NULL DEFAULT false, -- true면 공급가 = amount/1.1 로 대조
  kg          numeric,                -- 받은 생두 kg (알면 실제 로스율 계산)
  supplier    text,
  memo        text
);
CREATE INDEX IF NOT EXISTS green_purchases_month_idx ON green_purchases(for_month);
ALTER TABLE green_purchases ENABLE ROW LEVEL SECURITY;
