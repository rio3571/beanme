"use client";

import { useState } from "react";
import { updateAccountPassword } from "../../actions";

export default function PasswordResetForm({ accountId }: { accountId: string }) {
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function save() {
    if (pw.length < 6) {
      setOk(false);
      setMsg("6자 이상 입력하세요.");
      return;
    }
    setSaving(true);
    setMsg(null);
    const res = await updateAccountPassword(accountId, pw);
    setSaving(false);
    if (res.ok) {
      setOk(true);
      setMsg("비밀번호가 변경됐어요 ✅");
      setPw("");
    } else {
      setOk(false);
      setMsg(res.error ?? "실패");
    }
  }

  return (
    <div className="mt-2 flex gap-2">
      <input
        type="text"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="새 비밀번호로 재설정 (6자 이상)"
        className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 outline-none focus:border-amber-600"
      />
      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-stone-700 text-white text-sm font-semibold px-4 disabled:opacity-50"
      >
        {saving ? "…" : "재설정"}
      </button>
      {msg && (
        <span
          className={`text-sm self-center ${ok ? "text-green-600" : "text-red-600"}`}
        >
          {msg}
        </span>
      )}
    </div>
  );
}
