"use client";

import { useState } from "react";
import { reportOrderCarry } from "../order/actions";
import type { CarryItem } from "@/lib/carry";

export default function ReportDelivery({
  orderId,
  productNames,
  currentCarry,
}: {
  orderId: string;
  productNames: string[];
  currentCarry: CarryItem[];
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

  async function save() {
    setSaving(true);
    setSaved(false);
    const items = productNames
      .map((n) => ({ name: n, qty: Math.round(Number(vals[n]) || 0) }))
      .filter((c) => c.qty !== 0);
    const res = await reportOrderCarry(orderId, items);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setOpen(false);
      }, 1500);
    }
  }

  return (
    <div className="mt-2 border-t border-stone-100 pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-rose-600 hover:text-rose-700"
      >
        📦 받은 수량이 달라요 (신고)
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-rose-200 bg-rose-50/60 p-3">
          <p className="text-xs text-stone-600 mb-2 leading-relaxed">
            실제 받은 양이 주문과 다를 때만 적어주세요. <b>덜 받았으면 +</b>,{" "}
            <b>더 받았으면 −</b> (kg). 적은 만큼 <b>다음 주문에 자동으로 합산</b>돼요.
          </p>
          <div className="grid gap-1.5">
            {productNames.map((n) => (
              <div key={n} className="flex items-center gap-2">
                <span className="text-sm text-stone-700 flex-1 truncate">{n}</span>
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
                신고됐어요 ✅
              </span>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="ml-auto text-xs font-semibold rounded-lg bg-rose-600 text-white px-3 py-1.5 hover:bg-rose-700 disabled:opacity-50"
            >
              {saving ? "저장 중…" : "신고하기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
