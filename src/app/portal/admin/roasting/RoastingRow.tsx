"use client";

import { useState, useTransition } from "react";
import { updateOrdersStatus } from "../actions";

const BTNS = [
  { v: "requested", l: "접수" },
  { v: "confirmed", l: "확인" },
  { v: "done", l: "완료" },
];

export default function RoastingRow({
  name,
  orderIds,
  qtys,
  status,
}: {
  name: string;
  orderIds: string[];
  qtys: number[];
  status: string;
}) {
  const [value, setValue] = useState(status);
  const [pending, startTransition] = useTransition();

  const onClick = (v: string) => {
    if (pending) return;
    setValue(v);
    startTransition(async () => {
      await updateOrdersStatus(orderIds, v);
      // 완료 시 서버 재검증으로 이 행은 목록에서 사라짐
    });
  };

  return (
    <tr className={pending ? "opacity-50" : ""}>
      <td className="px-3 py-2 text-sm font-semibold text-stone-800 whitespace-nowrap">
        {name}
      </td>
      {qtys.map((q, i) => (
        <td
          key={i}
          className="px-2 py-2 text-center text-sm tabular-nums whitespace-nowrap"
        >
          {q > 0 ? (
            <span className="font-bold text-stone-800">{q}</span>
          ) : (
            <span className="text-stone-300">·</span>
          )}
        </td>
      ))}
      <td className="px-2 py-2">
        <div className="flex gap-1 justify-end">
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
  );
}
