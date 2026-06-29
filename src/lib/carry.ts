// 출고 차이 이월(carry-over): 주문양과 실제 출고량이 다를 때 차이를 거래처에 쌓아두고
// 다음 주문에 자동 합산. 품목명(product_name) 기준. b2b_accounts.memo(JSON)에 저장 — SQL 변경 없음.
export type CarryItem = { name: string; qty: number };

export function isCarryList(v: unknown): v is CarryItem[] {
  return (
    Array.isArray(v) &&
    v.every(
      (c) =>
        c &&
        typeof c === "object" &&
        typeof (c as CarryItem).name === "string" &&
        typeof (c as CarryItem).qty === "number"
    )
  );
}

/** 기존 이월 + 추가분 합치기 (품목별 합산, 0은 제거) */
export function mergeCarry(base: CarryItem[], add: CarryItem[]): CarryItem[] {
  const map = new Map<string, number>();
  for (const c of [...base, ...add]) {
    map.set(c.name, (map.get(c.name) ?? 0) + c.qty);
  }
  return [...map.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .filter((c) => c.qty !== 0);
}

/** "산 +2kg · 바다 −1kg" 형태 요약 */
export function carrySummary(list: CarryItem[]): string {
  return list
    .filter((c) => c.qty !== 0)
    .map((c) => `${c.name} ${c.qty > 0 ? "+" : "−"}${Math.abs(c.qty)}kg`)
    .join(" · ");
}
