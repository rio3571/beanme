"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateAccountName } from "../../actions";

export default function NameForm({
  accountId,
  initial,
}: {
  accountId: string;
  initial: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function save() {
    setErr("");
    if (!name.trim()) {
      setErr("이름을 입력하세요.");
      return;
    }
    setSaving(true);
    const res = await updateAccountName(accountId, name);
    setSaving(false);
    if (res.ok) {
      setEditing(false);
      router.refresh();
    } else {
      setErr(res.error ?? "저장 실패");
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-stone-400 hover:text-amber-700 mt-0.5"
      >
        ✏️ 이름(상호) 수정
      </button>
    );
  }

  return (
    <div className="mt-2 bg-white rounded-xl border border-stone-200 p-3">
      <div className="text-xs font-medium text-stone-500 mb-1.5">
        거래처 이름(상호) — 주문·로스팅·명세서에 표시돼요
      </div>
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="실제 매장명 등"
          className="flex-1 h-9 rounded-lg border border-stone-300 px-2.5 text-sm text-stone-800 outline-none focus:border-amber-600"
        />
        <button
          onClick={save}
          disabled={saving}
          className="h-9 rounded-lg bg-amber-700 text-white text-sm font-semibold px-4 hover:bg-amber-800 disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
        <button
          onClick={() => {
            setName(initial);
            setEditing(false);
            setErr("");
          }}
          className="h-9 rounded-lg border border-stone-300 text-stone-600 text-sm px-3"
        >
          취소
        </button>
      </div>
      {err && <p className="text-xs text-red-500 mt-1.5">{err}</p>}
    </div>
  );
}
