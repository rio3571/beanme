"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { won } from "@/lib/format";
import {
  addCustomProduct,
  updateCustomProductPrice,
  removeCustomProduct,
} from "../../actions";

export type CustomProduct = { id: string; name: string; price: number };

export default function CustomProductForm({
  accountId,
  items,
}: {
  accountId: string;
  items: CustomProduct[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [edit, setEdit] = useState<Record<string, string>>({});

  const refresh = () => start(() => router.refresh());

  function add() {
    const n = name.trim();
    if (!n) return;
    setName("");
    setPrice("");
    addCustomProduct(accountId, n, Math.round(Number(price) || 0)).then(refresh);
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
      <div className="font-semibold text-stone-800 mb-1">☕ 전용 판매품목</div>
      <p className="text-xs text-stone-500 mb-3">
        이 거래처만 주문할 수 있는 전용 블렌드예요. 이름·가격을 직접 정합니다.
      </p>

      {items.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {items.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 bg-stone-50 rounded-lg border border-stone-200 px-3 py-2"
            >
              <span className="flex-1 text-sm font-medium text-stone-800 truncate">
                {p.name}
              </span>
              <input
                type="number"
                defaultValue={p.price}
                onChange={(e) =>
                  setEdit((v) => ({ ...v, [p.id]: e.target.value }))
                }
                className="w-24 h-8 text-right rounded-md border border-stone-300 px-2 text-sm outline-none focus:border-amber-600"
              />
              <span className="text-xs text-stone-400">원</span>
              <button
                onClick={() =>
                  updateCustomProductPrice(
                    p.id,
                    accountId,
                    Math.round(Number(edit[p.id] ?? p.price) || 0)
                  ).then(refresh)
                }
                className="text-xs font-semibold text-amber-700 border border-amber-200 rounded-md px-2 py-1 hover:bg-amber-50"
              >
                저장
              </button>
              <button
                onClick={() => removeCustomProduct(p.id, accountId).then(refresh)}
                className="text-stone-400 hover:text-rose-600 text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="전용 블렌드명 (예: OO카페 전용)"
          className="flex-1 h-9 rounded-lg border border-stone-300 px-2.5 text-sm outline-none focus:border-amber-600"
        />
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="가격"
          className="w-24 h-9 text-right rounded-lg border border-stone-300 px-2 text-sm outline-none focus:border-amber-600"
        />
        <span className="text-xs text-stone-400 pb-2">원</span>
        <button
          onClick={add}
          className="h-9 rounded-lg bg-amber-700 text-white text-sm font-semibold px-4 hover:bg-amber-800"
        >
          추가
        </button>
      </div>
      {items.length > 0 && (
        <div className="text-[11px] text-stone-400 mt-2">
          현재:{" "}
          {items.map((p) => `${p.name} ${won(p.price)}`).join(" · ")}
        </div>
      )}
    </div>
  );
}
