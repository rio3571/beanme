"use client";

import { useState, useTransition } from "react";
import { updateOrderStatus } from "../actions";

const OPTIONS = [
  { v: "requested", l: "접수" },
  { v: "confirmed", l: "확인" },
  { v: "shipped", l: "출고" },
  { v: "done", l: "완료" },
  { v: "canceled", l: "취소" },
];

export default function StatusSelect({
  orderId,
  initial,
}: {
  orderId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        startTransition(async () => {
          await updateOrderStatus(orderId, next);
        });
      }}
      className="text-xs font-medium px-2 py-1.5 rounded-lg border border-stone-300 bg-white text-stone-700 outline-none focus:border-amber-600 disabled:opacity-50"
    >
      {OPTIONS.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );
}
