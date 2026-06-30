"use client";

import { useEffect, useState } from "react";

type Entry = { id: string; account: string; product: string; qty: number };

const KEY = "beanme_roast_manual";

export default function ManualRoast({
  products,
  orderTotals,
}: {
  products: string[];
  orderTotals: Record<string, number>;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [account, setAccount] = useState("");
  const [product, setProduct] = useState(products[0] ?? "");
  const [qty, setQty] = useState("");

  // 최초 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setEntries(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  // 변경 시 저장
  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(entries));
  }, [entries, loaded]);

  function add() {
    const q = Math.round(Number(qty) || 0);
    if (!product || q <= 0) return;
    setEntries((p) => [
      ...p,
      {
        id: `${product}-${q}-${p.length}-${account}`,
        account: account.trim(),
        product,
        qty: q,
      },
    ]);
    setAccount("");
    setQty("");
  }

  function remove(id: string) {
    setEntries((p) => p.filter((e) => e.id !== id));
  }

  // 수기 품목별 합계
  const manualByProduct: Record<string, number> = {};
  for (const e of entries) {
    manualByProduct[e.product] = (manualByProduct[e.product] ?? 0) + e.qty;
  }

  // 모든 품목(주문 컬럼 + 수기에만 있는 품목)
  const allProducts = [
    ...products,
    ...Object.keys(manualByProduct).filter((p) => !products.includes(p)),
  ];

  const grand = allProducts.reduce(
    (s, p) => s + (orderTotals[p] ?? 0) + (manualByProduct[p] ?? 0),
    0
  );

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 mb-4">
      <div className="font-semibold text-stone-800 mb-0.5">
        ✍️ 수기 추가 (다른 경로 주문)
      </div>
      <p className="text-xs text-stone-400 mb-3">
        전화·카톡 등 따로 들어온 주문을 적어두면 아래 합계에 같이 잡혀요. (이 브라우저에만 저장)
      </p>

      {/* 입력 */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <input
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="거래처 (선택)"
          className="h-9 w-28 rounded-lg border border-stone-300 px-2 text-sm outline-none focus:border-amber-600"
        />
        <select
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          className="h-9 rounded-lg border border-stone-300 px-2 text-sm bg-white outline-none focus:border-amber-600"
        >
          {products.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="number"
          inputMode="numeric"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="kg"
          className="h-9 w-16 text-right rounded-lg border border-stone-300 px-2 text-sm outline-none focus:border-amber-600"
        />
        <button
          onClick={add}
          className="h-9 rounded-lg bg-amber-700 text-white text-sm font-semibold px-3 hover:bg-amber-800"
        >
          추가
        </button>
      </div>

      {/* 수기 목록 */}
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {entries.map((e) => (
            <span
              key={e.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 border border-stone-200 px-2.5 py-1 text-xs text-stone-700"
            >
              {e.account ? `${e.account} · ` : ""}
              <b>
                {e.product} {e.qty}kg
              </b>
              <button
                onClick={() => remove(e.id)}
                className="text-stone-400 hover:text-rose-600"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 합계 (주문 + 수기) */}
      <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-bold text-stone-800">
            오늘 합계 (주문 + 수기)
          </span>
          <span className="text-sm font-bold text-amber-700">총 {grand}kg</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {allProducts.map((p) => {
            const sum = (orderTotals[p] ?? 0) + (manualByProduct[p] ?? 0);
            if (sum <= 0) return null;
            return (
              <div
                key={p}
                className="bg-white rounded-lg border border-stone-200 px-3 py-2"
              >
                <div className="text-xs text-stone-500">{p}</div>
                <div className="text-lg font-bold text-stone-800 leading-tight">
                  {sum}
                  <span className="text-sm font-medium text-stone-400">kg</span>
                </div>
                {(manualByProduct[p] ?? 0) > 0 && (
                  <div className="text-[11px] text-amber-700">
                    수기 +{manualByProduct[p]}kg
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
