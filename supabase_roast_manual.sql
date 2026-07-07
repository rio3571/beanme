-- 로스팅 수기 입력(다른 경로 주문)을 서버에 저장 → 폰/PC 어디서든 동일하게 보이게.
-- Supabase SQL Editor 에 붙여넣고 Run 하세요.
-- (대시보드: https://supabase.com/dashboard/project/ktluzellfrckmjnlnesh → SQL Editor)

create table if not exists roast_manual (
  id         uuid primary key default gen_random_uuid(),
  account    text not null default '',
  qtys       jsonb not null default '{}'::jsonb,  -- {"산":2,"바다":1,...}
  roast_date text not null,                        -- 배치일 'YYYY-MM-DD'
  done       boolean not null default false,
  created_at timestamptz not null default now()
);

-- 서버(secret key) 전용 접근 — b2b_* 테이블과 동일 패턴 (RLS on + 정책 없음)
alter table roast_manual enable row level security;

create index if not exists roast_manual_roast_date_idx on roast_manual (roast_date);
