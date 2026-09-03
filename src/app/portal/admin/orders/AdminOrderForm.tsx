"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrderForAccount } from "@/app/portal/order/actions";
import { won } from "@/lib/format";
import {
  displayUnit,
  vatAmounts,
  VAT_LABEL,
  DEFAULT_VAT,
  type VatMode,
} from "@/lib/vat";

export type AdminOrderAccount = {
  id: string;
  name: string;
  vat: VatMode;
  units: string[];
  hasLogin: boolean;
};

export type AdminOrderProduct = {
  id: string;
  name: string;
  unit: string;
  base_price: number;
  owner_account_id: string | null;
};

export default function AdminOrderForm({
  accounts,
  products,
  prices,
}: {
  accounts: AdminOrderAccount[];
  products: AdminOrderProduct[];
  /** { 거래처id: { 상품id: 단가 } } — 없으면 base_price */
  prices: Record<string, Record<string, number>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [unit, setUnit] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const account = accounts.find((a) => a.id === accountId) ?? null;
  const vatMode: VatMode = account?.vat ?? DEFAULT_VAT;

  const items = useMemo(() => {
    if (!account) return [];
    const pm = prices[account.id] ?? {};
    return products
      .filter((p) => !p.owner_account_id || p.owner_account_id === account.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        unit: p.unit,
        price: pm[p.id] ?? p.base_price,
      }));
  }, [account, products, prices]);

  const netTotal = items.reduce((s, it) => s + (qty[it.id] || 0) * it.price, 0);
  const amt = vatAmounts(netTotal, vatMode);
  const count = items.reduce((s, it) => s + (qty[it.id] || 0), 0);

  function reset() {
    setAccountId("");
    setQty({});
    setUnit("");
    setNote("");
    setErr(null);
  }

  function pickAccount(id: string) {
    setAccountId(id);
    setQty({});
    setUnit("");
    setErr(null);
    setDone(null);
  }

  async function submit() {
    setErr(null);
    if (!account) {
      setErr("거래처를 선택하세요.");
      return;
    }
    const chosen = items
      .filter((it) => (qty[it.id] || 0) > 0)
      .map((it) => ({ id: it.id, qty: qty[it.id] }));
    if (chosen.length === 0) {
      setErr("수량을 1개 이상 입력하세요.");
      return;
    }
    if (account.units.length > 0 && !unit) {
      setErr("층/부서를 선택하세요.");
      return;
    }
    setBusy(true);
    const res = await createOrderForAccount({
      accountId: account.id,
      items: chosen,
      note,
      unit: unit || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error ?? "주문 저장에 실패했습니다.");
      return;
    }
    setDone(`${account.name} · 주문 ${res.orderNo} 등록됨`);
    reset();
    router.refresh();
  }

  if (!open) {
    return (
      <div className="mb-4">
        {done && (
          <div className="mb-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
            ✓ {done}
          </div>
        )}
        <button
          onClick={() => {
            setOpen(true);
            setDone(null);
          }}
          className="w-full rounded-xl border border-dashed border-stone-300 text-stone-500 py-3 hover:border-amber-600 hover:text-amber-700"
        >
          ＋ 거래처 대신 주문 넣기
        </button>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-amber-600";

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4 space-y-3">
      <div className="font-semibold text-stone-800">거래처 대신 주문 넣기</div>

      <select
        value={accountId}
        onChange={(e) => pickAccount(e.target.value)}
        className={inputCls}
      >
        <option value="">거래처 선택…</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {a.hasLogin ? "" : " (아이디 없음)"}
          </option>
        ))}
      </select>

      {account && account.units.length > 0 && (
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className={inputCls}
        >
          <option value="">층/부서 선택…</option>
          {account.units.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      )}

      {account && (
        <>
          <div className="text-xs text-stone-400">
            단가는 이 거래처에 설정된 값이 자동 적용됩니다 · 부가세{" "}
            {VAT_LABEL[vatMode]}
          </div>

          <div className="space-y-1.5">
            {items.length === 0 && (
              <p className="text-sm text-stone-400 py-3 text-center">
                판매 품목이 없습니다.
              </p>
            )}
            {items.map((it) => {
              const q = qty[it.id] || 0;
              return (
                <div
                  key={it.id}
                  className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-stone-800 truncate">
                      {it.name}
                    </div>
                    <div className="text-xs text-stone-500">
                      {won(displayUnit(it.price, vatMode))} / {it.unit}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setQty((p) => ({ ...p, [it.id]: Math.max(0, q - 1) }))
                    }
                    className="w-8 h-8 rounded-lg border border-stone-300 text-stone-600 text-lg leading-none"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={q === 0 ? "" : q}
                    placeholder="0"
                    onChange={(e) =>
                      setQty((p) => ({
                        ...p,
                        [it.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                      }))
                    }
                    className="w-14 text-center rounded-lg border border-stone-300 py-1.5 text-sm outline-none focus:border-amber-600"
                  />
                  <button
                    type="button"
                    onClick={() => setQty((p) => ({ ...p, [it.id]: q + 1 }))}
                    className="w-8 h-8 rounded-lg border border-stone-300 text-stone-600 text-lg leading-none"
                  >
                    ＋
                  </button>
                </div>
              );
            })}
          </div>

          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="요청사항 (선택)"
            className={inputCls}
          />

          <div className="flex items-center justify-between rounded-lg bg-stone-50 px-3 py-2.5">
            <span className="text-sm text-stone-600">
              총 {count}개 · {VAT_LABEL[vatMode]}
            </span>
            <span className="text-base font-bold text-stone-800">
              {won(amt.total)}
            </span>
          </div>
        </>
      )}

      {err && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="flex-1 rounded-lg border border-stone-300 text-stone-600 py-2.5 text-sm"
        >
          닫기
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !account || count === 0}
          className="flex-1 rounded-lg bg-amber-700 text-white font-semibold py-2.5 text-sm disabled:opacity-50"
        >
          {busy ? "등록 중…" : "주문 등록"}
        </button>
      </div>
    </div>
  );
}
