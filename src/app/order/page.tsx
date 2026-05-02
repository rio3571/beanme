"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import blendsData from "../../../data/blends_b2c.json";
import pathsData from "../../../data/paths.json";
import type {
  Blend,
  BeenType,
  PathType,
  PathCard,
} from "@/types";
import type {
  OrderFrequency,
  GrindType,
} from "@/types/order";

const blends = blendsData as Blend[];
const paths = pathsData as PathCard[];

type SubAmount = "200g" | "500g" | "1kg";
type BulkAmount = "5kg" | "8kg" | "10kg" | "custom";
type Mode = "subscription" | "bulk";

const FREQUENCIES: { value: OrderFrequency; label: string }[] = [
  { value: "monthly", label: "월 1회" },
  { value: "biweekly", label: "격주" },
  { value: "weekly", label: "매주" },
];
const SUB_AMOUNTS: SubAmount[] = ["200g", "500g", "1kg"];
const BULK_AMOUNTS: BulkAmount[] = ["5kg", "8kg", "10kg", "custom"];
const GRIND_TYPES: { value: GrindType; label: string }[] = [
  { value: "whole", label: "홀빈" },
  { value: "espresso", label: "에스프레소" },
  { value: "drip", label: "드립" },
];

// 단가 (수정 빈번 가능 — 추후 JSON 또는 DB로 분리 예정)
const SUB_PRICE_PER_100G = 4500;
const BULK_PRICE_PER_KG = 35000;

