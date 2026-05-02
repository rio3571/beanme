"use client";

import { useState, useEffect, useRef } from "react";
import { QuizRunner, type QuizTheme } from "@/components/QuizRunner";
import questionsData from "../../../../data/questions_office.json";
import blendsData from "../../../../data/blends_b2c.json";
import type { QuizQuestion, QuizOption, Blend } from "@/types";

const questions = questionsData as QuizQuestion[];
const blends = blendsData as Blend[];

const theme: QuizTheme = {
  primary: "#BA7517",
  primaryDark: "#92590E",
  selectedBg: "#FBEFD8",
  selectedText: "#5C3A0E",
  sectionText: "#5C3A0E",
};

interface OfficeResult {
  spaceLabel: string;
  machineLabel: string;
  recommendBlend: Blend;
  recommendGrind: string;
  monthlyAmount: string;     // 권장 월 공급량
  deliveryCycle: string;
  discount: string;          // 정기할인
}

function analyzeOffice(answers: QuizOption[]): OfficeResult {
  const vals = answers.map((a) => a.val ?? "");
  const labels = answers.map((a) => a.label ?? "");
  const [, sizeVal, machineVal, grindVal, taste, , delivery] = vals;

  // 추천 블렌드
  let blendType: Blend["type"] = "BALANCE";
  if (taste === "dark") blendType = "DEEP";
  else if (taste === "mild") blendType = "BALANCE";
  const recommendBlend = blends.find((b) => b.type === blendType)!;

  // 분쇄도
  const grindMap: Record<string, string> = {
    whole: "홀빈 (원두 그대로)",
    espresso: "에스프레소 분쇄",
    drip: "드립 분쇄",
    unsure: machineVal === "drip" ? "드립 분쇄" : "에스프레소 분쇄",
  };
  const recommendGrind = grindMap[grindVal] ?? "홀빈";

  // 월 공급량
  const monthlyAmount =
    sizeVal === "xl"
      ? "월 30~50kg"
      : sizeVal === "l"
        ? "월 10~20kg"
        : sizeVal === "m"
          ? "월 3~8kg"
          : "월 1~2kg";

  // 배송 주기
  const deliveryMap: Record<string, string> = {
    monthly: "월 1회",
    biweekly: "격주",
    ondemand: "필요 시",
    consult: "담당자 협의",
  };
  const deliveryCycle = deliveryMap[delivery] ?? "월 1회";

  return {
    spaceLabel: labels[0] || "사무실",
    machineLabel: labels[2] || "전자동",
    recommendBlend,
    recommendGrind,
    monthlyAmount,
    deliveryCycle,
    discount: "정기 5% 할인",
  };
}

export default function OfficeQuizPage() {
  const [result, setResult] = useState<OfficeResult | null>(null);
  const lastSelectedRef = useRef<QuizOption[]>([]);
  const [resetKey, setResetKey] = useState(0);

  function handleComplete(selected: QuizOption[]) {
    lastSelectedRef.current = selected;
    setResult(analyzeOffice(selected));
  }

  // 결과 진입 시 백그라운드 저장
  useEffect(() => {
    if (!result) return;
    const selected = lastSelectedRef.current;
    const answers = Object.fromEntries(
      selected.map((o, i) => [`q${i + 1}`, o.val ?? o.label])
    );
    fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pathType: "office",
        answers,
        resultType: result.recommendBlend.type,
        blendName: result.recommendBlend.name,
      }),
    }).catch((e) => console.warn("[quiz save]", e));
  }, [result]);

  function handleRetry() {
    setResult(null);
    setResetKey((k) => k + 1);
  }

  if (result) return <OfficeResultView result={result} onRetry={handleRetry} />;
  return (
    <QuizRunner
      key={resetKey}
      questions={questions}
      theme={theme}
      finishLabel="맞춤 플랜 보기"
      onComplete={handleComplete}
    />
  );
}

function OfficeResultView({
  result,
  onRetry,
}: {
  result: OfficeResult;
  onRetry: () => void;
}) {
  const { recommendBlend: blend } = result;
  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-10 px-5">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <span
            className="inline-block px-4 py-1 rounded-full text-sm font-bold tracking-wider"
            style={{ backgroundColor: "#FBEFD8", color: "#5C3A0E" }}
          >
            B2B OFFICE 플랜
          </span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 text-center mb-2">
          맞춤 공급 플랜
        </h1>
        <p className="text-center text-zinc-600 mb-8">
          {result.spaceLabel} · {result.machineLabel}
        </p>

        {/* 추천 블렌드 */}
        <Section title="추천 블렌드">
          <p className="text-lg font-bold text-zinc-900 mb-1">{blend.name}</p>
          <p className="text-sm text-zinc-600 mb-4">{blend.tagline}</p>
          <div className="flex h-3 rounded-full overflow-hidden mb-3">
            {blend.ratio.map((r, i) => (
              <div
                key={i}
                style={{ width: `${r.percent}%`, backgroundColor: r.color }}
              />
            ))}
          </div>
          <ul className="space-y-1.5">
            {blend.ratio.map((r, i) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-zinc-700">{r.origin}</span>
                <span className="font-semibold text-zinc-900">{r.percent}%</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* 공급 플랜 표 */}
        <Section title="공급 플랜" className="mb-8">
          <ul className="divide-y divide-zinc-100">
            <PlanRow k="권장 공급량" v={result.monthlyAmount} />
            <PlanRow k="배송 주기" v={result.deliveryCycle} />
            <PlanRow k="정기 할인" v={result.discount} />
            <PlanRow k="분쇄도 세팅" v={`${result.recommendGrind} (무료)`} />
          </ul>
        </Section>

        {/* CTA */}
        <div className="space-y-3">
          <a
            href={`/order?type=${blend.type}&path=office`}
            className="block w-full py-4 text-white text-center rounded-2xl font-medium shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: "#BA7517" }}
          >
            공급 견적 받기
          </a>
          <button
            onClick={onRetry}
            className="block w-full py-4 bg-white border border-zinc-200 text-zinc-700 rounded-2xl font-medium hover:bg-zinc-50 transition"
          >
            다시 진단하기
          </button>
        </div>
      </div>
    </main>
  );
}

function PlanRow({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex justify-between py-3 text-sm">
      <span className="text-zinc-500">{k}</span>
      <span className="text-zinc-900 font-medium">{v}</span>
    </li>
  );
}

function Section({
  title,
  children,
  className = "mb-4",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white rounded-2xl p-6 shadow-sm border border-zinc-100 ${className}`}
    >
      <h3 className="text-sm font-semibold text-zinc-500 mb-3 tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}
