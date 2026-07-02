"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** 일정 주기로 서버 데이터를 다시 불러옴(router.refresh). 화면 상태·스크롤 유지. */
export default function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  const [on, setOn] = useState(true);
  const [tick, setTick] = useState(0); // 마지막 갱신 표시용
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!on) return;
    timer.current = setInterval(() => {
      // 탭이 안 보일 땐 굳이 갱신 안 함(리소스 절약)
      if (typeof document !== "undefined" && document.hidden) return;
      router.refresh();
      setTick((t) => t + 1);
    }, seconds * 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [on, seconds, router]);

  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      title={on ? "자동 새로고침 끄기" : "자동 새로고침 켜기"}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
        on
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-stone-100 text-stone-500 border-stone-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          on ? "bg-emerald-500 animate-pulse" : "bg-stone-400"
        }`}
      />
      {on ? `실시간 갱신 (${seconds}초)` : "갱신 꺼짐"}
      {on && tick > 0 && <span className="text-emerald-500/70">·방금</span>}
    </button>
  );
}
