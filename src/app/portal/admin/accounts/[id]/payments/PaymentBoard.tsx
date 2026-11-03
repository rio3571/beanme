"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BillItem, Payment } from "@/lib/payments";
import { recordPayment, deletePayment, unlinkItem } from "./actions";

const won = (n: number) => n.toLocaleString("ko-KR") + "원";
const keyOf = (it: BillItem) => `${it.kind}:${it.id}`;

function todayKst(): string {
  const k = new Date(Date.now() + 9 * 3600 * 1000);
  return k.toISOString().slice(0, 10);
}

/** 금액이 딱 맞는 조합 찾기 (오래된 건 우선, 건수가 많으면 앞쪽 24건만) */
function exactMatch(items: BillItem[], target: number): Set<string> | null {
  const list = items.slice(0, 24);
  const suffix: number[] = [];
  for (let i = list.length - 1, s = 0; i >= 0; i--) suffix[i] = s += list[i].amount;
  const picked: number[] = [];
  let steps = 0;
  function dfs(i: number, rest: number): boolean {
    if (rest === 0) return true;
    if (i >= list.length || rest < 0 || suffix[i] < rest || ++steps > 200000) return false;
    picked.push(i);
    if (dfs(i + 1, rest - list[i].amount)) return true;
    picked.pop();
    return dfs(i + 1, rest);
  }
  if (target <= 0 || !dfs(0, target)) return null;
  return new Set(picked.map((i) => keyOf(list[i])));
}

