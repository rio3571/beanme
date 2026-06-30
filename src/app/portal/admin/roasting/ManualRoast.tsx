"use client";

import { useEffect, useState } from "react";

type Entry = { id: string; account: string; qtys: Record<string, number> };

const KEY = "beanme_roast_manual";

// 예전(단일품목) 저장 형식도 읽히게 정규화
function normalize(raw: unknown): Entry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e, i): Entry | null => {
      if (!e || typeof e !== "object") return null;
      const o = e as Record<string, unknown>;
      if (o.qtys && typeof o.qtys === "object") {
        return {
          id: String(o.id ?? i),
          account: String(o.account ?? ""),
          qtys: o.qtys as Record<string, number>,
        };
      }
      // 구형: { product, qty }
      if (typeof o.product === "string") {
        return {
          id: String(o.id ?? i),
          account: String(o.account ?? ""),
          qtys: { [o.product]: Number(o.qty) || 0 },
        };
      }
      return null;
    })
    .filter((x): x is Entry => x !== null);
}

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
  const [vals, setVals] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setEntries(normalize(JSON.parse(raw)));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(KEY, JSON.stringify(entries));
  }, [entries, loaded]);

  function add() {
    const qtys: Record<string, number> = {};
    for (const p of products) {
      const q = Math.round(Number(vals[p]) || 0);
      if (q > 0) qtys[p] = q;
    }
    if (Object.keys(qtys).length === 0) return;
    setEntries((prev) => [
      ...prev,
      { id: `m${prev.length}-${account}-${Object.values(qtys).join("_")}`, account: account.trim(), qtys },
    ]);
    setAccount("");
    setVals({});
  }

  function remove(id: string) {
    setEntries((p) => p.filter((e) => e.id !== id));
  }

  // 수기 품목별 합계
  const manualByProduct: Record<string, number> = {};
  for (const e of entries) {
    for (const [p, q] of Object.entries(e.qtys)) {
      manualByProduct[p] = (manualByProduct[p] ?? 0) + q;
    }
  }

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
        전화·카톡 등 따로 들어온 주문을 거래처별로 적어두면 아래 합계에 같이 잡혀요. (이 브라우저에만 저장)
      </p>

      {/* 입력: 거래처 + 품목별 수량 한 번에 */}
      <div className="rounded-lg border border-stone-200 p-3 mb-3">
        <input
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="거래처 이름 (선택)"
          className="h-9 w-full sm:w-52 rounded-lg border border-stone-300 px-2.5 text-sm outline-none focus:border-amber-600 mb-2"
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {products.map((p) => (
            <div
              key={p}
              className="flex items-center gap-1.5 bg-stone-50 rounded-lg border border-stone-200 px-2.5 py-1.5"
            >
              <span className="text-sm text-stone-700 flex-1 truncate">{p}</span>
              <input
                type="number"
                inputMode="numeric"
                value={vals[p] ?? ""}
                onChange={(e) => setVals((v) => ({ ...v, [p]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="0"
                className="w-14 h-8 text-right rounded-md border border-stone-300 px-1.5 text-sm outline-none focus:border-amber-600"
              />
              <span className="text-xs text-stone-400">kg</span>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-2">
          <button
            onClick={add}
            className="h-9 rounded-lg bg-amber-700 text-white text-sm font-semibold px-5 hover:bg-amber-800"
          >
            추가
          </button>
        </div>
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
                {Object.entries(e.qtys)
                  .map(([p, q]) => `${p} ${q}`)
                  .join(" · ")}
                kg
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
