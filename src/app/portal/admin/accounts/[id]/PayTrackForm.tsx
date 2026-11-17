"use client";

import { useState } from "react";
import { setAccountPayTrack } from "../../actions";

export default function PayTrackForm({
  accountId,
  initial,
}: {
  accountId: string;
  initial: boolean;
}) {
  const [on, setOn] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function toggle(next: boolean) {
    setOn(next);
    setSaving(true);
    const res = await setAccountPayTrack(accountId, next);
    setSaving(false);
    if (!res.ok) {
      setOn(!next);
      alert(res.error ?? "저장에 실패했어요.");
    }
  }

  return (
    <label className="flex items-center justify-between gap-3 bg-white rounded-xl border border-stone-200 px-4 py-3 mb-3 cursor-pointer">
      <span>
        <span className="font-semibold text-stone-800">💳 입금 관리 적용</span>
        <span className="block text-xs text-stone-500">
          켜면 이 거래처의 미입금·잔액을 관리해요 (기본: 미적용)
        </span>
      </span>
      <span className="flex items-center gap-2">
        {saving && <span className="text-xs text-stone-400">저장 중…</span>}
        <input
          type="checkbox"
          checked={on}
          disabled={saving}
          onChange={(e) => toggle(e.target.checked)}
          className="w-5 h-5 accent-amber-600"
        />
      </span>
    </label>
  );
}
