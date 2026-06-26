-- 거래처별 입금계좌 컬럼 추가 (Supabase SQL Editor 에 붙여넣고 Run)
ALTER TABLE b2b_accounts ADD COLUMN IF NOT EXISTS bank_info text;
