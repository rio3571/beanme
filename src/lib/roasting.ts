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

/**
 * 오늘(KST) 기준, 가장 가까운 로스팅일(화·목) 'YYYY-MM-DD'.
 * 오늘이 화·목이면 오늘, 아니면 다음 화 또는 목.
 *  - 화(2)·목(4) → 오늘 / 수(3) → 이번주 목 / 그 외(금·토·일·월) → 다음 화
 * 수기 입력·현재 배치의 기준 날짜로 사용해 화·목 주기에 맞춘다.
 */
export function nextRoastDayKey(nowIso: string): string {
  const k = kstShift(nowIso);
  const w = k.getUTCDay(); // KST 요일
  let add: number;
  if (w === 2 || w === 4) add = 0;
  else if (w === 3) add = 1;
  else add = ((2 - w) + 7) % 7; // 금=+4, 토=+3, 일=+2, 월=+1 → 다음 화
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
