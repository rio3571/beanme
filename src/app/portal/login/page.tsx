"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initial: LoginState = { error: null };

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-100 px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-800">희연재 원두</h1>
          <p className="text-sm text-stone-500 mt-1">거래처 주문 포털</p>
        </div>
        <form
          action={action}
          className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              아이디 (이메일)
            </label>
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-800 outline-none focus:border-amber-600"
              placeholder="example@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1.5">
              비밀번호
            </label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-800 outline-none focus:border-amber-600"
              placeholder="비밀번호"
            />
          </div>
          {state.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-amber-700 text-white font-semibold py-3 hover:bg-amber-800 disabled:opacity-50 transition"
          >
            {pending ? "로그인 중…" : "로그인"}
          </button>
        </form>
        <p className="text-center text-xs text-stone-400 mt-5">
          계정 발급·비밀번호 문의는 희연재 원두사업부로 연락 주세요.
        </p>
      </div>
    </main>
  );
}