export default function PaymentBoard({
  accountId,
  unpaid,
  payments,
  unpaidTotal,
  credit,
}: {
  accountId: string;
  unpaid: BillItem[];
  payments: Payment[];
  unpaidTotal: number;
  credit: number;
}) {
  const router = useRouter();
  const [paidOn, setPaidOn] = useState(todayKst);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [openPay, setOpenPay] = useState<string | null>(null);

  const amt = Math.round(Number(amount) || 0);
  const available = amt + credit;
  const selectedSum = useMemo(
    () => unpaid.filter((it) => checked.has(keyOf(it))).reduce((s, it) => s + it.amount, 0),
    [unpaid, checked]
  );
  const left = available - selectedSum;

  function autoMatch(value = amount) {
    const a = Math.round(Number(value) || 0) + credit;
    if (a <= 0) {
      setChecked(new Set());
      setHint("");
      return;
    }
    const exact = exactMatch(unpaid, a);
    if (exact) {
      setChecked(exact);
      setHint(`입금액과 딱 맞는 ${exact.size}건을 찾았어요.`);
      return;
    }
    // 딱 맞는 조합이 없으면 오래된 순으로 채움
    const next = new Set<string>();
    let sum = 0;
    for (const it of unpaid) {
      if (sum + it.amount > a) break;
      sum += it.amount;
      next.add(keyOf(it));
    }
    setChecked(next);
    setHint(
      next.size
        ? `딱 맞는 조합이 없어 오래된 순으로 ${next.size}건을 골랐어요. 남는 ${won(a - sum)}은 잔액으로 남아요.`
        : "입금액이 가장 오래된 건보다 적어요. 저장하면 잔액으로 남아 다음 입금 때 합쳐져요."
    );
  }

  function toggle(k: string) {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
    setHint("");
  }

  async function save() {
    setErr("");
    const chosen = unpaid.filter((it) => checked.has(keyOf(it)));
    if (left < 0) return setErr("선택한 금액이 입금액보다 많아요.");
    if (amt === 0 && chosen.length === 0) return setErr("입금액을 입력하세요.");
    const msg =
      `${paidOn} 입금 ${won(amt)}` +
      (chosen.length ? `\n${chosen.length}건(${won(selectedSum)})을 입금 처리` : "") +
      (left > 0 ? `\n남는 ${won(left)}은 잔액으로 보관` : "") +
      "\n\n저장할까요?";
    if (!confirm(msg)) return;
    setBusy(true);
    const r = await recordPayment(accountId, {
      paidOn,
      amount: amt,
      memo,
      orderIds: chosen.filter((c) => c.kind === "order").map((c) => c.id),
      manualIds: chosen.filter((c) => c.kind === "manual").map((c) => c.id),
    });
    setBusy(false);
    if (!r.ok) return setErr(r.error ?? "저장에 실패했습니다.");
    setAmount("");
    setMemo("");
    setChecked(new Set());
    setHint("");
    router.refresh();
  }

  async function removePayment(p: Payment) {
    if (!confirm(`${p.paidOn} 입금 ${won(p.amount)} 기록을 지울까요?\n이 입금으로 처리된 ${p.items.length}건은 다시 미입금으로 돌아가요.`)) return;
    setBusy(true);
    const r = await deletePayment(accountId, p.id);
    setBusy(false);
    if (!r.ok) alert(r.error ?? "삭제 실패");
    router.refresh();
  }

  async function unlink(it: BillItem) {
    if (!confirm(`${it.date} ${won(it.amount)} 건을 미입금으로 되돌릴까요?\n(그 금액은 잔액으로 남아요)`)) return;
    setBusy(true);
    const r = await unlinkItem(accountId, it.kind, it.id);
    setBusy(false);
    if (!r.ok) alert(r.error ?? "실패");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* 요약 */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-xl border p-4 ${unpaid.length ? "border-rose-300 bg-rose-50" : "border-stone-200 bg-white"}`}>
          <div className="text-xs font-semibold text-stone-500">미입금</div>
          <div className={`mt-1 text-xl font-bold ${unpaid.length ? "text-rose-700" : "text-stone-800"}`}>{won(unpaidTotal)}</div>
          <div className="text-xs text-stone-500">{unpaid.length}건</div>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="text-xs font-semibold text-stone-500">{credit < 0 ? "부족액" : "잔액 (미배정 입금)"}</div>
          <div className={`mt-1 text-xl font-bold ${credit < 0 ? "text-rose-700" : credit > 0 ? "text-emerald-700" : "text-stone-800"}`}>
            {won(Math.abs(credit))}
          </div>
          <div className="text-xs text-stone-500">
            {credit > 0 ? "다음 입금 때 자동으로 합쳐져요" : credit < 0 ? "처리된 건보다 입금이 적어요" : "남은 금액 없음"}
          </div>
        </div>
      </div>

      {/* 입금 등록 */}
      <div className="rounded-xl border border-amber-300 bg-white p-4">
        <div className="font-semibold text-stone-800">입금 등록</div>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          받은 금액을 넣으면 미입금 목록에서 금액이 딱 맞는 건을 자동으로 골라요. 맞는 조합이 없으면 오래된 순으로 고르고, 남는 돈은 잔액으로 보관했다가 다음 입금 때 합쳐요. 체크는 직접 바꿔도 돼요.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr_1fr]">
          <label className="text-xs font-semibold text-stone-600">
            입금일
            <input
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-stone-300 px-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-stone-600">
            입금액 (원)
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                autoMatch(e.target.value);
              }}
              placeholder="예: 330000"
              className="mt-1 h-10 w-full rounded-lg border border-stone-300 px-3 text-right text-sm font-semibold"
            />
          </label>
          <label className="text-xs font-semibold text-stone-600">
            메모 <span className="font-normal text-stone-400">(입금자명 등)</span>
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm"
            />
          </label>
        </div>
        {hint && <p className="mt-2 text-xs text-amber-800">{hint}</p>}
      </div>

      {/* 미입금 목록 */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="font-semibold text-stone-800">미입금 목록 <span className="text-sm font-normal text-stone-400">오래된 순</span></div>
          {unpaid.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setChecked(checked.size === unpaid.length ? new Set() : new Set(unpaid.map(keyOf)));
                setHint("");
              }}
              className="text-xs font-semibold text-stone-500 hover:text-stone-800"
            >
              {checked.size === unpaid.length ? "전체 해제" : "전체 선택"}
            </button>
          )}
        </div>
        {unpaid.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">미입금 건이 없어요.</p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100">
            {unpaid.map((it) => {
              const k = keyOf(it);
              const on = checked.has(k);
              return (
                <li key={k}>
                  <label className={`flex cursor-pointer items-center gap-3 px-1 py-2.5 text-sm ${on ? "bg-amber-50" : ""}`}>
                    <input type="checkbox" checked={on} onChange={() => toggle(k)} className="h-4 w-4 shrink-0" />
                    <span className="w-[84px] shrink-0 text-stone-500">{it.date}</span>
                    <span className="min-w-0 flex-1 truncate text-stone-700">{it.label}</span>
                    <span className="shrink-0 font-semibold text-stone-800">{won(it.amount)}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        {/* 정산 */}
        <div className="mt-3 space-y-1 rounded-lg bg-stone-50 px-3 py-2.5 text-sm">
          <div className="flex justify-between"><span className="text-stone-500">입금액</span><span>{won(amt)}</span></div>
          {credit !== 0 && (
            <div className="flex justify-between"><span className="text-stone-500">기존 잔액</span><span>{credit > 0 ? "+" : "−"}{won(Math.abs(credit))}</span></div>
          )}
          <div className="flex justify-between"><span className="text-stone-500">선택 {checked.size}건</span><span>−{won(selectedSum)}</span></div>
          <div className={`flex justify-between border-t border-stone-200 pt-1 font-bold ${left < 0 ? "text-rose-700" : left > 0 ? "text-emerald-700" : "text-stone-800"}`}>
            <span>{left < 0 ? "부족" : left > 0 ? "남는 금액 → 잔액" : "딱 맞음"}</span>
            <span>{won(Math.abs(left))}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-rose-600">{err}</span>
          <button
            type="button"
            onClick={save}
            disabled={busy || left < 0 || (amt === 0 && checked.size === 0)}
            className="rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-40"
          >
            {busy ? "저장 중…" : amt === 0 && checked.size > 0 ? "잔액으로 입금 처리" : "입금 저장"}
          </button>
        </div>
      </div>

      {/* 입금 이력 */}
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="font-semibold text-stone-800">입금 이력</div>
        {payments.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400">아직 등록된 입금이 없어요.</p>
        ) : (
          <ul className="mt-2 divide-y divide-stone-100">
            {payments.map((p) => {
              const used = p.items.reduce((s, it) => s + it.amount, 0);
              const open = openPay === p.id;
              return (
                <li key={p.id} className="py-2.5">
                  <button
                    type="button"
                    onClick={() => setOpenPay(open ? null : p.id)}
                    className="flex w-full items-center gap-3 text-left text-sm"
                  >
                    <span className="w-[84px] shrink-0 text-stone-500">{p.paidOn}</span>
                    <span className="min-w-0 flex-1 truncate text-stone-600">
                      {p.items.length}건 처리{p.memo ? ` · ${p.memo}` : ""}
                    </span>
                    <span className="shrink-0 font-semibold text-emerald-700">{won(p.amount)}</span>
                    <span className="shrink-0 text-xs text-stone-400">{open ? "▲" : "▼"}</span>
                  </button>
                  {open && (
                    <div className="mt-2 rounded-lg bg-stone-50 px-3 py-2">
                      {p.items.length === 0 ? (
                        <p className="text-xs text-stone-400">처리된 건 없음 (전액 잔액)</p>
                      ) : (
                        <ul className="space-y-1">
                          {p.items.map((it) => (
                            <li key={keyOf(it)} className="flex items-center gap-2 text-xs text-stone-600">
                              <span className="w-[78px] shrink-0 text-stone-400">{it.date}</span>
                              <span className="min-w-0 flex-1 truncate">{it.label}</span>
                              <span className="shrink-0">{won(it.amount)}</span>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => unlink(it)}
                                className="shrink-0 rounded border border-stone-300 bg-white px-1.5 py-0.5 text-[11px] text-stone-500 hover:bg-stone-100"
                              >
                                되돌리기
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-stone-500">
                          처리 {won(used)}
                          {p.amount !== used && ` · 차액 ${p.amount > used ? "+" : "−"}${won(Math.abs(p.amount - used))}`}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => removePayment(p)}
                          className="font-semibold text-rose-600 hover:text-rose-800"
                        >
                          입금 기록 삭제
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
