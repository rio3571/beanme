"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createAccount, type CreateAccountState } from "./actions";

const initial: CreateAccountState = { error: null };

export default function AccountCreateForm() {
  const [open, setOpen] = useState(false);
  const [noLogin, setNoLogin] = useState(false);
  const [state, action, pending] = useActionState(createAccount, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setNoLogin(false);
      setOpen(false);
    }
  }, [state.ok]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-dashed border-stone-300 text-stone-500 py-3 hover:border-amber-600 hover:text-amber-700"
      >
        ＋ 거래처 추가
      </button>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-amber-600";

  return (
    <form
      ref={formRef}
      action={action}
      className="bg-white rounded-xl border border-stone-200 p-4 space-y-2.5"
    >
      <div className="font-semibold text-stone-800 mb-1">새 거래처 추가</div>
      <input name="company" placeholder="상호 (필수)" required className={inputCls} />
      <input name="contact" placeholder="담당자명" className={inputCls} />
      <input name="phone" placeholder="연락처" className={inputCls} />
      <input name="business" placeholder="사업자등록번호" className={inputCls} />
      <input name="address" placeholder="배송지 주소" className={inputCls} />

      <label className="flex items-start gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2.5 cursor-pointer">
        <input
          type="checkbox"
          name="noLogin"
          checked={noLogin}
          onChange={(e) => setNoLogin(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-amber-700"
        />
        <span className="text-sm text-stone-700">
          <b>포털 아이디 없이 등록</b>
          <span className="block text-xs text-stone-500 mt-0.5">
            전화·카톡으로 주문받는 곳. 주문은 관리자 주문 화면에서 대표님이 직접
            넣습니다. 단가·거래명세서·로스팅은 똑같이 됩니다.
          </span>
        </span>
      </label>

      {!noLogin && (
        <>
          <div className="border-t border-stone-100 my-1 pt-1.5 text-xs text-stone-400">
            로그인 정보 (거래처에 전달)
          </div>
          <input
            name="loginId"
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="로그인 아이디 — 영문/숫자 또는 이메일 (필수)"
            required
            className={inputCls}
          />
          <input
            name="password"
            placeholder="초기 비밀번호 (6자 이상, 필수)"
            required
            className={inputCls}
          />
        </>
      )}
      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-lg border border-stone-300 text-stone-600 py-2.5 text-sm"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-amber-700 text-white font-semibold py-2.5 text-sm disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}
