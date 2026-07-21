"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrdersStatus, setAccountShipped } from "../actions";

const BTNS = [
  { v: "requested", l: "접수" },
  { v: "confirmed", l: "확인" },
  { v: "done", l: "완료" },
];

export default function RoastingRow({
  name,
  orderIds,
  columns,
  ordered,
  shipped,
  status,
}: {
  name: string;
  orderIds: string[];
  columns: string[];
  ordered: number[]; // 품목별 주문 수량
  shipped: number[]; // 품목별 보낸 수량
  status: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  const remaining = ordered.map((o, i) => Math.max(0, o - (shipped[i] ?? 0)));
  const anyShipped = shipped.some((s) => s > 0);

  const onClick = (v: string) => {
    if (pending) return;
    setValue(v);
    startTransition(async () => {
      await updateOrdersStatus(orderIds, v);
      // 완료 시 서버 재검증으로 이 행은 목록에서 사라짐
    });
  };

  // ── 출고 기록(보낸 수량) 편집 ──
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function startShip() {
    const v: Record<string, string> = {};
    columns.forEach((c, i) => {
      v[c] = shipped[i] ? String(shipped[i]) : "";
    });
    setVals(v);
    setOpen(true);
  }
  async function saveShip() {
    setSaving(true);
    const rec: Record<string, number> = {};
    columns.forEach((c, i) => {
      if (ordered[i] > 0) rec[c] = Math.max(0, Math.round(Number(vals[c]) || 0));
    });
    await setAccountShipped(orderIds, rec);
    setSaving(false);
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <>
      <tr className={pending ? "opacity-50" : ""}>
        <td className="px-3 py-2 text-sm font-semibold text-stone-800 whitespace-nowrap">
          {name}
          {anyShipped && (
            <span className="ml-1.5 text-[10px] font-bold text-sky-700 bg-sky-100 rounded px-1 py-0.5 align-middle">
              일부출고
            </span>
          )}
        </td>
        {remaining.map((q, i) => (
          <td
            key={i}
            className="px-2 py-2 text-center text-sm tabular-nums whitespace-nowrap"
            title={
              ordered[i] > 0
                ? `주문 ${ordered[i]} · 보냄 ${shipped[i] ?? 0} · 남음 ${q}`
                : undefined
            }
          >
            {q > 0 ? (
              <span className="font-bold text-stone-800">{q}</span>
            ) : ordered[i] > 0 ? (
              <span className="text-emerald-500" title="다 보냄">
                ✓
              </span>
            ) : (
              <span className="text-stone-300">·</span>
            )}
          </td>
        ))}
        <td className="px-2 py-2">
          <div className="flex gap-1 justify-end items-center">
            <button
              onClick={() => (open ? setOpen(false) : startShip())}
              disabled={pending}
              className={`text-xs font-medium px-2 py-1 rounded-md border whitespace-nowrap transition-colors ${
                anyShipped
                  ? "bg-sky-50 border-sky-300 text-sky-700"
                  : "bg-white border-stone-300 text-stone-500 hover:border-stone-400"
              }`}
            >
              📦 출고
            </button>
            {BTNS.map((b) => {
              const active = value === b.v;
              return (
                <button
                  key={b.v}
                  onClick={() => onClick(b.v)}
                  disabled={pending}
                  className={`text-xs font-medium px-2.5 py-1 rounded-md border whitespace-nowrap transition-colors ${
                    active
                      ? b.v === "done"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-amber-600 border-amber-600 text-white"
                      : "bg-white border-stone-300 text-stone-500 hover:border-stone-400"
                  }`}
                >
                  {b.l}
                </button>
              );
            })}
          </div>
        </td>
      </tr>

      {open && (
        <tr className="bg-sky-50/60">
          <td colSpan={columns.length + 2} className="px-3 py-3">
            <div className="text-xs text-stone-600 mb-2">
              📦 <b>{name}</b> · 실제 <b>보낸 수량</b>을 품목별로 적어주세요. 로스팅
              목록엔 <b>남은 수량(주문 − 보냄)</b>만 표시됩니다.
            </div>
            <div className="flex flex-wrap items-end gap-2">
              {columns.map((c, i) =>
                ordered[i] > 0 ? (
                  <div key={c} className="flex flex-col items-center gap-0.5">
                    <span className="text-[11px] text-stone-500">
                      {c}{" "}
                      <span className="text-stone-400">(주문 {ordered[i]})</span>
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={vals[c] ?? ""}
                      onChange={(e) =>
                        setVals((v) => ({ ...v, [c]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && saveShip()}
                      placeholder="0"
                      className="w-16 h-9 text-right rounded-lg border border-stone-300 px-1.5 text-sm outline-none focus:border-sky-500"
                    />
                  </div>
                ) : null
              )}
              <button
                onClick={saveShip}
                disabled={saving}
                className="h-9 rounded-lg bg-sky-600 text-white text-sm font-semibold px-4 hover:bg-sky-700 disabled:opacity-50"
              >
                {saving ? "저장 중…" : "저장"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="h-9 text-sm text-stone-400 hover:text-stone-600 px-2"
              >
                취소
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
