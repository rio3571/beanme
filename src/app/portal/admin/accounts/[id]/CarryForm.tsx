"use client";

import { useState } from "react";
import { setAccountCarry } from "../../actions";
import type { CarryItem } from "@/lib/carry";

export default function CarryForm({
  accountId,
  productNames,
  initial,
}: {
  accountId: string;
  productNames: string[];
  initial: CarryItem[];
}) {
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const n of productNames) {
      const c = initial.find((x) => x.name === n);
      o[n] = c ? String(c.qty) : "";
    }
    return o;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasPending = productNames.some((n) => {
    const c = initial.find((x) => x.name === n);
    return c && c.qty !== 0;
  });

  async function save() {
    setSaving(true);
    setSaved(false);
    const items = productNames
      .map((n) => ({ name: n, qty: Math.round(Number(vals[n]) || 0) }))
      .filter((c) => c.qty !== 0);
    const res = await setAccountCarry(accountId, items);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div
      className={`rounded-xl border p-4 mb-4 ${
        hasPending ? "border-rose-300 bg-rose-50/60" : "border-stone-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold text-stone-800">
          📦 출고 차이 (이월)
        </div>
        {saving ? (
          <span className="text-xs text-stone-400">저장 중…</span>
        ) : saved ? (
          <span className="text-xs text-green-600 font-medium">저장됐어요 ✅</span>
        ) : null}
      </div>
      <p className="text-xs text-stone-500 mb-3 leading-relaxed">
        주문과 실제 출고량이 다를 때만 적어주세요. <b>덜 보냈으면 +</b>,{" "}
        <b>더 보냈으면 −</b> (kg). 입력한 만큼 거래처에 <b>‘받아야 할 것’</b>으로
        표시돼요(금액 청구 X). 실제로 보내준 뒤 <b>0으로 비우면</b> 됩니다.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {productNames.map((n) => (
          <div
            key={n}
            className="flex items-center gap-2 bg-white rounded-lg border border-stone-200 px-3 py-2"
          >
            <span className="text-sm font-medium text-stone-700 flex-1 truncate">
              {n}
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={vals[n] ?? ""}
              onChange={(e) => setVals((p) => ({ ...p, [n]: e.target.value }))}
              placeholder="0"
              className="w-20 h-9 text-right rounded-lg border border-stone-300 px-2 text-stone-800 outline-none focus:border-rose-500"
            />
            <span className="text-xs text-stone-400">kg</span>
          </div>
        ))}
      </div>
      <div className="flex items-center mt-3">
        <button
          onClick={save}
          disabled={saving}
          className="ml-auto rounded-xl bg-rose-600 text-white font-semibold px-5 py-2 text-sm hover:bg-rose-700 disabled:opacity-50"
        >
          {saving ? "저장 중…" : "이월 저장"}
        </button>
      </div>
    </div>
  );
}
