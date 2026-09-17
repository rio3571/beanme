"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAccountHiddenProducts } from "../../actions";

export default function VisibilityForm({
  accountId,
  products,
  initialHidden,
  hasCustom,
}: {
  accountId: string;
  /** 공용 품목 (산·바다·노을·디카페인 등) */
  products: { id: string; name: string }[];
  initialHidden: string[];
  /** 이 거래처 전용 블렌드가 있는지 */
  hasCustom: boolean;
}) {
  const router = useRouter();
  const [hidden, setHidden] = useState<string[]>(initialHidden);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  const shown = products.filter((p) => !hidden.includes(p.id)).length;

  function toggle(id: string) {
    setMsg(null);
    setHidden((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await setAccountHiddenProducts(accountId, hidden);
      if (!res.ok) {
        setOk(false);
        setMsg(res.error ?? "저장 실패");
        return;
      }
      setOk(true);
      setMsg("저장됐어요");
      router.refresh();
    });
  }

  if (products.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
      <div className="font-semibold text-stone-800 mb-1">주문화면에 보일 품목</div>
      <p className="text-sm text-stone-500 mb-3">
        체크된 품목만 이 거래처 주문화면에 나옵니다.
        {hasCustom ? (
          <>
            {" "}
            이 거래처는 <b>전용 블렌드</b>가 있어서, 공용 품목(산·바다·노을 등)을 빼도
            전용 블렌드로 주문할 수 있습니다.
          </>
        ) : (
          <>
            {" "}
            아직 전용 블렌드가 없습니다. 아래에서 전용 품목을 먼저 추가하시면 공용 품목을
            전부 빼도 됩니다.
          </>
        )}
      </p>

      <div className="space-y-1.5">
        {products.map((p) => {
          const on = !hidden.includes(p.id);
          return (
            <label
              key={p.id}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer select-none ${
                on
                  ? "border-stone-200 bg-white"
                  : "border-stone-200 bg-stone-50 text-stone-400"
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => toggle(p.id)}
                className="h-4 w-4 accent-amber-700"
              />
              <span className={`text-sm font-medium ${on ? "text-stone-800" : ""}`}>
                {p.name}
              </span>
              {!on && (
                <span className="ml-auto text-xs font-semibold text-stone-400">
                  숨김
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-stone-400">
          공용 품목 {shown}개 표시 · {products.length - shown}개 숨김
        </span>
        {msg && (
          <span
            className={`text-xs font-semibold ${
              ok ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {msg}
          </span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="ml-auto rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>

      <p className="mt-2 text-xs text-stone-400">
        숨겨도 지난 주문 기록과 거래명세서는 그대로 남습니다. 표시만 바뀝니다.
      </p>
    </div>
  );
}
