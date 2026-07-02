"use client";

import { useState, useTransition } from "react";
import { issueTaxInvoice, type IssueResult } from "./actions";

export default function IssueTaxButton({
  accountId,
  ym,
}: {
  accountId: string;
  ym: string;
}) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<IssueResult | null>(null);

  function go() {
    if (
      !confirm(
        `${ym} 내역으로 세금계산서를 발행할까요?\n(지금은 테스트베드 — 실제 국세청 전송/과금 없음)`
      )
    )
      return;
    setRes(null);
    start(async () => {
      const r = await issueTaxInvoice(accountId, ym);
      setRes(r);
    });
  }

  return (
    <div className="mb-3">
      <button
        onClick={go}
        disabled={pending}
        className="rounded-xl bg-indigo-600 text-white font-semibold px-5 py-2.5 text-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "발행 중…" : "🧾 세금계산서 발행 (테스트)"}
      </button>
      {res && (
        <div
          className={`mt-2 rounded-lg px-3 py-2 text-sm ${
            res.ok
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {res.ok ? "✅ " : "⚠️ "}
          {res.message}
          {res.ok && res.mgtKey && (
            <span className="block text-xs text-stone-500 mt-0.5">
              문서번호 {res.mgtKey}
              {res.test ? " · 테스트베드" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
