"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction, type PwState } from "./actions";

const initial: PwState = { error: null };

export default function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const inputCls =
    "w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-800 outline-none focus:border-amber-600";

  return (
    <form
      ref={formRef}
      action={action}
      className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3 max-w-sm"
    >
      <input
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="새 비밀번호 (6자 이상)"
        required
        className={inputCls}
      />
      <input
        name="password2"
        type="password"
        autoComplete="new-password"
        placeholder="새 비밀번호 확인"
        required
        className={inputCls}
      />
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
          비밀번호가 변경됐어요 ✅
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-amber-700 text-white font-semibold py-3 hover:bg-amber-800 disabled:opacity-50"
      >
        {pending ? "변경 중…" : "비밀번호 변경"}
      </button>
    </form>
  );
}
