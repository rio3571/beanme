# beanme — 원두 구독·B2B 공급·선물 웹 서비스

퍼파파(프랜차이즈 카페) 대표의 별도 사업. **봇 프로젝트(`C:\Users\COFFEE DZ\Desktop\purpapa-b2b`)와 완전 분리**.

## 환경 / 실행

- 스택: Next.js 16 + TypeScript + Tailwind + App Router
- 위치: `D:\beanme` (D 드라이브 — 용량 여유)
- 개발: `npm run dev` (http://localhost:3000)
- 빌드: `npm run build`
- 타입 체크: `npx tsc --noEmit`

## 배포

- **Production URL**: https://beanme.vercel.app
- **GitHub**: `https://github.com/rio3571/beanme.git` (main 브랜치)
- **재배포 (자동, 한 번에)**:
  ```
  cd D:/beanme && git add . && git commit -m "..." && git push origin main && vercel --prod --yes
  ```
- 사용자 부담 줄이기 위해 코드 수정 후 자동으로 git push + vercel deploy 진행 (`feedback_auto_deploy` 메모리 룰)

## 환경변수 (`.env.local` + Vercel env)

- `NEXT_PUBLIC_SUPABASE_URL` = `https://ktluzellfrckmjnlnesh.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_w3LD9Y_llQ8q7mi5eDKEvA_skUxS0nj` (v2 publishable key)

⚠️ **새 v2 publishable key**라 레거시 RLS 정책의 `TO anon`이 안 통함. 현재 RLS 비활성화 상태(prototype). 인증 도입 시 `TO public` 또는 `TO authenticated`로 정책 재작성 필요.

## 데이터베이스 (Supabase)

- Dashboard: https://supabase.com/dashboard/project/ktluzellfrckmjnlnesh
- 테이블 4개:
  - `customers` (고객 정보, 4가지 customer_type)
  - `quiz_results` (설문 답변 + 추천 블렌드)
  - `orders` (주문/구독)
  - `b2b_inquiries` (B2B 상담 신청)
- SQL 마스터: `supabase_schema.sql` (초기), `supabase_disable_rls.sql` (현재 적용 상태)

## 폴더 구조

```
src/
  app/
    page.tsx                  ← 랜딩 (4가지 진입)
    quiz/
      b2c/page.tsx            ← 개인 8문항 → BeenType → 블렌드
      pro/page.tsx            ← 카페 7문항 → 포지셔닝
      office/page.tsx         ← 사무실 7문항 → 공급플랜
      gift/page.tsx           ← 선물 6문항 → 블렌드+패키지
    order/
      page.tsx                ← B2C/B2B 일반 주문 옵션
      gift/page.tsx           ← 선물 주문 폼
    api/
      quiz/route.ts           ← POST → quiz_results 저장
      orders/route.ts         ← POST → orders 저장
      b2b/route.ts            ← POST → b2b_inquiries 저장
  components/
    QuizRunner.tsx            ← 공통 설문 진행 (list/grid/chip 옵션 + 색상 테마)
  lib/
    supabase.ts               ← browser/server 클라이언트
    quiz_b2c.ts               ← getBeenType (B2C 태그 집계)
    quiz_gift.ts              ← getGiftBlend / getGiftMessage
  types/
    index.ts                  ← 공통 타입 (BeenType, Blend, GiftAnswers 등)
    order.ts                  ← Order, SubscriptionPlan 등

data/
  paths.json                  ← 4가지 진입 카드 (gift는 그라디언트)
  questions_b2c.json          ← B2C 8문항
  questions_pro.json          ← 카페 7문항
  questions_office.json       ← 사무실 7문항
  questions_gift.json         ← 선물 6문항 (Q6는 예산별 동적 패키지)
  blends_b2c.json             ← 4종 블렌드 레시피
  packages_gift.json          ← 8개 선물 패키지 (예산별 2종)
```

## 핵심 설계 — "수정 빈번 대응"

사용자 강조: "질문이나 이런것들 계속 수정될 확률이 높으니깐 개발 단계서부터 고려해줘".

**모든 콘텐츠가 JSON 데이터로 분리됨**. 코드는 데이터를 받아 렌더링만. 수정의 90%는 JSON만 건드리면 끝:

| 수정하고 싶은 것 | 만지면 되는 파일 |
|------------------|------------------|
| 설문 문항 추가/수정 | `data/questions_*.json` |
| 블렌드 레시피/색상 | `data/blends_b2c.json` |
| 진입 카드 (랜딩) | `data/paths.json` |
| 선물 패키지/가격 | `data/packages_gift.json` |
| 손편지 메시지 | `src/lib/quiz_gift.ts` getGiftMessage |
| 색상 테마 | 페이지 상단의 `theme` / 색상 상수 |

새 quiz 페이지 추가 시: `questions_*.json` + `page.tsx`에서 `QuizRunner` 사용 + 결과 분석 함수만.

## 진입별 색상 테마

- B2C: `#1D9E75` (초록)
- Pro: `#534AB7` (퍼플)
- Office: `#BA7517` (앰버)
- Gift: `#D4537E` + `#7F77DD` (핑크-퍼플 그라디언트)

## 작업 시 주의

- **봇 프로젝트와 분리**: 다른 디렉토리, 다른 git, 다른 배포. 절대 혼동하지 말 것.
- 코드 수정 후 자동 배포: `git push` + `vercel --prod --yes` 한 번에.
- Vercel 환경변수 변경 시: `vercel env add KEY environment` (production/preview/development 각각).
- Apps Script 같은 외부 시스템 없음. 모든 게 Next.js + Supabase 안에서.

## 진행 상황 / 메모

### 2026-05-02 초기 셋업 + Supabase 연동

- Phase 1~4 (랜딩 + 4개 quiz + order)
- 선물 경로 추가 (그라디언트 카드)
- Supabase 연동 (4 테이블, API routes 3개, 4개 quiz fetch)
- RLS 비활성화 (v2 publishable key가 anon role과 매핑 안 돼서 — 추후 인증 도입 시 재활성화)
- /test 페이지 작동 확인 후 제거

### 다음 우선순위 (사용자 결정 대기)

1. 주문/상담 폼 → DB 저장 (특히 `/order/gift` 가 가장 빠름)
2. 관리자 페이지 (들어온 주문/문의 보기)
3. 텔레그램 봇 알림 (대표 1:1로 새 주문 들어왔다고)
4. 디자인 다듬기
5. 토스페이먼츠 결제

---

## B2B 원두 주문 포털 (`/portal`) — 2026-06-26 추가

희연재 원두사업부의 **거래처 전용 B2B 주문 포털**. 기존 설문/소비자 퍼널과 별개 모듈로 `/portal` 하위에 구축.

### 인증/보안 모델
- **Supabase Auth**(이메일+비번) 로그인. 거래처는 **공개가입 X → 관리자(대표)가 계정 발급**.
- 데이터 접근은 전부 **서버에서 secret key 클라이언트**(`lib/supabaseAdmin.ts`, env `SUPABASE_SECRET_KEY`)로. b2b_* 테이블은 **RLS on + 정책 없음** → anon/publishable 키로는 접근 불가(서버 전용).
- `lib/portal.ts`: `getAuthUser`/`getMyAccount` (React `cache()`로 요청당 1회). 페이지에서 role 체크 후 redirect.
- `src/middleware.ts`: 세션 갱신 + `/portal/*` 보호. **로그인 유지**: 인증 쿠키 maxAge 400일(`lib/supabase.ts` + middleware의 setAll에서 value 있을 때만 연장, 로그아웃 시 정상 삭제).
- **로그인 아이디 영문 허용**: `lib/loginId.ts` `toAuthEmail` — `@` 없으면 `<id>@beanme.local` 로 변환해 Auth에 저장. `displayLoginId`로 역변환 표시. 기존 이메일 계정도 그대로.

### Supabase 테이블 (포털용)
- `supabase_b2b_portal.sql`: `b2b_accounts`(거래처/관리자, role buyer|admin), `products`, `account_prices`(아이디별 단가), `b2b_orders`, `b2b_order_items`, `b2b_messages`(일반 1:1 문의)
- `supabase_order_comments.sql`: `b2b_order_comments`(주문건별 코멘트)
- `supabase_bank_info.sql`: `b2b_accounts.bank_info` 컬럼 ALTER (거래처별 입금계좌)
- ⚠️ DDL은 JS로 불가 → **사용자가 Supabase SQL Editor에서 직접 Run** 해야 함. 코드는 `select("*")`/optional 읽기로 컬럼 없어도 안 깨지게 작성.

### 기능
- 거래처: 내 단가로 주문(`/portal/order`) → 주문내역 월별(`/portal/orders`) → 거래내역서 PDF(`/portal/statement`) → 일반 문의(`/portal/inquiry`) + 주문별 코멘트
- 관리자: 거래처 발급·아이디별 단가·입금계좌(`/portal/admin`, `/portal/admin/accounts/[id]`) / 전체 주문·상태변경(`/portal/admin/orders`) / 문의(`/portal/admin/messages`) / 거래처별 거래내역서
- **텔레그램 알림**: 새 주문·문의·주문코멘트 시 대표 1:1로. **기존 비서봇 재사용** (env `TELEGRAM_BOT_TOKEN`=비서봇, `TELEGRAM_OWNER_CHAT_ID`). `lib/telegram.ts`.
- **거래명세서 PDF**: `components/StatementView.tsx`(jspdf+html2canvas 동적 import, A4 다중페이지) + `lib/statement.ts`(월별 집계). 공급자 정보 `lib/supplier.ts`(주식회사 희연재 184-87-02137 김선규 / 주소 경기도 일산동구 사리현동 265-5 직화커피공장 / NICE2351@NAVER.COM).
- 비밀번호 변경(`/portal/account`), PC 반응형(max-w-5xl + 다단 grid, 모바일 헤더 메뉴 가로 알약).

### 운영 정보
- 관리자 계정: `rio3571@gmail.com` (초기 비번은 `scripts/seed_admin.mjs`로 발급/재설정 — 비번값은 .env에도 코드에도 저장 안 함, 별도 관리).
- 상품 시드: `scripts/seed_products.mjs` → **산·바다·노을·디카페인** (base_price 0, 단가는 거래처별 설정).
- env(.env.local + Vercel Production/Development): `SUPABASE_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID` (모두 서버 전용, gitignore됨).
- **Vercel 함수 리전 `icn1`(서울)** — `vercel.json`. DB와 동일 지역으로 지연 최소화. 무료 Supabase는 idle 시 콜드스타트 → 운영 본격화 시 Pro 권장.

### 미완료 / 다음
- ⏳ `supabase_bank_info.sql` (입금계좌 컬럼) **사용자 Run 대기** — 실행 전엔 계좌 기능 비활성(코드는 안 깨짐).
- 3단계: **전자세금계산서 자동발행**(팝빌 등 연동) — 거래명세서는 완료, 세금계산서는 추후.
