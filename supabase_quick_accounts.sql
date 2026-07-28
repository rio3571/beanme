-- 간이 거래처(포털 미가입, 수기 입력 전용) 정보 저장.
-- 매번 다시 입력하지 않도록 거래처명·연락처·이메일·계좌 등을 저장해두고 재사용.
-- Supabase SQL Editor 에 붙여넣고 Run 하세요.
-- (대시보드: https://supabase.com/dashboard/project/ktluzellfrckmjnlnesh → SQL Editor)

create table if not exists quick_accounts (
  id           uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text,
  phone        text,
  email        text,
  business_no  text,
  address      text,
  bank         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 서버(secret key) 전용 접근 — b2b_* 테이블과 동일 패턴 (RLS on + 정책 없음)
alter table quick_accounts enable row level security;

create unique index if not exists quick_accounts_company_name_idx on quick_accounts (company_name);
