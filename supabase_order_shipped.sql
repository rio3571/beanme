-- 주문별 '보낸 수량'(부분출고) 기록 → 로스팅 목록엔 '안 보낸 나머지'만 표시.
-- Supabase SQL Editor 에 붙여넣고 Run 하세요.
-- (대시보드: https://supabase.com/dashboard/project/ktluzellfrckmjnlnesh → SQL Editor)

alter table b2b_orders
  add column if not exists shipped jsonb not null default '{}'::jsonb;  -- {"산":5,"바다":2,...}
