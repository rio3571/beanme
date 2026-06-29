"use client";

import { useState } from "react";
import { setAccountCarry } from "../actions";
import type { CarryItem } from "@/lib/carry";

export default function DeliveryAdjust({
  accountId,
  productNames,
  currentCarry,
}: {
  accountId: string;
  productNames: string[]; // 이 주문의 품목들
  currentCarry: CarryItem[]; // 거래처의 현재 이월(전체)
}) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const n of productNames) {
      const c = currentCarry.find((x) => x.name === n);
      o[n] = c ? String(c.qty) : "";
    }
    return o;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const pendingHere = productNames.filter((n) => {
    const c = currentCarry.find((x) => x.name === n);
    return c && c.qty !== 0;
  });

  async function save() {
    setSaving(true);
    setSaved(false);
    // 이 주문 품목 외의 이월은 그대로 보존
    const others = currentCarry.filter((c) => !productNames.includes(c.name));
    const mine = productNames
      .map((n) => ({ name: n, qty: Math.round(Number(vals[n]) || 0) }))
      .filter((c) => c.qty !== 0);
    const res = await setAccountCarry(accountId, [...others, ...mine]);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`text-xs font-semibold rounded-lg px-2.5 py-1 border ${
          pendingHere.length
            ? "bg-rose-50 border-rose-300 text-rose-700"
            : "bg-stone-50 border-stone-200 text-stone-500 hover:border-stone-300"
        }`}
      >
        📦 출고 차이{pendingHere.length ? ` · 이월 있음` : ""}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/50 p-3">
          <p className="text-xs text-stone-600 mb-2 leading-relaxed">
            주문과 실제 출고량이 다를 때만 적어주세요. <b>덜 보냈으면 +</b>,{" "}
            <b>더 보냈으면 −</b> (kg). 입력한 만큼 <b>다음 주문에 자동 합산</b>돼요.
          </p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {productNames.map((n) => (
              <div key={n} className="flex items-center gap-2">
                <span className="text-sm text-stone-700 w-16 shrink-0 truncate">
                  {n}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={vals[n] ?? ""}
                  onChange={(e) =>
                    setVals((p) => ({ ...p, [n]: e.target.value }))
                  }
                  placeholder="0"
                  className="w-20 h-8 text-right rounded-lg border border-stone-300 px-2 text-sm outline-none focus:border-rose-500"
                />
                <span className="text-xs text-stone-400">kg</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-2.5">
            {saved && (
              <span className="text-xs text-green-600 font-medium">
                저장됐어요 ✅
              </span>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="ml-auto text-xs font-semibold rounded-lg bg-rose-600 text-white px-3 py-1.5 hover:bg-rose-700 disabled:opacity-50"
            >
              {saving ? "저장 중…" : "이월 저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
