"use client";

import { useState } from "react";
import { setPrices } from "../../actions";
import { won } from "@/lib/format";

export type PriceRow = {
  product_id: string;
  name: string;
  unit: string;
  base_price: number;
  override: number | null;
};

export default function PriceForm({
  accountId,
  rows,
}: {
  accountId: string;
  rows: PriceRow[];
}) {
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const r of rows) o[r.product_id] = r.override != null ? String(r.override) : "";
    return o;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const payload = rows.map((r) => {
      const raw = (vals[r.product_id] ?? "").trim();
      return {
        product_id: r.product_id,
        unit_price: raw === "" ? null : Number(raw),
      };
    });
    const res = await setPrices(accountId, payload);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="pb-24">
      <p className="text-sm text-stone-500 mb-3">
        이 거래처의 단가를 입력하세요. <b>비워두면 기본단가</b>가 적용돼요.
      </p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.product_id}
            className="bg-white rounded-xl border border-stone-200 p-3 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-stone-800">{r.name}</div>
              <div className="text-xs text-stone-400">
                기본 {won(r.base_price)} / {r.unit}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={vals[r.product_id] ?? ""}
                onChange={(e) =>
                  setVals((p) => ({ ...p, [r.product_id]: e.target.value }))
                }
                placeholder={String(r.base_price)}
                className="w-24 h-10 text-right rounded-lg border border-stone-300 px-2 text-stone-800 outline-none focus:border-amber-600"
              />
              <span className="text-sm text-stone-400">원</span>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium">
              저장됐어요 ✅
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="ml-auto rounded-xl bg-amber-700 text-white font-semibold px-7 py-3 hover:bg-amber-800 disabled:opacity-50"
          >
            {saving ? "저장 중…" : "단가 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
