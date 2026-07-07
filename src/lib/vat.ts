// 거래처별 부가세 처리 모드.
// 입력한 단가의 의미가 모드별로 다름: 별도=공급가 / 포함=부가세 포함가(최종) / 현금=현금가(최종).
// 표시·합계는 vatAmounts/displayUnit 에서 모드에 맞게 계산.
export type VatMode = "excluded" | "included" | "cash";

export const VAT_MODES: VatMode[] = ["excluded", "included", "cash"];
export const DEFAULT_VAT: VatMode = "excluded";

export const VAT_LABEL: Record<VatMode, string> = {
  excluded: "부가세 별도",
  included: "부가세 포함",
  cash: "현금 (부가세 없음)",
};

export const VAT_DESC: Record<VatMode, string> = {
  excluded: "공급가 + 부가세 10% 가 더해진 금액으로 청구",
  included: "단가에 부가세가 포함된 금액으로 표시",
  cash: "부가세 없이 공급가 그대로 (현금 거래)",
};

export function isVatMode(v: unknown): v is VatMode {
  return v === "excluded" || v === "included" || v === "cash";
}

/** 거래처 화면에 노출할 '단가'. 입력한 단가를 그대로 노출.
 *  (별도=공급가, 포함=부가세 포함가, 현금=현금가 — 모두 입력값 그대로) */
export function displayUnit(unit: number, _mode: VatMode): number {
  return Math.round(unit);
}

/** 입력단가 합계 → {공급가, 부가세, 합계}.
 *  - 별도: 합계 = 입력가 + 10%   (입력가 = 공급가)
 *  - 포함: 합계 = 입력가          (입력가 = 부가세 포함가, 공급가 = 입력가/1.1)
 *  - 현금: 합계 = 입력가, 부가세 0 */
export function vatAmounts(base: number, mode: VatMode): {
  supply: number;
  vat: number;
  total: number;
} {
  const n = Math.round(base);
  if (mode === "included") {
    const supply = Math.round(n / 1.1);
    return { supply, vat: n - supply, total: n };
  }
  if (mode === "cash") {
    return { supply: n, vat: 0, total: n };
  }
  // excluded (부가세 별도)
  const vat = Math.round(n * 0.1);
  return { supply: n, vat, total: n + vat };
}
