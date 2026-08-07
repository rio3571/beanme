-- 수기 로스팅 주문에 'OEM(가공 위탁)' 표기 컬럼 추가 (푸르파파 납품 중 외부 가공 위탁분 분리용).
-- OEM 행은 직접 로스팅하지 않으므로 가공비(processing) 계산에서 제외됩니다.
-- Supabase SQL Editor 에 붙여넣고 Run 하세요.
-- (대시보드: https://supabase.com/dashboard/project/ktluzellfrckmjnlnesh → SQL Editor)

alter table roast_manual
  add column if not exists oem boolean not null default false;
