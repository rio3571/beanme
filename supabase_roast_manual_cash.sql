-- 수기 로스팅 주문에 '현금 매출' 표기 컬럼 추가 (희연재 현금 거래 분리용).
-- Supabase SQL Editor 에 붙여넣고 Run 하세요.
-- (대시보드: https://supabase.com/dashboard/project/ktluzellfrckmjnlnesh → SQL Editor)

alter table roast_manual
  add column if not exists cash boolean not null default false;
