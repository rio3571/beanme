"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import RoastingRow from "./RoastingRow";
import {
  addManualRoast,
  updateManualRoast,
  removeManualRoast,
  setManualDone,
  clearManualMonth,
  migrateManualRoast,
} from "./actions";

type OrderRow = {
  accountId: string;
  name: string;
  qtys: Record<string, number>; // 남은 수량(주문−보냄)
  orderedQ: Record<string, number>; // 주문 수량
  shippedQ: Record<string, number>; // 보낸 수량
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
  amount: number; // 매출 금액(원)
  accountId?: string; // 연결된 기존 거래처(b2b_accounts) id
};
type Account = { id: string; name: string };

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
  manualEntries,
  orderMonthTotals,
  accounts,
}: {
  columns: string[];
  dateLabel: string;
  batchKey: string; // 현재 배치일 'YYYY-MM-DD'
  monthKey: string; // 이번 달 'YYYY-MM'
  isToday: boolean;
  rows: OrderRow[];
  manualEntries: Entry[]; // 서버 저장 수기 (어디서든 동일)
  orderMonthTotals: Record<string, Record<string, number>>; // 월별·품목별 포털 주문 합계
  accounts: Account[]; // 수기 입력에서 고를 기존 거래처 목록
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [account, setAccount] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState("");
  const [showMonth, setShowMonth] = useState(false);
  const [month, setMonth] = useState(monthKey);

  const entries = manualEntries;

  // 기존 localStorage 수기 → 서버로 1회 이전 (기기별 최초 진입 시)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("beanme_roast_manual");
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) {
        migrateManualRoast(arr).then(() => {
          localStorage.removeItem("beanme_roast_manual");
          router.refresh();
        });
      } else {
        localStorage.removeItem("beanme_roast_manual");
      }
    } catch {}
  }, [router]);

  const refresh = () => startTransition(() => router.refresh());

  // 입력한 거래처명이 기존 거래처와 정확히 일치하면 그 계정 (연결 대상)
  const linkedAccount = useMemo(() => {
    const acc = account.trim();
    if (!acc) return null;
    return accounts.find((a) => a.name === acc) ?? null;
  }, [account, accounts]);

  function add() {
    const qtys: Record<string, number> = {};
    for (const p of columns) {
      const q = Math.round(Number(vals[p]) || 0);
      if (q > 0) qtys[p] = q;
    }
    if (Object.keys(qtys).length === 0) return;
    const acc = account.trim();
    const amt = Math.max(0, Math.round(Number(amount) || 0));
    const accountId = accounts.find((a) => a.name === acc)?.id ?? null;
    setAccount("");
    setVals({});
    setAmount("");
    addManualRoast({
      account: acc,
      qtys,
      roastDate: batchKey,
      amount: amt,
      accountId,
    }).then(refresh);
  }
  function remove(id: string) {
    removeManualRoast(id).then(refresh);
  }
  function toggleDone(id: string) {
    const cur = entries.find((e) => e.id === id);
    setManualDone(id, !cur?.done).then(refresh);
  }

  // ── 수기 행 인라인 수정 ──
  const [editId, setEditId] = useState<string | null>(null);
  const [eAccount, setEAccount] = useState("");
  const [eVals, setEVals] = useState<Record<string, string>>({});
  const [eAmount, setEAmount] = useState("");

  function startEdit(e: Entry) {
    setEditId(e.id);
    setEAccount(e.account || "");
    const v: Record<string, string> = {};
    for (const c of columns) v[c] = e.qtys[c] ? String(e.qtys[c]) : "";
    setEVals(v);
    setEAmount(e.amount ? String(e.amount) : "");
  }
  function cancelEdit() {
    setEditId(null);
    setEAccount("");
    setEVals({});
    setEAmount("");
  }
  function saveEdit(id: string) {
    const qtys: Record<string, number> = {};
    for (const p of columns) {
      const q = Math.round(Number(eVals[p]) || 0);
      if (q > 0) qtys[p] = q;
    }
    const acc = eAccount.trim();
    const amt = Math.max(0, Math.round(Number(eAmount) || 0));
    const accountId = accounts.find((a) => a.name === acc)?.id ?? null;
    cancelEdit();
    updateManualRoast(id, { account: acc, qtys, amount: amt, accountId }).then(
      refresh
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
  // 월합산 = 포털 주문(그 달) + 수기(그 달)
  const orderMonth = orderMonthTotals[month] ?? {};
  const monthTotals = columns.map(
    (c) =>
      (orderMonth[c] ?? 0) +
      monthEntries.reduce((s, e) => s + (e.qtys[c] ?? 0), 0)
  );
  const monthKg = monthTotals.reduce((s, v) => s + v, 0);
  const orderMonthKg = Object.values(orderMonth).reduce((s, v) => s + v, 0);
  const manualMonthKg = monthEntries.reduce(
    (s, e) => s + Object.values(e.qtys).reduce((x, y) => x + y, 0),
    0
  );
  const monthDoneKg = monthEntries
    .filter((e) => e.done)
    .reduce((s, e) => s + Object.values(e.qtys).reduce((x, y) => x + y, 0), 0);
  const monthManualAmount = monthEntries.reduce((s, e) => s + (e.amount || 0), 0);

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
    clearManualMonth(month).then(refresh);
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
                  columns={columns}
                  ordered={columns.map((c) => r.orderedQ[c] ?? 0)}
                  shipped={columns.map((c) => r.shippedQ[c] ?? 0)}
                  status={r.status}
                />
              ))}
              {/* 수기 행 */}
              {batchEntries.map((e) =>
                editId === e.id ? (
                  <tr key={e.id} className="bg-sky-50/60">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <input
                        value={eAccount}
                        onChange={(ev) => setEAccount(ev.target.value)}
                        placeholder="거래처"
                        list="beanme-accounts"
                        className="h-8 w-32 rounded-md border border-stone-300 px-2 text-sm outline-none focus:border-amber-600"
                      />
                    </td>
                    {columns.map((c, i) => (
                      <td key={i} className="px-1 py-2 text-center whitespace-nowrap">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={eVals[c] ?? ""}
                          onChange={(ev) =>
                            setEVals((v) => ({ ...v, [c]: ev.target.value }))
                          }
                          onKeyDown={(ev) => ev.key === "Enter" && saveEdit(e.id)}
                          placeholder="0"
                          className="w-12 h-8 text-right rounded-md border border-stone-300 px-1 text-sm outline-none focus:border-amber-600"
                        />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={eAmount}
                          onChange={(ev) => setEAmount(ev.target.value)}
                          onKeyDown={(ev) => ev.key === "Enter" && saveEdit(e.id)}
                          placeholder="금액"
                          className="w-20 h-8 text-right rounded-md border border-stone-300 px-1.5 text-sm outline-none focus:border-amber-600"
                        />
                        <button
                          onClick={() => saveEdit(e.id)}
                          className="text-xs font-semibold rounded-md px-2 py-1.5 bg-amber-700 text-white hover:bg-amber-800"
                        >
                          저장
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs text-stone-400 hover:text-stone-600"
                        >
                          취소
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={e.id}
                    className={e.done ? "bg-emerald-50/40" : "bg-amber-50/40"}
                  >
                    <td className="px-3 py-2 text-sm font-semibold text-stone-800 whitespace-nowrap">
                      <span className="mr-1 text-[10px] font-bold text-amber-700 bg-amber-100 rounded px-1 py-0.5 align-middle">
                        수기
                      </span>
                      {e.accountId && (
                        <span
                          title="기존 거래처 연결됨"
                          className="mr-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded px-1 py-0.5 align-middle"
                        >
                          🔗
                        </span>
                      )}
                      <span className={e.done ? "line-through text-stone-400" : ""}>
                        {e.account || "—"}
                      </span>
                      {e.amount > 0 && (
                        <span className="ml-1.5 text-xs font-normal text-stone-400">
                          {e.amount.toLocaleString()}원
                        </span>
                      )}
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
                        onClick={() => startEdit(e)}
                        className="text-xs font-semibold rounded-md px-2 py-1 mr-1 bg-stone-100 text-stone-600 hover:bg-stone-200"
                      >
                        수정
                      </button>
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
                )
              )}
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
            ✍️ 수기 추가 (전화·카톡 등 다른 경로 주문 · 서버 저장 → 폰·PC 어디서든 동일)
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-0.5">
              <input
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="거래처 (선택·기존 검색)"
                list="beanme-accounts"
                className={`h-9 w-40 rounded-lg border px-2.5 text-sm outline-none focus:border-amber-600 ${
                  linkedAccount ? "border-emerald-400 bg-emerald-50/40" : "border-stone-300"
                }`}
              />
              <span className="h-3 text-[10px] leading-3 pl-0.5">
                {linkedAccount ? (
                  <span className="text-emerald-600 font-semibold">🔗 기존 거래처 연결됨</span>
                ) : account.trim() ? (
                  <span className="text-stone-400">새 거래처(연결 안 됨)</span>
                ) : null}
              </span>
            </div>
            <datalist id="beanme-accounts">
              {accounts.map((a) => (
                <option key={a.id} value={a.name} />
              ))}
            </datalist>
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
            <div className="flex items-center gap-1">
              <span className="text-xs text-stone-500">금액</span>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="0"
                className="w-24 h-9 text-right rounded-lg border border-stone-300 px-2 text-sm outline-none focus:border-amber-600"
              />
              <span className="text-xs text-stone-400">원</span>
            </div>
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
            📋 월마감 · 로스팅 합산 (주문 + 수기)
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
              <div className="text-xs text-right leading-tight">
                <div className="font-bold text-stone-700">총 {monthKg}kg</div>
                <div className="text-stone-400">
                  주문 {orderMonthKg} + 수기 {manualMonthKg}kg
                </div>
              </div>
            </div>

            {monthEntries.length === 0 && orderMonthKg === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-stone-400">
                이 달 내역이 없어요.
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
                        <th className="px-2 py-2 text-right text-xs font-semibold text-stone-500 whitespace-nowrap">
                          매출
                        </th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-stone-500 whitespace-nowrap">
                          체크
                        </th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {monthEntries.map((e) =>
                        editId === e.id ? (
                          <tr key={e.id} className="bg-sky-50/60">
                            <td className="px-3 py-2 text-xs text-stone-500 whitespace-nowrap tabular-nums">
                              {fmtDay(e.roastDate)}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              <input
                                value={eAccount}
                                onChange={(ev) => setEAccount(ev.target.value)}
                                placeholder="거래처"
                                list="beanme-accounts"
                                className="h-8 w-28 rounded-md border border-stone-300 px-2 text-sm outline-none focus:border-amber-600"
                              />
                            </td>
                            {columns.map((c, i) => (
                              <td key={i} className="px-1 py-2 text-center whitespace-nowrap">
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={eVals[c] ?? ""}
                                  onChange={(ev) =>
                                    setEVals((v) => ({ ...v, [c]: ev.target.value }))
                                  }
                                  onKeyDown={(ev) => ev.key === "Enter" && saveEdit(e.id)}
                                  placeholder="0"
                                  className="w-12 h-8 text-right rounded-md border border-stone-300 px-1 text-sm outline-none focus:border-amber-600"
                                />
                              </td>
                            ))}
                            <td className="px-2 py-2 text-right whitespace-nowrap">
                              <input
                                type="number"
                                inputMode="numeric"
                                value={eAmount}
                                onChange={(ev) => setEAmount(ev.target.value)}
                                onKeyDown={(ev) => ev.key === "Enter" && saveEdit(e.id)}
                                placeholder="금액"
                                className="w-20 h-8 text-right rounded-md border border-stone-300 px-1.5 text-sm outline-none focus:border-amber-600"
                              />
                            </td>
                            <td className="px-2 py-2 text-center whitespace-nowrap" colSpan={2}>
                              <button
                                onClick={() => saveEdit(e.id)}
                                className="text-xs font-semibold rounded-md px-2 py-1.5 bg-amber-700 text-white hover:bg-amber-800 mr-1"
                              >
                                저장
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-xs text-stone-400 hover:text-stone-600"
                              >
                                취소
                              </button>
                            </td>
                          </tr>
                        ) : (
                          <tr key={e.id} className={e.done ? "bg-emerald-50/30" : ""}>
                            <td className="px-3 py-2 text-xs text-stone-500 whitespace-nowrap tabular-nums">
                              {fmtDay(e.roastDate)}
                            </td>
                            <td className="px-2 py-2 text-sm text-stone-700 whitespace-nowrap">
                              {e.accountId && (
                                <span title="기존 거래처 연결됨" className="mr-1 align-middle">
                                  🔗
                                </span>
                              )}
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
                            <td className="px-2 py-2 text-right text-sm tabular-nums whitespace-nowrap text-stone-700">
                              {e.amount ? e.amount.toLocaleString() : "·"}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={e.done}
                                onChange={() => toggleDone(e.id)}
                                className="h-4 w-4 accent-emerald-600 cursor-pointer"
                              />
                            </td>
                            <td className="px-2 py-2 text-right whitespace-nowrap">
                              <button
                                onClick={() => startEdit(e)}
                                className="text-xs font-semibold text-stone-500 hover:text-amber-700 mr-2"
                              >
                                수정
                              </button>
                              <button
                                onClick={() => remove(e.id)}
                                className="text-xs text-stone-400 hover:text-rose-600"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                      {monthEntries.length === 0 && (
                        <tr>
                          <td
                            colSpan={columns.length + 5}
                            className="px-3 py-3 text-center text-xs text-stone-400"
                          >
                            이 달 수기 내역은 없어요 · 아래 합계는 포털 주문 기준
                          </td>
                        </tr>
                      )}
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
                        <td className="px-2 py-2 text-right text-sm font-bold text-stone-800 tabular-nums whitespace-nowrap">
                          {monthManualAmount.toLocaleString()}원
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-stone-100">
                  <span className="text-xs text-stone-400">
                    체크·비우기는 수기만 (포털 주문은 유지)
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
