"use client";

import { useState } from "react";
import { QuizRunner, type QuizTheme } from "@/components/QuizRunner";
import questionsData from "../../../../data/questions_pro.json";
import blendsData from "../../../../data/blends_b2c.json";
import type { QuizQuestion, QuizOption, Blend } from "@/types";

const questions = questionsData as QuizQuestion[];
const blends = blendsData as Blend[];

const theme: QuizTheme = {
  primary: "#534AB7",
  primaryDark: "#3C3489",
  selectedBg: "#EEEDFE",
  selectedText: "#3C3489",
  sectionText: "#3C3489",
};

interface ProResult {
  positioning: string;       // 포지셔닝 한 줄
  recommendBlend: Blend;
  supplyCycle: string;       // 권장 공급 주기
  marketSummary: string;     // 상권 요약
  reasons: string[];         // 추천 이유 3줄
  answers: QuizOption[];
}

/**
 * 단순 룰 기반 분석. 추후 AI/스코어링 룰로 교체 예정.
 * 데이터 변경 빈번 대응을 위해 한 함수에 격리.
 */
function analyzePro(answers: QuizOption[]): ProResult {
  const vals = answers.map((a) => a.val ?? "");
  const [market, , price, shots, menu, , priority] = vals;

  // 추천 블렌드 룰 (단순)
  let blendType: Blend["type"] = "BALANCE";
  if (menu === "specialty" || price === "specialty" || priority === "unique") {
    blendType = "AROMA";
  } else if (menu === "black" || priority === "consistency") {
    blendType = "DEEP";
  } else if (menu === "milk") {
    blendType = "BALANCE";
  } else if (market === "trendy") {
    blendType = "BRIGHT";
  }
  const recommendBlend = blends.find((b) => b.type === blendType)!;

  // 공급 주기
  const supplyCycle =
    shots === "very_high"
      ? "주 2회 / 매주 5kg+"
      : shots === "high"
        ? "주 1회 / 5~8kg"
        : shots === "mid"
          ? "격주 / 3~5kg"
          : "월 2회 / 2~3kg";

  // 상권 요약
  const marketSummary =
    market === "trendy"
      ? "트렌디 상권 — 스페셜티/싱글오리진 수요"
      : market === "office"
        ? "오피스 — 회전율 중심 운영"
        : market === "local"
          ? "주택가 — 단골 친화 가성비"
          : "관광지 — 테이크아웃 회전 중심";

  // 포지셔닝 한 줄
  const positioning =
    blendType === "AROMA"
      ? "하이엔드 시그니처 카페"
      : blendType === "DEEP"
        ? "묵직한 시그니처 강배전 콘셉트"
        : blendType === "BRIGHT"
          ? "라이트 로스팅 스페셜티 라인"
          : "균형 잡힌 데일리 카페";

  // 추천 이유 3줄
  const reasons = [
    `상권 특성(${marketSummary})에 부합하는 블렌드 선택`,
    `주력 메뉴(${menu})와 맛 균형이 맞도록 구성`,
    `우선순위(${priority})에 맞춘 안정적 공급 주기 제안`,
  ];

  return {
    positioning,
    recommendBlend,
    supplyCycle,
    marketSummary,
    reasons,
    answers,
  };
}

export default function ProQuizPage() {
  const [result, setResult] = useState<ProResult | null>(null);
  const [resetKey, setResetKey] = useState(0);

  function handleComplete(selected: QuizOption[]) {
    setResult(analyzePro(selected));
  }

  function handleRetry() {
    setResult(null);
    setResetKey((k) => k + 1);
  }

  if (result) {
    return <ProResultView result={result} onRetry={handleRetry} />;
  }

  return (
    <QuizRunner
      key={resetKey}
      questions={questions}
      theme={theme}
      finishLabel="추천 원두 보기"
      onComplete={handleComplete}
    />
  );
}

function ProResultView({
  result,
  onRetry,
}: {
  result: ProResult;
  onRetry: () => void;
}) {
  const { recommendBlend: blend } = result;
  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 to-white py-10 px-5">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <span
            className="inline-block px-4 py-1 rounded-full text-sm font-bold tracking-wider"
            style={{ backgroundColor: "#EEEDFE", color: "#3C3489" }}
          >
            B2B PRO 분석
          </span>
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 text-center mb-2">
          {result.positioning}
        </h1>
        <p className="text-center text-zinc-600 mb-8">{result.marketSummary}</p>

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

        {/* 권장 공급 */}
        <Section title="권장 공급 주기">
          <p className="text-zinc-900 font-medium">{result.supplyCycle}</p>
        </Section>

        {/* 추천 이유 */}
        <Section title="추천 이유" className="mb-8">
          <ul className="space-y-2">
            {result.reasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-700">
                <span style={{ color: "#534AB7" }}>•</span>
                {r}
              </li>
            ))}
          </ul>
        </Section>

        {/* CTA */}
        <div className="space-y-3">
          <a
            href={`/order?type=${blend.type}&path=pro`}
            className="block w-full py-4 text-white text-center rounded-2xl font-medium shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: "#534AB7" }}
          >
            공급 상담 신청하기
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
