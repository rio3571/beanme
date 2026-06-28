/**
 * 로스팅 배치 계산.
 *
 * 운영 사이클: 월·수까지 주문 받고 → 화·목에 로스팅.
 *  - 화요일 로스팅 ← 목·금·토·일·월에 들어온 주문
 *  - 목요일 로스팅 ← 화·수에 들어온 주문
 *
 * 주문 created_at(UTC) 을 KST 요일로 보고, 다음 로스팅 날짜로 매핑한다.
 */

function kstShift(ts: string): Date {
  // UTC 타임스탬프를 KST 벽시계로 (UTC getter 로 KST 값 읽기)
  return new Date(new Date(ts).getTime() + 9 * 60 * 60 * 1000);
}

/** 주문 timestamp → 로스팅 날짜 'YYYY-MM-DD' (KST). 로스팅일은 항상 화(2) 또는 목(4). */
export function roastDateKey(ts: string): string {
  const k = kstShift(ts);
  const w = k.getUTCDay(); // 0=일 .. 6=토 (KST 기준)
  let add: number;
  if (w === 2 || w === 3) {
    // 화·수 → 같은 주 목요일
    add = 4 - w;
  } else {
    // 목·금·토·일·월 → 다음 화요일
    add = ((2 - w) + 7) % 7;
    if (add === 0) add = 7;
  }
  const base = new Date(
    Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate())
  );
  base.setUTCDate(base.getUTCDate() + add);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${base.getUTCFullYear()}-${p(base.getUTCMonth() + 1)}-${p(
    base.getUTCDate()
  )}`;
}

const WD = ["일", "월", "화", "수", "목", "금", "토"];

/** 'YYYY-MM-DD' → 'M월 D일 (화)' */
export function roastDateLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  const wd = WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 (${wd})`;
}

/** 오늘(KST) 의 'YYYY-MM-DD' */
export function todayKstKey(nowIso: string): string {
  const k = kstShift(nowIso);
  const p = (x: number) => String(x).padStart(2, "0");
  return `${k.getUTCFullYear()}-${p(k.getUTCMonth() + 1)}-${p(k.getUTCDate())}`;
}
