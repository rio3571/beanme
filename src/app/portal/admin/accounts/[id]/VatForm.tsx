"use client";

import { useState } from "react";
import { updateAccountVat } from "../../actions";
import { VAT_MODES, VAT_LABEL, VAT_DESC, DEFAULT_VAT, type VatMode } from "@/lib/vat";

export default function VatForm({
  accountId,
  initial,
}: {
  accountId: string;
  initial: VatMode | undefined;
}) {
  const [mode, setMode] = useState<VatMode>(initial ?? DEFAULT_VAT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function choose(m: VatMode) {
    setMode(m);
    setSaving(true);
    setSaved(false);
    const res = await updateAccountVat(accountId, m);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <div className="font-semibold text-stone-800">부가세 처리</div>
        {saving ? (
          <span className="text-xs text-stone-400">저장 중…</span>
        ) : saved ? (
          <span className="text-xs text-green-600 font-medium">저장됐어요 ✅</span>
        ) : null}
      </div>
      <p className="text-xs text-stone-500 mb-3">
        이 거래처가 주문·거래내역서에서 보게 될 금액 기준이에요.
      </p>
      <div className="grid gap-2">
        {VAT_MODES.map((m) => {
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => choose(m)}
              disabled={saving}
              className={`text-left rounded-lg border px-3 py-2.5 transition ${
                active
                  ? "border-amber-600 bg-amber-50 ring-1 ring-amber-200"
                  : "border-stone-200 hover:border-stone-300"
              } disabled:opacity-60`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full border-2 ${
                    active ? "border-amber-600 bg-amber-600" : "border-stone-300"
                  }`}
                />
                <span className="font-semibold text-stone-800 text-sm">
                  {VAT_LABEL[m]}
                </span>
              </div>
              <div className="text-xs text-stone-500 mt-0.5 pl-6">
                {VAT_DESC[m]}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
