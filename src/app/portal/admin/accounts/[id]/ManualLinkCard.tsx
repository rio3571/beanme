"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { linkManualToAccount } from "@/app/portal/admin/roasting/actions";

export type LinkedManual = { id: string; date: string; summary: string; amount: number };

/** 거래처 상세: 이 거래처에 연결된 로스팅 수기 입력 현황 + 같은 이름의 미연결 수기 한 번에 연결 */
export default function ManualLinkCard({
  accountId,
  linkedCount,
  unlinkedCount,
  recent,
}: {
  accountId: string;
  linkedCount: number;
  unlinkedCount: number;
  recent: LinkedManual[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function link() {
    if (!confirm(`이름이 같은 로스팅 수기 입력 ${unlinkedCount}건을 이 거래처에 연결할까요?`)) return;
    setBusy(true);
    setMsg("");
    const r = await linkManualToAccount(accountId);
    setBusy(false);
    setMsg(r.ok ? `${r.linked ?? 0}건을 연결했어요.` : "연결에 실패했습니다.");
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-bold text-stone-800">로스팅 수기 입력 연동</div>
        <span className="text-xs font-semibold text-emerald-600">연결됨 {linkedCount}건</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-stone-500">
        로스팅 화면에서 수기로 넣을 때 거래처명을 이 이름 그대로 고르면 자동으로 연결되고, 연결된 수기 입력은 아래 거래내역서(월별)에 품목·단가와 함께 자동으로 들어가요. 간이명세서에서 매번 가져올 필요가 없어요.
      </p>

      {unlinkedCount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
          <span className="flex-1 text-xs text-amber-800">
            이름이 같은데 아직 연결되지 않은 수기 입력이 <b>{unlinkedCount}건</b> 있어요.
          </span>
          <button
            onClick={link}
            disabled={busy}
            className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            {busy ? "연결 중…" : "모두 연결하기"}
          </button>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-emerald-700">{msg}</p>}

      {recent.length > 0 && (
        <ul className="mt-3 divide-y divide-stone-100 text-xs text-stone-600">
          {recent.map((m) => (
            <li key={m.id} className="flex items-center gap-2 py-1.5">
              <span className="w-[78px] shrink-0 text-stone-400">{m.date}</span>
              <span className="min-w-0 flex-1 truncate">{m.summary}</span>
              <span className="shrink-0 font-medium">{m.amount.toLocaleString("ko-KR")}원</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
