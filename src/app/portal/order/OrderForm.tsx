"use client";

import { useState } from "react";
import { createOrder } from "./actions";
import { won } from "@/lib/format";

export type OrderItem = {
  id: string;
  name: string;
  unit: string;
  category: string;
  price: number;
};

export default function OrderForm({ items }: { items: OrderItem[] }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const total = items.reduce((s, it) => s + (qty[it.id] || 0) * it.price, 0);
  const count = items.reduce((s, it) => s + (qty[it.id] || 0), 0);

  function setItemQty(id: string, v: number) {
    setQty((prev) => ({ ...prev, [id]: Math.max(0, Math.floor(v) || 0) }));
  }

  async function submit() {
    setErr(null);
    const chosen = items
      .filter((it) => (qty[it.id] || 0) > 0)
      .map((it) => ({ id: it.id, qty: qty[it.id] }));
    if (chosen.length === 0) {
      setErr("수량을 1개 이상 입력하세요.");
      return;
    }
    setSubmitting(true);
    const res = await createOrder({ items: chosen, note });
    setSubmitting(false);
    if (res.ok) {
      setDone(res.orderNo ?? "");
      setQty({});
      setNote("");
    } else {
      setErr(res.error ?? "주문에 실패했습니다.");
    }
  }

  if (done) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-stone-800">주문이 접수됐어요</h2>
        <p className="text-stone-500 mt-2">주문번호 {done}</p>
        <p className="text-sm text-stone-400 mt-1">
          확인 후 연락드릴게요. 주문내역에서 진행 상태를 볼 수 있어요.
        </p>
        <button
          onClick={() => setDone(null)}
          className="mt-6 rounded-xl bg-amber-700 text-white font-semibold px-6 py-3 hover:bg-amber-800"
        >
          새 주문하기
        </button>
      </div>
    );
  }

  const groups: { key: string; label: string }[] = [
    { key: "blend", label: "시그니처 블렌드" },
    { key: "single", label: "싱글 오리진" },
    { key: "etc", label: "기타" },
  ];

  return (
    <div className="pb-28">
      <h1 className="text-lg font-bold text-stone-800 mb-1">원두 주문</h1>
      <p className="text-sm text-stone-500 mb-4">
        수량(kg)을 입력하고 주문하기를 눌러주세요. 가격은 거래처 단가가 적용됩니다.
      </p>

      {groups.map((g) => {
        const list = items.filter((it) => it.category === g.key);
        if (list.length === 0) return null;
        return (
          <div key={g.key} className="mb-5">
            <h2 className="text-xs font-bold text-amber-700 tracking-wide mb-2">
              {g.label}
            </h2>
            <div className="space-y-2">
              {list.map((it) => {
                const q = qty[it.id] || 0;
                return (
                  <div
                    key={it.id}
                    className="bg-white rounded-xl border border-stone-200 p-3 flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-stone-800">
                        {it.name}
                      </div>
                      <div className="text-sm text-stone-500">
                        {won(it.price)} / {it.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setItemQty(it.id, q - 1)}
                        className="w-9 h-9 rounded-lg border border-stone-300 text-stone-600 text-lg leading-none"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={q || ""}
                        onChange={(e) => setItemQty(it.id, Number(e.target.value))}
                        placeholder="0"
                        className="w-12 h-9 text-center rounded-lg border border-stone-300 text-stone-800 outline-none focus:border-amber-600"
                      />
                      <button
                        type="button"
                        onClick={() => setItemQty(it.id, q + 1)}
                        className="w-9 h-9 rounded-lg border border-stone-300 text-stone-600 text-lg leading-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="mt-4">
        <label className="block text-sm font-medium text-stone-600 mb-1.5">
          요청사항 (선택)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="배송일·분쇄 등 요청사항을 적어주세요"
          className="w-full rounded-xl border border-stone-300 px-4 py-3 text-stone-800 outline-none focus:border-amber-600 resize-none"
        />
      </div>

      {err && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">
          {err}
        </p>
      )}

      {/* 하단 고정 합계 + 주문 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-stone-400">합계 ({count}kg)</div>
            <div className="text-lg font-bold text-stone-800">{won(total)}</div>
          </div>
          <button
            onClick={submit}
            disabled={submitting || total <= 0}
            className="rounded-xl bg-amber-700 text-white font-semibold px-7 py-3 hover:bg-amber-800 disabled:opacity-40"
          >
            {submitting ? "접수 중…" : "주문하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