function parseGrams(amount: SubAmount | BulkAmount, custom: number): number {
  if (amount === "custom") return custom * 1000;
  if (amount.endsWith("kg")) return parseInt(amount) * 1000;
  return parseInt(amount); // "200g" 등
}
function formatWon(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function OrderBody() {
  const params = useSearchParams();
  const typeParam = (params.get("type") || "BALANCE") as BeenType;
  const pathParam = (params.get("path") || "b2c") as PathType;

  const blend = blends.find((b) => b.type === typeParam) ?? blends[1];
  const pathInfo = paths.find((p) => p.path === pathParam) ?? paths[0];
  const isB2B = pathParam !== "b2c";

  // 모드 default — B2B는 정량, B2C는 구독
  const [mode, setMode] = useState<Mode>(isB2B ? "bulk" : "subscription");

  // 구독 상태
  const [frequency, setFrequency] = useState<OrderFrequency>("monthly");
  const [subAmount, setSubAmount] = useState<SubAmount>("500g");

  // 정량 상태
  const [bulkAmount, setBulkAmount] = useState<BulkAmount>("5kg");
  const [customKg, setCustomKg] = useState("");

  // 분쇄도
  const [grind, setGrind] = useState<GrindType>("whole");

  const summary = useMemo(() => {
    if (mode === "subscription") {
      const grams = parseGrams(subAmount, 0);
      const price = (grams / 100) * SUB_PRICE_PER_100G;
      const freqLabel = FREQUENCIES.find((f) => f.value === frequency)?.label ?? "";
      return {
        title: "정기구독",
        lines: [
          { k: "블렌드", v: blend.name },
          { k: "주기", v: freqLabel },
          { k: "회당 수량", v: subAmount },
          { k: "분쇄도", v: GRIND_TYPES.find((g) => g.value === grind)!.label },
        ],
        price,
        priceLabel: `${freqLabel} 결제`,
      };
    }
    const customNum = parseInt(customKg) || 0;
    const grams = parseGrams(bulkAmount, customNum);
    const price = (grams / 1000) * BULK_PRICE_PER_KG;
    const amountLabel =
      bulkAmount === "custom" ? `${customNum}kg` : bulkAmount;
    return {
      title: "정량구매 (B2B)",
      lines: [
        { k: "블렌드", v: blend.name },
        { k: "수량", v: amountLabel },
        { k: "분쇄도", v: GRIND_TYPES.find((g) => g.value === grind)!.label },
      ],
      price,
      priceLabel: "1회 결제",
    };
  }, [mode, blend.name, frequency, subAmount, bulkAmount, customKg, grind]);

  return (
    <main className="min-h-screen bg-zinc-50">
      <div className="max-w-md lg:max-w-4xl mx-auto px-5 py-8">
        {/* 헤더 */}
        <div className="mb-6">
          <Link
            href={`/quiz/${pathParam}`}
            className="text-sm text-zinc-500 hover:text-zinc-800"
          >
            ← 결과로 돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-zinc-900 mt-3 mb-1">
            구매 옵션
          </h1>
          <p className="text-sm text-zinc-600 flex items-center gap-2">
            <span
              className="inline-block px-2 py-0.5 rounded text-xs font-bold"
              style={{
                backgroundColor: blend.badgeColor,
                color: blend.badgeTextColor,
              }}
            >
              {blend.badgeText}
            </span>
            {blend.name} · {pathInfo.badge}
          </p>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6">
          <div className="space-y-4">
            {/* 모드 토글 */}
            <div className="grid grid-cols-2 bg-white rounded-2xl p-1 border border-zinc-200">
              <ModeButton
                active={mode === "subscription"}
                onClick={() => setMode("subscription")}
                color={pathInfo.primaryColor}
              >
                정기구독
              </ModeButton>
              <ModeButton
                active={mode === "bulk"}
                onClick={() => setMode("bulk")}
                color={pathInfo.primaryColor}
              >
                정량구매
              </ModeButton>
            </div>

            {mode === "subscription" ? (
              <>
                <Section title="배송 주기">
                  <div className="grid grid-cols-3 gap-2">
                    {FREQUENCIES.map((f) => (
                      <Chip
                        key={f.value}
                        active={frequency === f.value}
                        onClick={() => setFrequency(f.value)}
                        color={pathInfo.primaryColor}
                      >
                        {f.label}
                      </Chip>
                    ))}
                  </div>
                </Section>
                <Section title="회당 수량">
                  <div className="grid grid-cols-3 gap-2">
                    {SUB_AMOUNTS.map((a) => (
                      <Chip
                        key={a}
                        active={subAmount === a}
                        onClick={() => setSubAmount(a)}
                        color={pathInfo.primaryColor}
                      >
                        {a}
                      </Chip>
                    ))}
                  </div>
                </Section>
              </>
            ) : (
              <Section title="구매 수량">
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {BULK_AMOUNTS.map((a) => (
                    <Chip
                      key={a}
                      active={bulkAmount === a}
                      onClick={() => setBulkAmount(a)}
                      color={pathInfo.primaryColor}
                    >
                      {a === "custom" ? "직접입력" : a}
                    </Chip>
                  ))}
                </div>
                {bulkAmount === "custom" && (
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="kg 입력 (예: 15)"
                    value={customKg}
                    onChange={(e) =>
                      setCustomKg(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-zinc-900 focus:outline-none"
                    style={{ borderColor: customKg ? pathInfo.primaryColor : undefined }}
                  />
                )}
              </Section>
            )}

            <Section title="분쇄도">
              <div className="grid grid-cols-3 gap-2">
                {GRIND_TYPES.map((g) => (
                  <Chip
                    key={g.value}
                    active={grind === g.value}
                    onClick={() => setGrind(g.value)}
                    color={pathInfo.primaryColor}
                  >
                    {g.label}
                  </Chip>
                ))}
              </div>
            </Section>
          </div>

          {/* 우: 주문 요약 */}
          <aside className="mt-6 lg:mt-0">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-zinc-100 lg:sticky lg:top-6">
              <h3 className="text-sm font-semibold text-zinc-500 mb-4 tracking-wide">
                주문 요약
              </h3>
              <div className="mb-4">
                <p
                  className="text-sm font-medium mb-2"
                  style={{ color: pathInfo.primaryColor }}
                >
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
                  결제 모듈은 추후 연결 예정
                </p>
              </div>
              <button
                onClick={() => alert("상담 신청은 다음 단계에서 연결 예정")}
                className="w-full py-4 text-white rounded-2xl font-medium transition shadow-sm hover:opacity-90"
                style={{ backgroundColor: pathInfo.primaryColor }}
              >
                {isB2B ? "상담 신청하기" : "구독 시작하기"}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function ModeButton({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="py-3 rounded-xl text-sm font-medium transition"
      style={
        active
          ? { backgroundColor: color, color: "#FFFFFF", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }
          : { backgroundColor: "transparent", color: "#71717A" }
      }
    >
      {children}
    </button>
  );
}

function Chip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="py-3 rounded-xl text-sm font-medium border-2 transition"
      style={
        active
          ? {
              borderColor: color,
              backgroundColor: color + "15", // 약 8% opacity
              color: color,
            }
          : { borderColor: "#E4E4E7", backgroundColor: "#FFFFFF", color: "#3F3F46" }
      }
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-zinc-100">
      <h3 className="text-sm font-semibold text-zinc-500 mb-3 tracking-wide">
        {title}
      </h3>
      {children}
    </div>
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
