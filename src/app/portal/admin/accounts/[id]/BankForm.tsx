"use client";

import { useState } from "react";
import { updateAccountBank } from "../../actions";

export default function BankForm({
  accountId,
  initial,
}: {
  accountId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await updateAccountBank(accountId, value);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
      <div className="font-semibold text-stone-800 mb-1">입금 계좌</div>
      <p className="text-xs text-stone-400 mb-2">
        이 거래처에게 안내할 입금 계좌예요. 거래명세서·주문내역에 표시돼요.
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        placeholder="예: 국민은행 123456-78-901234 (주)희연재"
        className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-amber-600 resize-none"
      />
      <div className="flex items-center gap-2 mt-2">
        {saved && (
          <span className="text-sm text-green-600 font-medium">저장됐어요 ✅</span>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="ml-auto rounded-lg bg-amber-700 text-white font-semibold px-4 py-2 text-sm disabled:opacity-50"
        >
          {saving ? "저장 중…" : "계좌 저장"}
        </button>
      </div>
    </div>
  );
}
