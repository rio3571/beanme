"use client";

import { useEffect, useMemo, useState } from "react";
import RoastingRow from "./RoastingRow";

type OrderRow = {
  accountId: string;
  name: string;
  qtys: Record<string, number>;
  orderIds: string[];
  status: string;
};
type Entry = {
  id: string;
  account: string;
  qtys: Record<string, number>;
  roastDate: string; // 'YYYY-MM-DD' 배치일
  done: boolean;
  ts: string; // 생성 ISO
};

const KEY = "beanme_roast_manual";

function normalize(raw: unknown): Entry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e, i): Entry | null => {
      if (!e || typeof e !== "object") return null;
      const o = e as Record<string, unknown>;
      const base = {
        id: String(o.id ?? i),
        account: String(o.account ?? ""),
        roastDate: typeof o.roastDate === "string" ? o.roastDate : "",
        done: o.done === true,
        ts: typeof o.ts === "string" ? o.ts : "",
      };
      if (o.qtys && typeof o.qtys === "object") {
        return { ...base, qtys: o.qtys as Record<string, number> };
      }
      if (typeof o.product === "string") {
        return { ...base, qtys: { [o.product]: Number(o.qty) || 0 } };
      }
      return null;
    })
    .filter((x): x is Entry => x !== null);
}

function fmtDay(key: string): string {
  const [, m, d] = key.split("-");
  if (!m || !d) return "날짜미상";
  return `${Number(m)}/${Number(d)}`;
}

