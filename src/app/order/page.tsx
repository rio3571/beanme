"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import blendsData from "../../../data/blends.json";
import type {
  Blend,
  BeenType,
  SubscriptionInterval,
  SubscriptionAmount,
  GrindType,
} from "@/types";

const blends = blendsData as Blend[];

type Mode = "subscription" | "bulk";

const INTERVALS: { value: SubscriptionInterval; label: string }[] = [
  { value: "monthly", label: "월 1회" },
  { value: "biweekly", label: "격주" },
  { value: "weekly", label: "매주" },
];
const SUB_AMOUNTS: SubscriptionAmount[] = [200, 500, 1000];
const BULK_AMOUNTS = [5000, 8000, 10000] as const;
const GRIND_TYPES: { value: GrindType; label: string }[] = [
  { value: "wholebean", label: "홀빈" },
  { value: "espresso", label: "에스프레소" },
  { value: "drip", label: "핸드드립" },
];

// 단가 (간단 추정; 실제는 백엔드/관리자 설정)
const SUB_PRICE_PER_100G = 4500; // 원
const BULK_PRICE_PER_KG = 35000;

function formatWon(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function OrderBody() {
  const params = useSearchParams();
  const typeParam = (params.get("type") || "BALANCE") as BeenType;
  const blend = blends.find((b) => b.type === typeParam) ?? blends[1];

  const [mode, setMode] = useState<Mode>("subscription");

  // 구독 상태
  const [interval, setInterval] = useState<SubscriptionInterval>("monthly");
  const [subAmount, setSubAmount] = useState<SubscriptionAmount>(500);

  // 정량 상태
  const [bulkAmount, setBulkAmount] = useState<number>(5000);
  const [bulkCustom, setBulkCustom] = useState<string>("");
  const [grind, setGrind] = useState<GrindType>("wholebean");

  // 가격 계산
  const summary = useMemo(() => {
    if (mode === "subscription") {
      const price = (subAmount / 100) * SUB_PRICE_PER_100G;
      const intervalLabel = INTERVALS.find((x) => x.value === interval)?.label ?? "";
      return {
        title: "정기구독",
        lines: [
          { k: "블렌드", v: blend.name },
          { k: "주기", v: intervalLabel },
          { k: "수량", v: `${subAmount}g / 회` },
        ],
        price,
        priceLabel: `${intervalLabel} 결제`,
      };
    }
    const useBulk = bulkAmount;
    const price = (useBulk / 1000) * BULK_PRICE_PER_KG;
    const grindLabel = GRIND_TYPES.find((x) => x.value === grind)?.label ?? "";
    return {
      title: "정량구매 (B2B)",
      lines: [
        { k: "블렌드", v: blend.name },
        { k: "수량", v: `${(useBulk / 1000).toFixed(useBulk % 1000 === 0 ? 0 : 1)}kg` },
        { k: "분쇄도", v: grindLabel },
      ],
      price,
      priceLabel: "1회 결제",
    };
  }, [mode, blend, interval, subAmount, bulkAmount, grind]);

  function handleBulkCustom(v: string) {
    setBulkCustom(v);
    const num = parseInt(v.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(num) && num > 0) setBulkAmount(num * 1000); // kg → g
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="max-w-md lg:max-w-4xl mx-auto px-5 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <Link
            href="/quiz"
            className="text-sm text-zinc-500 hover:text-zinc-800"
          >
            ← 결과로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 mt-3 mb-1">
            구매 옵션
          </h1>
          <p className="text-sm text-zinc-600">
            <span
              className="inline-block px-2 py-0.5 rounded text-xs font-bold mr-2"
              style={{
                backgroundColor: blend.badgeColor,
                color: blend.badgTextColor,
              }}
            >
              {blend.badgeText}
            </span>
            {blend.name}
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">
          {/* === 좌: 옵션 선택 === */}
          <div className="space-y-4">
            {/* 모드 토글 */}
            <div className="grid grid-cols-2 bg-white rounded-2xl p-1 border border-zinc-200">
              <button
                onClick={() => setMode("subscription")}
                className={`py-3 rounded-xl text-sm font-medium transition ${
                  mode === "subscription"
                    ? "bg-emerald-700 text-white shadow"
                    : "text-zinc-600"
                }`}
              >
                정기구독
              </button>
              <button
                onClick={() => setMode("bulk")}
                className={`py-3 rounded-xl text-sm font-medium transition ${
                  mode === "bulk"
                    ? "bg-emerald-700 text-white shadow"
                    : "text-zinc-600"
                }`}
              >
                정량구매 (B2B)
              </button>
            </div>

            {mode === "subscription" ? (
              <>
                {/* 주기 */}
                <Section title="배송 주기">
                  <div className="grid grid-cols-3 gap-2">
                    {INTERVALS.map((it) => (
                      <ChipButton
                        key={it.value}
                        active={interval === it.value}
                        onClick={() => setInterval(it.value)}
                      >
                        {it.label}
                      </ChipButton>
                    ))}
                  </div>
                </Section>
                {/* 수량 */}
                <Section title="회당 수량">
                  <div className="grid grid-cols-3 gap-2">
                    {SUB_AMOUNTS.map((a) => (
                      <ChipButton
                        key={a}
                        active={subAmount === a}
                        onClick={() => setSubAmount(a)}
                      >
                        {a < 1000 ? `${a}g` : `${a / 1000}kg`}
                      </ChipButton>
                    ))}
                  </div>
                </Section>
              </>
            ) : (
              <>
                {/* 정량 수량 */}
                <Section title="구매 수량">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {BULK_AMOUNTS.map((a) => (
                      <ChipButton
                        key={a}
                        active={bulkAmount === a && !bulkCustom}
                        onClick={() => {
                          setBulkAmount(a);
                          setBulkCustom("");
                        }}
                      >
                        {a / 1000}kg
                      </ChipButton>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">
                      커스텀 (kg)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="예: 15"
                      value={bulkCustom}
                      onChange={(e) => handleBulkCustom(e.target.value)}
                      className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </Section>
                {/* 분쇄도 */}
                <Section title="분쇄도">
                  <div className="grid grid-cols-3 gap-2">
                    {GRIND_TYPES.map((g) => (
                      <ChipButton
                        key={g.value}
                        active={grind === g.value}
                        onClick={() => setGrind(g.value)}
                      >
                        {g.label}
                      </ChipButton>
                    ))}
                  </div>
                </Section>
              </>
            )}
          </div>

          {/* === 우: 주문 요약 === */}
          <aside className="mt-6 lg:mt-0">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100 lg:sticky lg:top-6">
              <h3 className="text-sm font-semibold text-zinc-500 mb-4 tracking-wide">
                주문 요약
              </h3>
              <div className="mb-4">
                <p className="text-emerald-700 text-sm font-medium mb-2">
                  {summary.title}
                </p>
                <ul className="space-y-2 text-sm">
                  {summary.lines.map((l, i) => (
                    <li key={i} className="flex justify-between">
                      <span className="text-zinc-500">{l.k}</span>
                      <span className="text-zinc-900 font-medium">{l.v}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-zinc-100 pt-4 mb-5">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-zinc-500 text-sm">{summary.priceLabel}</span>
                  <span className="text-2xl font-bold text-zinc-900">
                    {formatWon(summary.price)}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  결제는 다음 단계에서 진행됩니다 (예정)
                </p>
              </div>
              <button
                className="w-full py-4 bg-emerald-700 text-white rounded-2xl font-medium hover:bg-emerald-800 transition shadow-sm"
                onClick={() => alert("결제 모듈은 다음 Phase에서 연결 예정")}
              >
                {mode === "subscription" ? "구독 시작하기" : "주문하기"}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-zinc-100">
      <h3 className="text-sm font-semibold text-zinc-500 mb-3 tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`py-3 rounded-xl text-sm font-medium border-2 transition ${
        active
          ? "border-emerald-500 bg-emerald-50 text-emerald-900"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          <p className="text-zinc-500">로딩 중...</p>
        </main>
      }
    >
      <OrderBody />
    </Suspense>
  );
}
