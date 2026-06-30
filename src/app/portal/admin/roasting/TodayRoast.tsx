"use client";

import { useEffect, useState } from "react";
import RoastingRow from "./RoastingRow";

type OrderRow = {
  accountId: string;
  name: string;
  qtys: Record<string, number>;
  orderIds: string[];
  status: string;
};
type Entry = { id: string; account: string; qtys: Record<string, number> };

const KEY = "beanme_roast_manual";

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

export default function TodayRoast({
  columns,
  dateLabel,
  rows,
}: {
  columns: string[];
  dateLabel: string;
  rows: OrderRow[];
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
    for (const p of columns) {
      const q = Math.round(Number(vals[p]) || 0);
      if (q > 0) qtys[p] = q;
    }
    if (Object.keys(qtys).length === 0) return;
    setEntries((prev) => [
      ...prev,
      {
        id: `m${prev.length}-${account}-${Object.values(qtys).join("_")}`,
        account: account.trim(),
        qtys,
      },
    ]);
    setAccount("");
    setVals({});
  }
  function remove(id: string) {
    setEntries((p) => p.filter((e) => e.id !== id));
  }

  // 합계
  const totals = columns.map((c) => {
    const ord = rows.reduce((s, r) => s + (r.qtys[c] ?? 0), 0);
    const man = entries.reduce((s, e) => s + (e.qtys[c] ?? 0), 0);
    return ord + man;
  });
  const totalKg = totals.reduce((s, v) => s + v, 0);

  return (
    <div className="rounded-xl border border-amber-300 ring-1 ring-amber-200 overflow-hidden mb-4">
      <div className="flex items-baseline justify-between px-4 py-3 bg-amber-50">
        <div className="flex items-baseline gap-2">
          <h2 className="font-bold text-stone-800">{dateLabel} 로스팅</h2>
          <span className="text-xs font-bold text-amber-700 bg-amber-200 rounded-full px-2 py-0.5">
            오늘
          </span>
        </div>
        <span className="text-sm font-bold text-stone-700">총 {totalKg}kg</span>
      </div>

      <div className="overflow-x-auto bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-t border-b border-stone-200 bg-stone-50/70">
              <th className="px-3 py-2 text-left text-xs font-semibold text-stone-500 whitespace-nowrap">
                거래처
              </th>
              {columns.map((c) => (
                <th
                  key={c}
                  className="px-2 py-2 text-center text-xs font-semibold text-stone-500 whitespace-nowrap"
                >
                  {c}
                </th>
              ))}
              <th className="px-2 py-2 text-right text-xs font-semibold text-stone-500 whitespace-nowrap">
                상태
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {/* 포털 주문 행 */}
            {rows.map((r) => (
              <RoastingRow
                key={r.accountId}
                name={r.name}
                orderIds={r.orderIds}
                qtys={columns.map((c) => r.qtys[c] ?? 0)}
                status={r.status}
              />
            ))}
            {/* 수기 행 */}
            {entries.map((e) => (
              <tr key={e.id} className="bg-amber-50/40">
                <td className="px-3 py-2 text-sm font-semibold text-stone-800 whitespace-nowrap">
                  <span className="mr-1 text-[10px] font-bold text-amber-700 bg-amber-100 rounded px-1 py-0.5 align-middle">
                    수기
                  </span>
                  {e.account || "—"}
                </td>
                {columns.map((c, i) => (
                  <td
                    key={i}
                    className="px-2 py-2 text-center text-sm tabular-nums whitespace-nowrap"
                  >
                    {e.qtys[c] ? (
                      <span className="font-bold text-stone-800">{e.qtys[c]}</span>
                    ) : (
                      <span className="text-stone-300">·</span>
                    )}
                  </td>
                ))}
                <td className="px-2 py-2 text-right">
                  <button
                    onClick={() => remove(e.id)}
                    className="text-xs text-stone-400 hover:text-rose-600"
                  >
                    ✕ 삭제
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && entries.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="px-3 py-5 text-center text-sm text-stone-400"
                >
                  오늘 로스팅할 주문이 없어요. 아래에서 수기로 추가할 수 있어요.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-stone-200 bg-stone-50">
              <td className="px-3 py-2 text-sm font-bold text-stone-700 whitespace-nowrap">
                합계
              </td>
              {totals.map((t, i) => (
                <td
                  key={i}
                  className="px-2 py-2 text-center text-sm font-bold text-stone-800 tabular-nums whitespace-nowrap"
                >
                  {t > 0 ? `${t}kg` : "·"}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 수기 추가 입력 */}
      <div className="border-t border-stone-200 bg-white p-3">
        <div className="text-xs font-semibold text-stone-500 mb-2">
          ✍️ 수기 추가 (전화·카톡 등 다른 경로 주문 · 이 브라우저에만 저장)
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="거래처 (선택)"
            className="h-9 w-32 rounded-lg border border-stone-300 px-2.5 text-sm outline-none focus:border-amber-600"
          />
          {columns.map((p) => (
            <div key={p} className="flex items-center gap-1">
              <span className="text-xs text-stone-500">{p}</span>
              <input
                type="number"
                inputMode="numeric"
                value={vals[p] ?? ""}
                onChange={(e) => setVals((v) => ({ ...v, [p]: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="0"
                className="w-14 h-9 text-right rounded-lg border border-stone-300 px-1.5 text-sm outline-none focus:border-amber-600"
              />
            </div>
          ))}
          <button
            onClick={add}
            className="h-9 rounded-lg bg-amber-700 text-white text-sm font-semibold px-5 hover:bg-amber-800"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