export default function TodayRoast({
  columns,
  dateLabel,
  batchKey,
  monthKey,
  isToday,
  rows,
}: {
  columns: string[];
  dateLabel: string;
  batchKey: string; // 현재 배치일 'YYYY-MM-DD'
  monthKey: string; // 이번 달 'YYYY-MM'
  isToday: boolean;
  rows: OrderRow[];
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [account, setAccount] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [showMonth, setShowMonth] = useState(false);
  const [month, setMonth] = useState(monthKey);

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
        id: `m${Date.now()}-${prev.length}`,
        account: account.trim(),
        qtys,
        roastDate: batchKey,
        done: false,
        ts: new Date().toISOString(),
      },
    ]);
    setAccount("");
    setVals({});
  }
  function remove(id: string) {
    setEntries((p) => p.filter((e) => e.id !== id));
  }
  function toggleDone(id: string) {
    setEntries((p) =>
      p.map((e) => (e.id === id ? { ...e, done: !e.done } : e))
    );
  }

  // 현재 배치에 속한 수기 (배치일 일치 또는 날짜없는 레거시)
  const batchEntries = entries.filter(
    (e) => e.roastDate === batchKey || !e.roastDate
  );

  // 합계 (주문 + 이 배치 수기)
  const totals = columns.map((c) => {
    const ord = rows.reduce((s, r) => s + (r.qtys[c] ?? 0), 0);
    const man = batchEntries.reduce((s, e) => s + (e.qtys[c] ?? 0), 0);
    return ord + man;
  });
  const totalKg = totals.reduce((s, v) => s + v, 0);

  // ── 월마감: 선택한 달의 수기 내역 ──
  const monthEntries = useMemo(() => {
    return entries
      .filter((e) => (e.roastDate || monthKey + "-01").startsWith(month))
      .sort((a, b) => (a.roastDate || "").localeCompare(b.roastDate || ""));
  }, [entries, month, monthKey]);
  const monthTotals = columns.map((c) =>
    monthEntries.reduce((s, e) => s + (e.qtys[c] ?? 0), 0)
  );
  const monthKg = monthTotals.reduce((s, v) => s + v, 0);
  const monthDoneKg = monthEntries
    .filter((e) => e.done)
    .reduce((s, e) => s + Object.values(e.qtys).reduce((x, y) => x + y, 0), 0);

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
    );
  }
  function clearMonth() {
    const n = monthEntries.length;
    if (n === 0) return;
    if (
      !confirm(
        `${month} 수기 내역 ${n}건을 정산 완료 처리하고 비웁니다.\n(되돌릴 수 없어요)`
      )
    )
      return;
    const ids = new Set(monthEntries.map((e) => e.id));
    setEntries((p) => p.filter((e) => !ids.has(e.id)));
  }

  return (
    <div className="mb-4">
      <div className="rounded-xl border border-amber-300 ring-1 ring-amber-200 overflow-hidden">
        <div className="flex items-baseline justify-between px-4 py-3 bg-amber-50">
          <div className="flex items-baseline gap-2">
            <h2 className="font-bold text-stone-800">{dateLabel} 로스팅</h2>
            <span className="text-xs font-bold text-amber-700 bg-amber-200 rounded-full px-2 py-0.5">
              {isToday ? "오늘" : "다음 배치"}
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
              {batchEntries.map((e) => (
                <tr
                  key={e.id}
                  className={e.done ? "bg-emerald-50/40" : "bg-amber-50/40"}
                >
                  <td className="px-3 py-2 text-sm font-semibold text-stone-800 whitespace-nowrap">
                    <span className="mr-1 text-[10px] font-bold text-amber-700 bg-amber-100 rounded px-1 py-0.5 align-middle">
                      수기
                    </span>
                    <span className={e.done ? "line-through text-stone-400" : ""}>
                      {e.account || "—"}
                    </span>
                  </td>
                  {columns.map((c, i) => (
                    <td
                      key={i}
                      className="px-2 py-2 text-center text-sm tabular-nums whitespace-nowrap"
                    >
                      {e.qtys[c] ? (
                        <span
                          className={
                            e.done
                              ? "text-stone-400"
                              : "font-bold text-stone-800"
                          }
                        >
                          {e.qtys[c]}
                        </span>
                      ) : (
                        <span className="text-stone-300">·</span>
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => toggleDone(e.id)}
                      className={`text-xs font-semibold rounded-md px-2 py-1 mr-1 ${
                        e.done
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-amber-700 text-white hover:bg-amber-800"
                      }`}
                    >
                      {e.done ? "완료됨" : "완료"}
                    </button>
                    <button
                      onClick={() => remove(e.id)}
                      className="text-xs text-stone-400 hover:text-rose-600"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && batchEntries.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="px-3 py-5 text-center text-sm text-stone-400"
                  >
                    이 배치에 아직 주문이 없어요. 아래에서 수기로 추가할 수 있어요.
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
                  onChange={(e) =>
                    setVals((v) => ({ ...v, [p]: e.target.value }))
                  }
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

      {/* ── 월마감: 이번 달 수기 내역 ── */}
      <div className="mt-3 rounded-xl border border-stone-200 overflow-hidden">
        <button
          onClick={() => setShowMonth((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 text-left"
        >
          <span className="font-semibold text-stone-700 text-sm">
            📋 월마감 · 수기 로스팅 내역
          </span>
          <span className="text-xs text-stone-500">
            {monthEntries.length}건 · {monthKg}kg{" "}
            <span className="text-stone-400">{showMonth ? "▲" : "▼"}</span>
          </span>
        </button>

        {showMonth && (
          <div className="bg-white">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shiftMonth(-1)}
                  className="h-7 w-7 rounded-md border border-stone-300 text-stone-500 hover:bg-stone-100"
                >
                  ‹
                </button>
                <span className="font-bold text-stone-800 text-sm tabular-nums">
                  {month.replace("-", ". ")}
                </span>
                <button
                  onClick={() => shiftMonth(1)}
                  className="h-7 w-7 rounded-md border border-stone-300 text-stone-500 hover:bg-stone-100"
                >
                  ›
                </button>
              </div>
              <div className="text-xs text-stone-500">
                완료 {monthDoneKg}kg / 총 {monthKg}kg
              </div>
            </div>

            {monthEntries.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-stone-400">
                이 달 수기 내역이 없어요.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-stone-200 bg-stone-50/70">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-stone-500 whitespace-nowrap">
                          날짜
                        </th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-stone-500 whitespace-nowrap">
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
                        <th className="px-2 py-2 text-center text-xs font-semibold text-stone-500 whitespace-nowrap">
                          체크
                        </th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {monthEntries.map((e) => (
                        <tr key={e.id} className={e.done ? "bg-emerald-50/30" : ""}>
                          <td className="px-3 py-2 text-xs text-stone-500 whitespace-nowrap tabular-nums">
                            {fmtDay(e.roastDate)}
                          </td>
                          <td className="px-2 py-2 text-sm text-stone-700 whitespace-nowrap">
                            {e.account || "—"}
                          </td>
                          {columns.map((c, i) => (
                            <td
                              key={i}
                              className="px-2 py-2 text-center text-sm tabular-nums whitespace-nowrap"
                            >
                              {e.qtys[c] ? (
                                <span className="font-semibold text-stone-800">
                                  {e.qtys[c]}
                                </span>
                              ) : (
                                <span className="text-stone-300">·</span>
                              )}
                            </td>
                          ))}
                          <td className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={e.done}
                              onChange={() => toggleDone(e.id)}
                              className="h-4 w-4 accent-emerald-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              onClick={() => remove(e.id)}
                              className="text-xs text-stone-400 hover:text-rose-600"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-stone-200 bg-stone-50">
                        <td
                          colSpan={2}
                          className="px-3 py-2 text-sm font-bold text-stone-700 whitespace-nowrap"
                        >
                          합계
                        </td>
                        {monthTotals.map((t, i) => (
                          <td
                            key={i}
                            className="px-2 py-2 text-center text-sm font-bold text-stone-800 tabular-nums whitespace-nowrap"
                          >
                            {t > 0 ? `${t}kg` : "·"}
                          </td>
                        ))}
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-stone-100">
                  <span className="text-xs text-stone-400">
                    체크로 완료 표시 · 정산 끝나면 비우기
                  </span>
                  <button
                    onClick={clearMonth}
                    className="text-xs font-semibold rounded-lg border border-rose-200 text-rose-600 px-3 py-1.5 hover:bg-rose-50"
                  >
                    이 달 정산 완료 · 비우기
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
