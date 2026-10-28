"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrdersStatus } from "../actions";
import { fmtOrderedAt } from "./RoastingRow";

type Row = {
  id: string;
  name: string;
  createdAt: string;
  roastDate: string; // 로스팅 배치일 'YYYY-MM-DD'
  items: Record<string, number>;
};

export default function DoneHistory({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function restore(r: Row) {
    if (!confirm(`${r.name} 주문을 완료 취소하고 로스팅 목록으로 되돌릴까요?`))
      return;
    setPendingId(r.id);
    startTransition(async () => {
      // '접수'로 되돌림 (거래처 알림 메시지는 가지 않음)
      await updateOrdersStatus([r.id], "requested");
      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 rounded-xl border border-stone-200 overflow-hidden">
      <button
        onClick={() => setOpen((s) => !s)}
        className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 text-left"
      >
        <span className="font-semibold text-stone-700 text-sm">
          🗂 완료된 주문 이력 (되돌리기)
        </span>
        <span className="text-xs text-stone-500">
          최근 {rows.length}건{" "}
          <span className="text-stone-400">{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {open && (
        <div className="bg-white divide-y divide-stone-100">
          {rows.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-stone-400">
              완료된 주문이 없어요.
            </div>
          )}
          {rows.map((r) => (
            <div
              key={r.id}
              className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 ${
                pendingId === r.id ? "opacity-50" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-stone-800">
                  {r.name}
                  <span className="ml-2 text-xs font-normal text-stone-400 tabular-nums">
                    {fmtOrderedAt(r.createdAt)} 주문 · {r.roastDate.slice(5).replace("-", "/")} 로스팅
                  </span>
                </div>
                <div className="text-xs text-stone-500">
                  {Object.entries(r.items)
                    .filter(([, q]) => q > 0)
                    .map(([n, q]) => `${n} ${q}`)
                    .join(" · ") || "품목 없음"}
                </div>
              </div>
              <button
                onClick={() => restore(r)}
                disabled={pendingId === r.id}
                className="text-xs font-semibold rounded-md border border-amber-300 bg-amber-50 text-amber-800 px-2.5 py-1 hover:bg-amber-100 whitespace-nowrap"
              >
                ↩ 되돌리기
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
