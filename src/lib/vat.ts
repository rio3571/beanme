// 거래처별 부가세 처리 모드.
// 저장된 단가/금액은 항상 '공급가(net)' 기준. 모드는 표시·합계 계산에만 적용.
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

/** 거래처 화면에 노출할 '단가' (입력단가 = 공급가 net 기준).
 *  - 포함: 부가세 포함가(net×1.1)로 노출
 *  - 별도/현금: 공급가 그대로 노출 */
export function displayUnit(net: number, mode: VatMode): number {
  return mode === "included" ? Math.round(net * 1.1) : Math.round(net);
}

/** 공급가 합계(net total) → {공급가, 부가세, 합계}. 현금은 부가세 0. */
export function vatAmounts(netTotal: number, mode: VatMode): {
  supply: number;
  vat: number;
  total: number;
} {
  const supply = Math.round(netTotal);
  const vat = mode === "cash" ? 0 : Math.round(supply * 0.1);
  return { supply, vat, total: supply + vat };
}
