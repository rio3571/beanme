"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { issueAccountLogin } from "../../actions";

/** 아이디 없이 등록한 거래처에 나중에 포털 아이디 발급 */
export default function IssueLoginForm({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await issueAccountLogin(accountId, loginId, pw);
    setSaving(false);
    if (!res.ok) return setMsg(res.error ?? "실패");
    router.refresh();
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
      >
        ＋ 포털 아이디 발급
      </button>
    );

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-amber-300 bg-amber-50/60 p-3">
      <p className="text-xs text-stone-600">
        아이디를 만들면 거래처가 직접 로그인해서 주문할 수 있어요. 지금까지의 주문·단가·수기 입력·입금 기록은 그대로
        이어져요.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          placeholder="아이디 (영문/숫자 또는 이메일)"
          autoCapitalize="none"
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600"
        />
        <input
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="비밀번호 (6자 이상)"
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        {msg && <span className="mr-auto text-sm text-red-600">{msg}</span>}
        <button onClick={() => setOpen(false)} className="text-sm text-stone-500">
          취소
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "만드는 중…" : "아이디 만들기"}
        </button>
      </div>
    </div>
  );
}
