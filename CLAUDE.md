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
