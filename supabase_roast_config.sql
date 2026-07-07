-- 로스팅 수익 원가 설정 (단일 행). Supabase SQL Editor 에서 Run.
create table if not exists roast_config (
  id         int primary key default 1,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table roast_config enable row level security; -- 서버(secret key) 전용
insert into roast_config (id, data) values (1, '{}'::jsonb) on conflict (id) do nothing;
