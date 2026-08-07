// 로스팅 수익 계산용 원가 설정 (생두단가·레시피·고정비·포장재).
// 계속 변동되는 값이라 서버(Supabase roast_config)에 저장, 수익 페이지에서 편집.

export type Bean = { name: string; price: number }; // 원/kg
export type Ingredient = { bean: string; ratio: number }; // 비율 %
export type Recipe = { name: string; lossRate: number; ingredients: Ingredient[] };

export type RoastConfig = {
  beans: Bean[];
  recipes: Recipe[];
  fixed: {
    rent: number;
    elec: number;
    gas: number;
    etc: number;
    hyShare: number; // 희연재 반영 비율 (0~1). 예: 1/3
  };
  bag: number; // 원두봉투 원/개 (1kg당 1개)
  box: number; // 20kg 박스 원/개 (kg당 = box/20)
  roastSpeed: number; // 로스팅 kg/h
  packSpeed: number; // 포장 kg/h
  processing: number; // 외주 가공비 (희연재, kg당 원) — 없으면 0
  sellPrice: Record<string, number>; // 푸르파파 판매단가 (품목→원/kg, 부가세 별도)
  oemPrice: number; // OEM(가공 위탁) 납품 단가 — 산 기준 원/kg, 부가세 포함가
};

// 캡처 기준 초기값 (2026-07)
export const DEFAULT_ROAST_CONFIG: RoastConfig = {
  beans: [
    { name: "브라질", price: 12200 },
    { name: "베트남", price: 7200 },
    { name: "수프리모", price: 13800 },
    { name: "시다모", price: 11600 },
    { name: "디카페수프리모", price: 17500 },
  ],
  recipes: [
    { name: "산", lossRate: 20, ingredients: [{ bean: "브라질", ratio: 65 }, { bean: "베트남", ratio: 35 }] },
    { name: "노을", lossRate: 20, ingredients: [{ bean: "수프리모", ratio: 65 }, { bean: "베트남", ratio: 35 }] },
    { name: "바다", lossRate: 20, ingredients: [{ bean: "시다모", ratio: 100 }] },
    { name: "디카페인", lossRate: 20, ingredients: [{ bean: "디카페수프리모", ratio: 100 }] },
  ],
  fixed: { rent: 2000000, elec: 500000, gas: 400000, etc: 400000, hyShare: 1 / 3 },
  bag: 400,
  box: 2400,
  roastSpeed: 50,
  packSpeed: 60,
  processing: 0,
  sellPrice: { 산: 17300, 바다: 16280, 노을: 18800, 디카페인: 31500 },
  oemPrice: 16000,
};

const norm = (s: string) => (s ?? "").replace(/\s/g, "").toLowerCase();

export function beanPrice(cfg: RoastConfig, name: string): number {
  const b = cfg.beans.find((x) => norm(x.name) === norm(name));
  return b ? b.price : 0;
}

/** 완성 원두 1kg 원두원가 = Σ(생두단가 × 비율) × (1 + 로스율) */
export function recipeCost(cfg: RoastConfig, recipe: Recipe): number {
  const mult = 1 + (recipe.lossRate || 0) / 100;
  let cost = 0;
  for (const ing of recipe.ingredients) {
    cost += beanPrice(cfg, ing.bean) * ((ing.ratio || 0) / 100) * mult;
  }
  return Math.round(cost);
}

/** 제품명 → 완성원두 kg당 원두원가 */
export function productCostMap(cfg: RoastConfig): Record<string, number> {
  const m: Record<string, number> = {};
  for (const r of cfg.recipes) m[r.name] = recipeCost(cfg, r);
  return m;
}

/** 포장재 kg당 (봉투 + 박스/20) */
export function packagingPerKg(cfg: RoastConfig): number {
  return Math.round((cfg.bag || 0) + (cfg.box || 0) / 20);
}

export function fixedTotal(cfg: RoastConfig): number {
  const f = cfg.fixed;
  return (f.rent || 0) + (f.elec || 0) + (f.gas || 0) + (f.etc || 0);
}

/** 희연재 월 고정비 반영액 */
export function hyFixed(cfg: RoastConfig): number {
  return Math.round(fixedTotal(cfg) * (cfg.fixed.hyShare || 0));
}

/** 저장된 부분 설정을 기본값과 병합해 온전한 config로 */
export function mergeConfig(saved: unknown): RoastConfig {
  const d = DEFAULT_ROAST_CONFIG;
  if (!saved || typeof saved !== "object") return d;
  const s = saved as Partial<RoastConfig>;
  return {
    beans: Array.isArray(s.beans) && s.beans.length ? s.beans : d.beans,
    recipes: Array.isArray(s.recipes) && s.recipes.length ? s.recipes : d.recipes,
    fixed: { ...d.fixed, ...(s.fixed ?? {}) },
    bag: typeof s.bag === "number" ? s.bag : d.bag,
    box: typeof s.box === "number" ? s.box : d.box,
    roastSpeed: typeof s.roastSpeed === "number" ? s.roastSpeed : d.roastSpeed,
    packSpeed: typeof s.packSpeed === "number" ? s.packSpeed : d.packSpeed,
    processing: typeof s.processing === "number" ? s.processing : d.processing,
    sellPrice:
      s.sellPrice && typeof s.sellPrice === "object"
        ? { ...d.sellPrice, ...s.sellPrice }
        : d.sellPrice,
    oemPrice: typeof s.oemPrice === "number" ? s.oemPrice : d.oemPrice,
  };
}
