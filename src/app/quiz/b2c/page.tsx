"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { QuizRunner, type QuizTheme } from "@/components/QuizRunner";
import { getBeenType } from "@/lib/quiz_b2c";
import questionsData from "../../../../data/questions_b2c.json";
import blendsData from "../../../../data/blends_b2c.json";
import type { QuizQuestion, QuizOption, Blend, BeenType } from "@/types";

const questions = questionsData as QuizQuestion[];
const blends = blendsData as Blend[];

const theme: QuizTheme = {
  primary: "#1D9E75",
  primaryDark: "#16805F",
  selectedBg: "#E1F5EE",
  selectedText: "#085041",
  sectionText: "#085041",
};

export default function B2cQuizPage() {
  const [result, setResult] = useState<BeenType | null>(null);
  const [savedSelected, setSavedSelected] = useState<QuizOption[]>([]);
  const [quizResultId, setQuizResultId] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);

  function handleComplete(selected: QuizOption[]) {
    const tags = selected.map((o) => o.tags ?? []);
    const type = getBeenType(tags);
    setResult(type);
    setSavedSelected(selected);
  }

  // 결과 화면 진입 시 백그라운드로 Supabase에 저장 (실패해도 UX 막지 않음)
  useEffect(() => {
    if (!result) return;
    const blend = blends.find((b) => b.type === result);
    const answers = Object.fromEntries(
      savedSelected.map((o, i) => [`q${i + 1}`, o.label])
    );
    fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pathType: "b2c",
        answers,
        resultType: result,
        blendName: blend?.name,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.quizResultId && setQuizResultId(d.quizResultId))
      .catch((e) => console.warn("[quiz save]", e));
  }, [result, savedSelected]);

  function handleRetry() {
    setResult(null);
    setQuizResultId(null);
    setResetKey((k) => k + 1);
  }

  if (result) {
    const blend = blends.find((b) => b.type === result)!;
    return <ResultView blend={blend} quizResultId={quizResultId} onRetry={handleRetry} />;
  }

  return (
    <QuizRunner
      key={resetKey}
      questions={questions}
      theme={theme}
      finishLabel="내 원두 보기"
      onComplete={handleComplete}
    />
  );
}

function ResultView({
  blend,
  quizResultId,
  onRetry,
}: {
  blend: Blend;
  quizResultId: string | null;
  onRetry: () => void;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 to-white py-10 px-5">
      <div className="max-w-md mx-auto">
        {/* 배지 */}
        <div className="text-center mb-6">
          <span
            className="inline-block px-4 py-1 rounded-full text-sm font-bold tracking-wider"
            style={{
              backgroundColor: blend.badgeColor,
              color: blend.badgeTextColor,
            }}
          >
            {blend.badgeText}
          </span>
        </div>

        <h1 className="text-3xl font-bold text-zinc-900 text-center mb-2">
          {blend.name}
        </h1>
        <p className="text-center text-zinc-600 mb-8">{blend.tagline}</p>

        {/* 원산지 비율 */}
        <Section title="원산지 비율">
          <div className="flex h-3 rounded-full overflow-hidden mb-4">
            {blend.ratio.map((r, i) => (
              <div
                key={i}
                style={{
                  width: `${r.percent}%`,
                  backgroundColor: r.color,
                }}
                title={`${r.origin} ${r.percent}%`}
              />
            ))}
          </div>
          <ul className="space-y-2">
            {blend.ratio.map((r, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{ backgroundColor: r.color }}
                  />
                  <span className="text-zinc-700">{r.origin}</span>
                </div>
                <span className="font-semibold text-zinc-900">
                  {r.percent}%
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {/* 로스팅 */}
        <Section title="로스팅">
          <p className="text-zinc-900 font-medium">{blend.roast}</p>
        </Section>

        {/* 플레이버 */}
        <Section title="플레이버 노트" className="mb-8">
          <div className="flex flex-wrap gap-2">
            {blend.flavors.map((f, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full text-sm"
              >
                {f}
              </span>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <div className="space-y-3">
          <Link
            href={`/order?type=${blend.type}&path=b2c${quizResultId ? `&qid=${quizResultId}` : ""}`}
            className="block w-full py-4 text-white text-center rounded-2xl font-medium shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: "#1D9E75" }}
          >
            이 블렌드 구독하기
          </Link>
          <button
            onClick={onRetry}
            className="block w-full py-4 bg-white border border-zinc-200 text-zinc-700 rounded-2xl font-medium hover:bg-zinc-50 transition"
          >
            다시 테스트하기
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
