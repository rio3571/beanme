"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAccountUnits } from "../../actions";

export default function UnitsForm({
  accountId,
  units,
}: {
  accountId: string;
  units: string[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [text, setText] = useState(units.join(", "));
  const [saved, setSaved] = useState(false);

  function save() {
    setSaved(false);
    start(async () => {
      const r = await setAccountUnits(accountId, text);
      if (r.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2000);
      }
    });
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
      <div className="font-semibold text-stone-800 mb-1">🏢 층/부서 (공용 주문)</div>
      <p className="text-xs text-stone-500 mb-3">
        여러 층·부서가 <b>한 아이디로 각자 주문</b>하고 <b>결제는 한 번</b>인 거래처용.
        입력하면 주문 화면에 <b>층 선택</b>이 뜨고, 명세서에 층별로 표시돼요. (쉼표로 구분, 비우면 미사용)
      </p>
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="예: 23층, 24층, 25층, 26층"
          className="flex-1 h-9 rounded-lg border border-stone-300 px-2.5 text-sm outline-none focus:border-amber-600"
        />
        <button
          onClick={save}
          className="h-9 rounded-lg bg-amber-700 text-white text-sm font-semibold px-4 hover:bg-amber-800"
        >
          저장
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">저장됨 ✅</span>}
      </div>
    </div>
  );
}
