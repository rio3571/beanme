-- 수기 로스팅 입력을 기존 거래처(b2b_accounts)와 연결하기 위한 컬럼 추가.
-- Supabase SQL Editor 에 붙여넣고 Run 하세요.
-- (대시보드: https://supabase.com/dashboard/project/ktluzellfrckmjnlnesh → SQL Editor)

alter table roast_manual
  add column if not exists account_id uuid references b2b_accounts(id) on delete set null;

create index if not exists roast_manual_account_id_idx on roast_manual (account_id);
